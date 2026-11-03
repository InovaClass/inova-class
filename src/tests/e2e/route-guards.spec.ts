import { expect, type Page, test } from '@playwright/test'

import { orchestrator } from '@/tests/orchestrator'

const signUpTeacher = async (page: Page) => {
  const teacher = orchestrator.newUser()

  await page.goto('/cadastro/professor')
  await page.getByLabel('Nome').fill(teacher.name)
  await page.getByLabel('E-mail').fill(teacher.email)
  await page.getByLabel('Senha', { exact: true }).fill(teacher.password)
  await page.getByLabel('Confirmar senha').fill(teacher.password)
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(
    page.getByText(`Enviamos um link de confirmação para ${teacher.email}`)
  ).toBeVisible()

  // The verification link also signs the user in
  const link = await orchestrator.waitForLinkSentTo(teacher.email)
  await page.goto(link.toString())
  return teacher
}

const signUpStudent = async (page: Page) => {
  const student = orchestrator.newStudent()

  await page.goto('/cadastro/aluno')
  await page.getByLabel('Nome', { exact: true }).fill(student.name)
  await page.getByLabel('Nome de usuário').fill(student.username)
  await page.getByLabel('E-mail').fill(student.email)
  await page.getByLabel('Senha', { exact: true }).fill(student.password)
  await page.getByLabel('Confirmar senha').fill(student.password)
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(
    page.getByText(`Enviamos um link de confirmação para ${student.email}`)
  ).toBeVisible()

  const link = await orchestrator.waitForLinkSentTo(student.email)
  await page.goto(link.toString())
  return student
}

test('a signed-out visitor is sent to the sign-in page', async ({ page }) => {
  for (const path of ['/', '/professor', '/aluno']) {
    await page.goto(path)
    await expect(page).toHaveURL('/entrar')
  }
})

test('a teacher is kept out of the student area', async ({ page }) => {
  await signUpTeacher(page)
  await expect(page).toHaveURL('/professor')
  await expect(
    page.getByRole('heading', { name: 'Painel do professor' })
  ).toBeVisible()

  await page.goto('/aluno')
  await expect(page).toHaveURL('/professor')
})

test('a student is kept out of the teacher area', async ({ page }) => {
  await signUpStudent(page)
  await expect(page).toHaveURL('/aluno')
  await expect(
    page.getByRole('heading', { name: 'Painel do aluno' })
  ).toBeVisible()

  await page.goto('/professor')
  await expect(page).toHaveURL('/aluno')
})

test('a temporary password keeps the user out of the dashboards', async ({
  page
}) => {
  const { email } = await signUpStudent(page)
  await expect(page).toHaveURL('/aluno')
  await orchestrator.requirePasswordChange(email)

  await page.goto('/aluno')
  await expect(page).toHaveURL('/alterar-senha')
})

test('signing out ends the session in both areas', async ({ page }) => {
  await signUpTeacher(page)
  await expect(page).toHaveURL('/professor')
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL('/entrar')
  await page.goto('/professor')
  await expect(page).toHaveURL('/entrar')

  await signUpStudent(page)
  await expect(page).toHaveURL('/aluno')
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL('/entrar')
  await page.goto('/aluno')
  await expect(page).toHaveURL('/entrar')
})
