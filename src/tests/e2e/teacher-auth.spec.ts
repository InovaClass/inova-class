import { expect, type Page, test } from '@playwright/test'

import { orchestrator } from '@/tests/orchestrator'

const signIn = async (page: Page, email: string, password: string) => {
  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

test('teacher signs up, verifies the email and signs in', async ({ page }) => {
  const { name, email, password } = orchestrator.newUser()

  await page.goto('/cadastro')
  await page.getByLabel('Nome').fill(name)
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByLabel('Confirmar senha').fill(password)
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(
    page.getByText(`Enviamos um link de confirmação para ${email}`)
  ).toBeVisible()

  await signIn(page, email, password)
  await expect(page.getByText(/^Confirme seu e-mail/)).toBeVisible()

  const link = await orchestrator.waitForLinkSentTo(email)
  await page.goto(link.toString())
  await expect(page).toHaveURL('/')

  await page.context().clearCookies()
  await signIn(page, email, password)
  await expect(page).toHaveURL('/')
})

test('rejects unknown credentials', async ({ page }) => {
  await signIn(page, orchestrator.newEmail(), orchestrator.newPassword())
  await expect(page.getByText('E-mail ou senha incorretos.')).toBeVisible()
})

test('validates the sign-up form before submitting', async ({ page }) => {
  await page.goto('/cadastro')
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
