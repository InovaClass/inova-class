import { eq } from 'drizzle-orm'
import { describe, expect, test } from 'vitest'
import { z } from 'zod'

import { auth } from '@/infra/auth'
import { database } from '@/infra/database/client'
import { users } from '@/infra/database/schema'
import { UnauthorizedError } from '@/infra/errors'
import { authenticationModel } from '@/models/authentication-model/model'
import { orchestrator } from '@/tests/orchestrator'

const headers = new Headers({ host: 'localhost:3000' })

const signUp = async () => {
  const user = orchestrator.newUser()
  await authenticationModel.signUp(
    { ...user, passwordConfirmation: user.password },
    { headers, callbackURL: '/entrar' }
  )
  return user
}

const signUpStudent = async () => {
  const student = orchestrator.newStudent()
  await authenticationModel.signUpStudent(
    { ...student, passwordConfirmation: student.password },
    { headers, callbackURL: '/entrar' }
  )
  return student
}

const verify = async (email: string) => {
  const link = await orchestrator.waitForLinkSentTo(email)
  await auth.api.verifyEmail({
    query: { token: link.searchParams.get('token')! },
    headers
  })
}

const findUser = async (email: string) => {
  const [user] = await database
    .select()
    .from(users)
    .where(eq(users.email, email))
  return user
}

const sessionHeadersOf = async (email: string, password: string) => {
  const response = await auth.api.signInEmail({
    body: { email, password },
    headers,
    returnHeaders: true
  })
  const cookie = response.headers.get('set-cookie')!.split(';', 1)[0]
  return new Headers({ host: 'localhost:3000', cookie })
}

describe('authenticationModel', () => {
  describe('signUp', () => {
    test('creates an unverified teacher and emails a verification link', async () => {
      const { email } = await signUp()

      expect(await findUser(email)).toMatchObject({
        role: 'teacher',
        emailVerified: false,
        username: null
      })

      const link = await orchestrator.waitForLinkSentTo(email)
      expect(link.pathname).toBe('/api/auth/verify-email')
    })
  })

  describe('signUpStudent', () => {
    test('creates an unverified student and emails a verification link', async () => {
      const { email, username } = await signUpStudent()

      expect(await findUser(email)).toMatchObject({
        role: 'student',
        emailVerified: false,
        username
      })

      const link = await orchestrator.waitForLinkSentTo(email)
      expect(link.pathname).toBe('/api/auth/verify-email')
    })

    test('stores the username in lowercase', async () => {
      const student = orchestrator.newStudent()
      await authenticationModel.signUpStudent(
        {
          ...student,
          username: student.username.toUpperCase(),
          passwordConfirmation: student.password
        },
        { headers, callbackURL: '/entrar' }
      )

      expect(await findUser(student.email)).toMatchObject({
        username: student.username
      })
    })

    test('rejects a taken username on its field', async () => {
      const { username } = await signUpStudent()
      const student = { ...orchestrator.newStudent(), username }

      const attempt = authenticationModel.signUpStudent(
        { ...student, passwordConfirmation: student.password },
        { headers, callbackURL: '/entrar' }
      )
      await expect(attempt).rejects.toThrow(z.ZodError)
      await expect(attempt).rejects.toSatisfy(
        (error: z.ZodError<{ username: string }>) =>
          z.flattenError(error).fieldErrors.username?.[0] ===
          'Este nome de usuário já está em uso.'
      )
      expect(await findUser(student.email)).toBeUndefined()
    })
  })

  describe('signIn', () => {
    test('rejects an unverified email and sends a new link', async () => {
      const { email, password } = await signUp()
      await orchestrator.waitForLinkSentTo(email)

      const attempt = authenticationModel.signIn(
        { identifier: email, password },
        { headers }
      )
      await expect(attempt).rejects.toThrow(UnauthorizedError)
      await expect(attempt).rejects.toThrow(
        'Confirme seu e-mail antes de entrar.'
      )
      await expect
        .poll(async () => {
          const emails = await orchestrator.listEmailsTo(email)
          return emails.length
        })
        .toBe(2)
    })

    test('rejects a wrong password', async () => {
      const { email } = await signUp()
      await verify(email)

      await expect(
        authenticationModel.signIn(
          { identifier: email, password: orchestrator.newPassword() },
          { headers }
        )
      ).rejects.toThrow('E-mail, usuário ou senha incorretos.')
    })

    test('signs a verified teacher in by email', async () => {
      const { email, password } = await signUp()
      await verify(email)

      await expect(
        authenticationModel.signIn({ identifier: email, password }, { headers })
      ).resolves.toEqual({ mustChangePassword: false })
    })

    test('signs a verified student in by username', async () => {
      const { email, username, password } = await signUpStudent()
      await verify(email)

      await expect(
        authenticationModel.signIn(
          { identifier: username, password },
          { headers }
        )
      ).resolves.toEqual({ mustChangePassword: false })
    })

    test('rejects an unverified student signing in by username', async () => {
      const { email, username, password } = await signUpStudent()
      await orchestrator.waitForLinkSentTo(email)

      await expect(
        authenticationModel.signIn(
          { identifier: username, password },
          { headers }
        )
      ).rejects.toThrow('Confirme seu e-mail antes de entrar.')
    })

    test('gives an unknown or impossible username the credentials error', async () => {
      for (const identifier of [orchestrator.newUsername(), 'a', 'ana silva']) {
        await expect(
          authenticationModel.signIn(
            { identifier, password: orchestrator.newPassword() },
            { headers }
          )
        ).rejects.toThrow('E-mail, usuário ou senha incorretos.')
      }
    })

    test('reports a temporary password', async () => {
      const { email, username, password } = await signUpStudent()
      await verify(email)
      await orchestrator.requirePasswordChange(email)

      await expect(
        authenticationModel.signIn(
          { identifier: username, password },
          { headers }
        )
      ).resolves.toEqual({ mustChangePassword: true })
    })
  })

  describe('changePassword', () => {
    test('replaces the password and clears the temporary flag', async () => {
      const { email, username, password } = await signUpStudent()
      await verify(email)
      await orchestrator.requirePasswordChange(email)
      const newPassword = orchestrator.newPassword()

      await authenticationModel.changePassword(
        { password: newPassword, passwordConfirmation: newPassword },
        { headers: await sessionHeadersOf(email, password) }
      )

      expect(await findUser(email)).toMatchObject({ mustChangePassword: false })
      await expect(
        authenticationModel.signIn(
          { identifier: username, password: newPassword },
          { headers }
        )
      ).resolves.toEqual({ mustChangePassword: false })
      await expect(
        authenticationModel.signIn(
          { identifier: username, password },
          { headers }
        )
      ).rejects.toThrow(UnauthorizedError)
    })

    test('requires a session', async () => {
      const password = orchestrator.newPassword()

      await expect(
        authenticationModel.changePassword(
          { password, passwordConfirmation: password },
          { headers }
        )
      ).rejects.toThrow(UnauthorizedError)
    })
  })

  describe('requestPasswordReset', () => {
    test("doesn't reveal whether the email has an account", async () => {
      const email = orchestrator.newEmail()

      await expect(
        authenticationModel.requestPasswordReset(
          { email },
          { headers, redirectTo: '/redefinir-senha' }
        )
      ).resolves.toEqual({ email })
    })
  })
})
