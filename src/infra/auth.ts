import { AsyncLocalStorage } from 'node:async_hooks'

import { drizzleAdapter } from '@better-auth/drizzle-adapter/relations-v2'
import { betterAuth } from 'better-auth'
import {
  addOAuthServerContext,
  createAuthMiddleware,
  getOAuthState
} from 'better-auth/api'
import { nextCookies } from 'better-auth/next-js'
import { oAuthProxy, username } from 'better-auth/plugins'
import { after } from 'next/server'

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USER_ROLES,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
  type UserRole
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
        disableImplicitSignUp: true,
        // Keeps only what the sign-up form would collect (#5)
        mapProfileToUser: () => ({ image: undefined })
      }
    : undefined

export const isGoogleSignInEnabled = Boolean(google)

// `role` is `input: false`, so the role of a sign-up comes from the server flow that runs it, never
// from the request (#5)
const signUpRole = new AsyncLocalStorage<UserRole>()

export const withSignUpRole = <T>(role: UserRole, signUp: () => Promise<T>) =>
  signUpRole.run(role, signUp)

const isUserRole = (value: unknown): value is UserRole =>
  USER_ROLES.includes(value as UserRole)

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
        // Roles are fixed per account (#3): a request without a server-set role creates a
        // teacher, students only come from `withSignUpRole` (#5)
        defaultValue: 'teacher',
        input: false
      },
      // Set for accounts created with a temporary password (#10)
      mustChangePassword: {
        type: 'boolean',
        required: true,
        defaultValue: false,
        input: false
      }
    }
  },
  hooks: {
    // Google's callback is a later request, so the role rides the OAuth state, which the client
    // can't change (`addOAuthServerContext`)
    before: createAuthMiddleware(async (context) => {
      const role = signUpRole.getStore()
      if (role && context.path === '/sign-in/social') {
        await addOAuthServerContext({ role })
      }
    })
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const oAuthState = await getOAuthState()
          const oAuthRole = oAuthState?.serverContext?.role
          const role =
            signUpRole.getStore() ??
            (isUserRole(oAuthRole) ? oAuthRole : undefined)
          if (role) return { data: { ...user, role } }
        }
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
    username({
      minUsernameLength: USERNAME_MIN_LENGTH,
      maxUsernameLength: USERNAME_MAX_LENGTH,
      usernameValidator: (value) => USERNAME_PATTERN.test(value),
      validationOrder: { username: 'post-normalization' }
    }),
    // Google doesn't accept wildcard redirect URIs, so Previews go through the production
    // callback; localhost has its own registered URI and never shares the proxy secret:
    // https://www.better-auth.com/docs/plugins/oauth-proxy
    ...(process.env.VERCEL
      ? [
          oAuthProxy({
            productionURL: PRODUCTION_URL,
            // Server Actions call auth.api with headers only, so without it the plugin compares
            // against VERCEL_URL, the deployment URL, and proxies Production too (#44)
            currentURL:
              process.env.VERCEL_ENV === 'production'
                ? PRODUCTION_URL
                : undefined,
            secret: process.env.OAUTH_PROXY_SECRET
          })
        ]
      : ([] as const)),
    nextCookies()
  ]
})
