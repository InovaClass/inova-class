type Template = {
  subject: string
  text: string
  html: string
}

const actionEmail = (
  subject: string,
  intro: string,
  action: string,
  url: string
): Template => ({
  subject,
  text: `${intro}\n\n${action}: ${url}\n\nSe você não fez esta solicitação, ignore este e-mail.`,
  html: `<p>${intro}</p><p><a href="${url}">${action}</a></p><p>Se você não fez esta solicitação, ignore este e-mail.</p>`
})

export const verifyEmailTemplate = (url: string) =>
  actionEmail(
    'Confirme seu e-mail no inova.class',
    'Falta pouco para começar a usar o inova.class.',
    'Confirmar e-mail',
    url
  )

export const resetPasswordTemplate = (url: string) =>
  actionEmail(
    'Redefina sua senha do inova.class',
    'Recebemos um pedido para redefinir a senha da sua conta.',
    'Redefinir senha',
    url
  )
