import { setTimeout } from 'node:timers/promises'

import { fakerPT_BR as faker } from '@faker-js/faker'

const MAILPIT_URL = 'http://localhost:8025/api/v1'

type MailpitMessage = { ID: string; Subject: string }

// Not faker's email: it can repeat across runs, and every test needs an account of its own
const newEmail = () => `${crypto.randomUUID()}@example.com`

const newPassword = () => faker.internet.password({ length: 16 })

const newUser = () => ({
  name: faker.person.fullName(),
  email: newEmail(),
  password: newPassword()
})

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

export const orchestrator = {
  newEmail,
  newUser,
  newPassword,
  listEmailsTo,
  waitForLinkSentTo
}
