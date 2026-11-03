type Template = {
  subject: string
  text: string
  html: string
}

// Names of classes and usernames come from users, so they can't reach the HTML as markup (#10)
const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

const actionEmail = (
  subject: string,
  intro: string,
  action: string,
  url: string,
  closing = 'Se você não fez esta solicitação, ignore este e-mail.'
): Template => ({
  subject,
  text: `${intro}\n\n${action}: ${url}\n\n${closing}`,
  html: `<p>${escapeHtml(intro)}</p><p><a href="${url}">${action}</a></p><p>${closing}</p>`
})

const UNKNOWN_CLASS_CLOSING =
  'Se você não reconhece esta turma, ignore este e-mail.'

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

export const studentInviteTemplate = (
  url: string,
  { username, className }: { username: string; className?: string }
) =>
  actionEmail(
    'Crie sua senha no inova.class',
    `Você recebeu um convite para ${className ? `a turma ${className} no inova.class` : 'o inova.class'}. Seu nome de usuário é ${username}.`,
    'Criar senha',
    url,
    className ? UNKNOWN_CLASS_CLOSING : undefined
  )

export const classEnrollmentTemplate = (url: string, className: string) =>
  actionEmail(
    'Você entrou em uma turma no inova.class',
    `Seu professor adicionou você à turma ${className} no inova.class.`,
    'Entrar',
    url,
    UNKNOWN_CLASS_CLOSING
  )
