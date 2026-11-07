import { eq } from 'drizzle-orm'
import { describe, expect, test } from 'vitest'
import { z } from 'zod'

import { auth } from '@/infra/auth'
import { database } from '@/infra/database/client'
import { users } from '@/infra/database/schema'
import { TooManyRequestsError, UnauthorizedError } from '@/infra/errors'
import { authenticationModel } from '@/models/authentication/model'
import { orchestrator } from '@/tests/orchestrator'

const headers = new Headers({ host: 'localhost:3000' })

const signUp = async () => {
  const user = orchestrator.newUser()
  await authenticationModel.signUp(
    { ...user, passwordConfirmation: user.password, acceptedTerms: true },
    { headers, callbackURL: '/entrar' }
  )
  return user
}

const signUpStudent = async () => {
  const student = orchestrator.newStudent()
  await authenticationModel.signUpStudent(
    { ...student, passwordConfirmation: student.password, acceptedTerms: true },
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

const resend = (identifier: string) =>
  authenticationModel.resendVerificationEmail(
    { identifier },
    { headers, callbackURL: '/entrar' }
  )

const emailCountOf = async (email: string) => {
  const emails = await orchestrator.listEmailsTo(email)
  return emails.length
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

    test('records when the terms were accepted', async () => {
      const { email } = await signUp()

      const user = await findUser(email)
      expect(user?.termsAcceptedAt).toBeInstanceOf(Date)
    })

    test('rejects a sign-up without accepting the terms', async () => {
      const user = orchestrator.newUser()

      const attempt = authenticationModel.signUp(
        { ...user, passwordConfirmation: user.password, acceptedTerms: false },
        { headers, callbackURL: '/entrar' }
      )
      await expect(attempt).rejects.toThrow(z.ZodError)
      expect(await findUser(user.email)).toBeUndefined()
    })

    test('rejects a request that skips the sign-up flow', async () => {
      const user = orchestrator.newUser()

      await expect(
        auth.api.signUpEmail({ body: user, headers })
      ).rejects.toThrow()
      expect(await findUser(user.email)).toBeUndefined()
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
          passwordConfirmation: student.password,
          acceptedTerms: true
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
        {
          ...student,
          passwordConfirmation: student.password,
          acceptedTerms: true
        },
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
      ).resolves.toBeUndefined()
    })

    test('signs a verified student in by username', async () => {
      const { email, username, password } = await signUpStudent()
      await verify(email)

      await expect(
        authenticationModel.signIn(
          { identifier: username, password },
          { headers }
        )
      ).resolves.toBeUndefined()
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
  })

  describe('resendVerificationEmail', () => {
    test('rejects a resend before the cooldown of the sign-up ends', async () => {
      const { email } = await signUp()

      await expect(resend(email)).rejects.toThrow(TooManyRequestsError)
      await expect(resend(email)).rejects.toThrow(/^Aguarde/)
    })

    test('sends a new link once the cooldown ends, and starts a new one', async () => {
      const { email } = await signUp()
      await orchestrator.waitForLinkSentTo(email)
      await orchestrator.endVerificationResendCooldown(email)

      await expect(resend(email)).resolves.toBeUndefined()
      await expect.poll(() => emailCountOf(email)).toBe(2)
      await expect(resend(email)).rejects.toThrow(TooManyRequestsError)
    })

    test('resends to the email of a username', async () => {
      const { email, username } = await signUpStudent()
      await orchestrator.waitForLinkSentTo(email)
      await orchestrator.endVerificationResendCooldown(username)

      await resend(username.toUpperCase())
      await expect.poll(() => emailCountOf(email)).toBe(2)
    })

    test('starts the cooldown when signing in with an unverified email', async () => {
      const { email, password } = await signUp()
      await orchestrator.endVerificationResendCooldown(email)
      await expect(
        authenticationModel.signIn({ identifier: email, password }, { headers })
      ).rejects.toThrow(UnauthorizedError)

      await expect(resend(email)).rejects.toThrow(TooManyRequestsError)
    })

    test('answers the same for an unknown or verified email, and sends nothing', async () => {
      const unknown = orchestrator.newEmail()
      const { email: verified } = await signUp()
      await verify(verified)
      await orchestrator.endVerificationResendCooldown(verified)

      await expect(resend(unknown)).resolves.toBeUndefined()
      await expect(resend(verified)).resolves.toBeUndefined()
      await expect(resend(unknown)).rejects.toThrow(TooManyRequestsError)
      expect(await emailCountOf(unknown)).toBe(0)
      expect(await emailCountOf(verified)).toBe(1)
    })

    test('sends a pending student a new invite instead of a link', async () => {
      const { name, email, username } = orchestrator.newStudent()
      await database
        .insert(users)
        .values({ name, email, username, role: 'student' })

      await resend(email)
      const link = await orchestrator.waitForLinkSentTo(email, {
        subject: 'Crie sua senha'
      })
      expect(link.pathname).toBe('/convite')
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
