import { expect, type Page, test } from '@playwright/test'

import { orchestrator } from '@/tests/orchestrator'

const signIn = async (page: Page, email: string, password: string) => {
  await page.goto('/entrar')
  await page.getByLabel('E-mail ou usuário').fill(email)
  await page.getByLabel('Senha').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

test('teacher signs up, verifies the email and signs in', async ({ page }) => {
  const { name, email, password } = orchestrator.newUser()

  await page.goto('/cadastro/professor')
  await page.getByLabel('Nome').fill(name)
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByLabel('Confirmar senha').fill(password)

  const terms = page.getByRole('checkbox', { name: /^Li e aceito/ })
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(terms).toBeFocused()
  await expect(terms).toHaveAccessibleDescription(
    'Aceite os Termos de Uso e a Política de Privacidade para continuar.'
  )

  await terms.click()
  await expect(terms).toHaveAccessibleDescription('')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(
    page.getByText(`Enviamos um link de confirmação para ${email}`)
  ).toBeVisible()

  await signIn(page, email, password)
  await expect(page.getByText(/^Confirme seu e-mail/)).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Reenviar e-mail' })
  ).toBeDisabled()

  const link = await orchestrator.waitForLinkSentTo(email)
  await page.goto(link.toString())
  await expect(page).toHaveURL('/professor')

  await page.context().clearCookies()
  await signIn(page, email, password)
  await expect(page).toHaveURL('/professor')
})

test('resends the verification email once the cooldown ends', async ({
  page
}) => {
  // Lets the test move the countdown forward instead of waiting for it
  await page.clock.install()
  const { name, email, password } = orchestrator.newUser()

  await page.goto('/cadastro/professor')
  await page.getByLabel('Nome').fill(name)
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByLabel('Confirmar senha').fill(password)
  await page.getByRole('checkbox', { name: /^Li e aceito/ }).click()
  await page.getByRole('button', { name: 'Criar conta' }).click()

  const resend = page.getByRole('button', { name: 'Reenviar e-mail' })
  await expect(resend).toBeDisabled()
  await expect(resend).toContainText(/\(\d+s\)/)

  await orchestrator.waitForLinkSentTo(email)
  await orchestrator.endVerificationResendCooldown(email)
  await page.clock.fastForward('01:00')
  await expect(resend).toBeEnabled()
  await expect(resend).not.toContainText(/\(\d+s\)/)

  // Pressed from the keyboard: as with SubmitButton, a mouse click doesn't move the focus to the button
  await resend.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText(/^Enviamos um novo link/)).toBeVisible()
  await expect(resend).toBeDisabled()
  await expect(resend).toBeFocused()
  await expect
    .poll(async () => {
      const emails = await orchestrator.listEmailsTo(email)
      return emails.length
    })
    .toBe(2)
})

test('rejects unknown credentials', async ({ page }) => {
  await signIn(page, orchestrator.newEmail(), orchestrator.newPassword())
  await expect(
    page.getByText('E-mail, usuário ou senha incorretos.')
  ).toBeVisible()
})

test('validates the sign-up form before submitting', async ({ page }) => {
  await page.goto('/cadastro/professor')
  await page.getByRole('button', { name: 'Criar conta' }).click()

  await expect(page.getByLabel('Nome')).toBeFocused()
  await expect(page.getByLabel('Nome')).toHaveAccessibleDescription(
    'Informe seu nome.'
  )

  await page.getByLabel('E-mail').fill('ana@')
  await expect(page.getByLabel('E-mail')).toHaveAccessibleDescription(
    'Informe um e-mail válido.'
  )
  await page.getByLabel('E-mail').fill('ana@example.com')
  await expect(page.getByLabel('E-mail')).toHaveAccessibleDescription('')

  await page.getByLabel('Senha', { exact: true }).fill('senha-escolhida')
  await page.getByLabel('Confirmar senha').fill('senha-diferente')
  await page.getByLabel('Confirmar senha').blur()
  await expect(page.getByLabel('Confirmar senha')).toHaveAccessibleDescription(
    'As senhas não coincidem.'
  )
})

test('revalidates the confirmation when the password changes', async ({
  page
}) => {
  const password = page.getByLabel('Senha', { exact: true })
  const confirmation = page.getByLabel('Confirmar senha')

  await page.goto('/cadastro/professor')
  await password.fill('senha-escolhida')
  await password.blur()
  await expect(password).toHaveAccessibleDescription('Mínimo de 8 caracteres.')
  await expect(confirmation).toHaveAccessibleDescription('')

  await confirmation.fill('senha-escolhida')
  await confirmation.blur()
  await expect(confirmation).toHaveAccessibleDescription('')

  await password.fill('senha-trocada')
  await expect(confirmation).toHaveAccessibleDescription(
    'As senhas não coincidem.'
  )

  await password.fill('senha-escolhida')
  await expect(confirmation).toHaveAccessibleDescription('')
})

test('ticks the terms pressed while leaving a field reveals its error', async ({
  page
}) => {
  const name = page.getByLabel('Nome')
  const email = page.getByLabel('E-mail')
  const confirmation = page.getByLabel('Confirmar senha')
  const terms = page.getByRole('checkbox', { name: /^Li e aceito/ })

  await page.goto('/cadastro/professor')
  // A blur before hydration reveals nothing, and the error below proves the form is hydrated
  await expect(async () => {
    await name.focus()
    await email.focus()
    await expect(name).toHaveAccessibleDescription('Informe seu nome.', {
      timeout: 1000
    })
  }).toPass()

  await confirmation.focus()
  await terms.click()
  await expect(terms).toBeChecked()
})

test('follows a link pressed while leaving a field reveals its error', async ({
  page
}) => {
  const identifier = page.getByLabel('E-mail ou usuário')
  const password = page.getByLabel('Senha')

  await page.goto('/entrar')
  // A blur before hydration reveals nothing, and the error below proves the form is hydrated
  await expect(async () => {
    await password.focus()
    await password.blur()
    await expect(password).toHaveAccessibleDescription('Informe sua senha.', {
      timeout: 1000
    })
  }).toPass()

  await identifier.focus()
  await page.getByRole('link', { name: 'Esqueci minha senha' }).click()

  await expect(page).toHaveURL('/esqueci-a-senha')
})
