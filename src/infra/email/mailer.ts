import { createTransport } from 'nodemailer'

type Email = {
  to: string
  subject: string
  text: string
  html: string
}

const sender = (domain: string) => `inova.class <nao-responda@${domain}>`

// The Resend integration (Vercel Marketplace) injects the API key, which is also its SMTP password
// (https://resend.com/docs/send-with-smtp), and the domain verified for sending
const createTransporter = () =>
  process.env.RESEND_API_KEY
    ? createTransport(
        {
          host: 'smtp.resend.com',
          port: 465,
          secure: true,
          auth: { user: 'resend', pass: process.env.RESEND_API_KEY }
        },
        { from: sender(process.env.RESEND_EMAIL_DOMAIN!) }
      )
    : createTransport(process.env.SMTP_URL, { from: sender('localhost') })

export const sendEmail = async (email: Email) => {
  await createTransporter().sendMail(email)
}
