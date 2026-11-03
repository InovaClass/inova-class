import { expect, type Page } from '@playwright/test'

import { orchestrator } from '@/tests/orchestrator'

export const signUpTeacher = async (page: Page) => {
  const teacher = orchestrator.newUser()

  await page.goto('/cadastro/professor')
  await page.getByLabel('Nome').fill(teacher.name)
  await page.getByLabel('E-mail').fill(teacher.email)
  await page.getByLabel('Senha', { exact: true }).fill(teacher.password)
  await page.getByLabel('Confirmar senha').fill(teacher.password)
  await page.getByRole('checkbox', { name: /^Li e aceito/ }).click()
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(
    page.getByText(`Enviamos um link de confirmação para ${teacher.email}`)
  ).toBeVisible()

  // The verification link also signs the user in
  const link = await orchestrator.waitForLinkSentTo(teacher.email)
  await page.goto(link.toString())
  return teacher
}

export const signUpStudent = async (page: Page) => {
  const student = orchestrator.newStudent()

  await page.goto('/cadastro/aluno')
  await page.getByLabel('Nome', { exact: true }).fill(student.name)
  await page.getByLabel('Nome de usuário').fill(student.username)
  await page.getByLabel('E-mail').fill(student.email)
  await page.getByLabel('Senha', { exact: true }).fill(student.password)
  await page.getByLabel('Confirmar senha').fill(student.password)
  await page.getByRole('checkbox', { name: /^Li e aceito/ }).click()
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(
    page.getByText(`Enviamos um link de confirmação para ${student.email}`)
  ).toBeVisible()

  const link = await orchestrator.waitForLinkSentTo(student.email)
  await page.goto(link.toString())
  return student
}
