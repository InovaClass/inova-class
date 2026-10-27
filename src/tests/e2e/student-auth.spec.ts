import { expect, type Page, test } from '@playwright/test'

import { orchestrator } from '@/tests/orchestrator'

const signIn = async (page: Page, identifier: string, password: string) => {
  await page.goto('/entrar')
  await page.getByLabel('E-mail ou usuário').fill(identifier)
  await page.getByLabel('Senha').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

const signUpStudent = async (page: Page) => {
  const student = orchestrator.newStudent()

  await page.goto('/cadastro')
  await page.getByRole('link', { name: 'Sou aluno' }).click()
  await expect(page).toHaveURL('/cadastro/aluno')
  await page.getByLabel('Nome', { exact: true }).fill(student.name)
  await page.getByLabel('Nome de usuário').fill(student.username)
  await page.getByLabel('E-mail').fill(student.email)
  await page.getByLabel('Senha', { exact: true }).fill(student.password)
  await page.getByLabel('Confirmar senha').fill(student.password)
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(
    page.getByText(`Enviamos um link de confirmação para ${student.email}`)
  ).toBeVisible()

  return student
}

test('the role choice leads to the teacher sign-up form', async ({ page }) => {
  await page.goto('/cadastro')
  await page.getByRole('link', { name: 'Sou professor' }).click()
  await expect(page).toHaveURL('/cadastro/professor')
  await expect(
    page.getByRole('heading', { name: 'Criar conta de professor' })
  ).toBeVisible()
})

test('student signs up, verifies the email and signs in by username', async ({
  page
}) => {
  const { email, username, password } = await signUpStudent(page)

  const link = await orchestrator.waitForLinkSentTo(email)
  await page.goto(link.toString())
  await expect(page).toHaveURL('/')

  await page.context().clearCookies()
  await signIn(page, username, password)
  await expect(page).toHaveURL('/')
})

test('shows a taken username error on its field', async ({ page }) => {
  const { username } = await signUpStudent(page)
  const student = orchestrator.newStudent()

  await page.goto('/cadastro/aluno')
  await page.getByLabel('Nome', { exact: true }).fill(student.name)
  await page.getByLabel('Nome de usuário').fill(username)
  await page.getByLabel('E-mail').fill(student.email)
  await page.getByLabel('Senha', { exact: true }).fill(student.password)
  await page.getByLabel('Confirmar senha').fill(student.password)
  await page.getByRole('button', { name: 'Criar conta' }).click()

  await expect(page.getByLabel('Nome de usuário')).toBeFocused()
  await expect(page.getByLabel('Nome de usuário')).toHaveAccessibleDescription(
    /Este nome de usuário já está em uso\./
  )
})

test('a temporary password must be changed after signing in', async ({
  page
}) => {
  await page.goto('/alterar-senha')
  await expect(page).toHaveURL('/entrar')

  const { email, username, password } = await signUpStudent(page)
  const link = await orchestrator.waitForLinkSentTo(email)
  await page.goto(link.toString())
  await page.context().clearCookies()
  await orchestrator.requirePasswordChange(email)

  await signIn(page, username, password)
  await expect(page).toHaveURL('/alterar-senha')

  const newPassword = orchestrator.newPassword()
  await page.getByLabel('Nova senha', { exact: true }).fill(newPassword)
  await page.getByLabel('Confirmar nova senha').fill(newPassword)
  await page.getByRole('button', { name: 'Salvar senha' }).click()
  await expect(page).toHaveURL('/')

  await page.goto('/alterar-senha')
  await expect(page).toHaveURL('/')

  await page.context().clearCookies()
  await signIn(page, username, newPassword)
  await expect(page).toHaveURL('/')
})
