import { drizzleAdapter } from '@better-auth/drizzle-adapter/relations-v2'
import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'
import { oAuthProxy } from 'better-auth/plugins'
import { after } from 'next/server'

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USER_ROLES
} from '@/constants/user'
import { database } from '@/infra/database/client'
import * as schema from '@/infra/database/schema'
import { sendEmail } from '@/infra/email/mailer'
import {
  resetPasswordTemplate,
  verifyEmailTemplate
} from '@/infra/email/templates'

const PRODUCTION_URL = 'https://inovaclass.diasjoaovitor.com.br'

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env

// Without credentials (CI, a fresh clone) the app runs with email and password only (#44)
const google =
  GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
    ? {
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        prompt: 'select_account' as const,
        // Sign-in never creates an account, so the role is always chosen on a sign-up page (#4)
        disableImplicitSignUp: true
      }
    : undefined

export const isGoogleSignInEnabled = Boolean(google)

export const auth = betterAuth({
  database: drizzleAdapter(database, {
    provider: 'pg',
    schema,
    usePlural: true
  }),
  // Each Preview deployment has its own URL (#2); only this project's hosts are accepted, not any
  // *.vercel.app
  baseURL: {
    allowedHosts: [
      'localhost:3000',
      'inovaclass.diasjoaovitor.com.br',
      'inova-class.vercel.app',
      'inova-class-*-diasjoaovitors-projects.vercel.app'
    ],
    protocol: process.env.VERCEL ? 'https' : 'http'
  },
  advanced: {
    database: { generateId: 'uuid' }
  },
  user: {
    additionalFields: {
      role: {
        type: [...USER_ROLES],
        required: true,
        // Roles are fixed per account (#3): public sign-up only creates teachers, students are
        // created server-side (#5)
        defaultValue: 'teacher',
        input: false
      }
    }
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
    revokeSessionsOnPasswordReset: true,
    // Sent after the response so its timing doesn't reveal whether the email has an account:
    // https://www.better-auth.com/docs/concepts/email#email-verification
    sendResetPassword: async ({ user, url }) => {
      after(() => sendEmail({ to: user.email, ...resetPasswordTemplate(url) }))
    }
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      after(() => sendEmail({ to: user.email, ...verifyEmailTemplate(url) }))
    }
  },
  socialProviders: { google },
  plugins: [
    // Google doesn't accept wildcard redirect URIs, so Previews go through the production
    // callback; localhost has its own registered URI and never shares the proxy secret:
    // https://www.better-auth.com/docs/plugins/oauth-proxy
    ...(process.env.VERCEL
      ? [
          oAuthProxy({
            productionURL: PRODUCTION_URL,
            secret: process.env.OAUTH_PROXY_SECRET
          })
        ]
      : []),
    nextCookies()
  ]
})
