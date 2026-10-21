import { eq } from 'drizzle-orm'
import { describe, expect, test } from 'vitest'

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

const verify = async (email: string) => {
  const link = await orchestrator.waitForLinkSentTo(email)
  await auth.api.verifyEmail({
    query: { token: link.searchParams.get('token')! },
    headers
  })
}

describe('authenticationModel', () => {
  describe('signUp', () => {
    test('creates an unverified teacher and emails a verification link', async () => {
      const { email } = await signUp()

      const [user] = await database
        .select()
        .from(users)
        .where(eq(users.email, email))
      expect(user).toMatchObject({ role: 'teacher', emailVerified: false })

      const link = await orchestrator.waitForLinkSentTo(email)
      expect(link.pathname).toBe('/api/auth/verify-email')
    })
  })

  describe('signIn', () => {
    test('rejects an unverified email and sends a new link', async () => {
      const { email, password } = await signUp()
      await orchestrator.waitForLinkSentTo(email)

      const attempt = authenticationModel.signIn(
        { email, password },
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
          { email, password: orchestrator.newPassword() },
          { headers }
        )
      ).rejects.toThrow('E-mail ou senha incorretos.')
    })

    test('signs a verified teacher in', async () => {
      const { email, password } = await signUp()
      await verify(email)

      const session = await authenticationModel.signIn(
        { email, password },
        { headers }
      )
      expect(session.user.email).toBe(email)
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
