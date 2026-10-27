import { setTimeout } from 'node:timers/promises'

import { fakerPT_BR as faker } from '@faker-js/faker'
import { eq } from 'drizzle-orm'

const MAILPIT_URL = 'http://localhost:8025/api/v1'

type MailpitMessage = { ID: string; Subject: string }

// Not faker's email: it can repeat across runs, and every test needs an account of its own
const newEmail = () => `${crypto.randomUUID()}@example.com`

const newPassword = () => faker.internet.password({ length: 16 })

// Unique for the same reason as the email, and within USERNAME_MAX_LENGTH
const newUsername = () =>
  `aluno_${crypto.randomUUID().replaceAll('-', '').slice(0, 20)}`

const newUser = () => ({
  name: faker.person.fullName(),
  email: newEmail(),
  password: newPassword()
})

const newStudent = () => ({ ...newUser(), username: newUsername() })

const listEmailsTo = async (email: string) => {
  const query = encodeURIComponent(`to:"${email}"`)
  const response = await fetch(`${MAILPIT_URL}/search?query=${query}`)
  const { messages } = (await response.json()) as {
    messages: MailpitMessage[]
  }
  return messages
}

// Auth emails are sent after the response, so they may land a moment later
const waitForLinkSentTo = async (
  email: string,
  { subject = '', timeout = 10_000 } = {}
) => {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const messages = await listEmailsTo(email)
    const message = messages.find(({ Subject }) => Subject.includes(subject))
    if (message) {
      const response = await fetch(`${MAILPIT_URL}/message/${message.ID}`)
      const { Text } = (await response.json()) as { Text: string }
      const link = /https?:\/\/\S+/.exec(Text)?.[0]
      if (link) return new URL(link)
    }
    await setTimeout(250)
  }
  throw new Error(`No email with a link reached ${email}`)
}

// Stands in for a teacher issuing a temporary password until #10 adds that flow. The database is
// imported lazily so the e2e tests, which run outside Next, only load the local settings when they
// need it
const requirePasswordChange = async (email: string) => {
  if (!process.env.DATABASE_URL) process.loadEnvFile('.env.development')
  const { database } = await import('@/infra/database/client')
  const { users } = await import('@/infra/database/schema')
  await database
    .update(users)
    .set({ mustChangePassword: true })
    .where(eq(users.email, email))
}

export const orchestrator = {
  newEmail,
  newUsername,
  newUser,
  newStudent,
  newPassword,
  listEmailsTo,
  waitForLinkSentTo,
  requirePasswordChange
}
