import { expect, test } from '@playwright/test'

import { signUpStudent, signUpTeacher } from './sign-up'

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
