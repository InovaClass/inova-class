import { expect, test } from '@playwright/test'

import { orchestrator } from '@/tests/orchestrator'

import { createClass } from './classes'
import { signUpStudent, signUpTeacher } from './sign-up'

test('a student deletes their own account after typing the password', async ({
  page
}) => {
  // Routes compiled by `pnpm dev` on their first request
  test.slow()
  const student = await signUpStudent(page)

  await page.getByRole('link', { name: 'Minha conta' }).click()
  const password = page.getByLabel('Senha atual')
  await password.fill(orchestrator.newPassword())
  await page.getByRole('button', { name: 'Excluir conta' }).click()
  await expect(password).toHaveAccessibleDescription(/Senha incorreta\./)

  await password.fill(student.password)
  await page.getByRole('button', { name: 'Excluir conta' }).click()

  await expect(page).toHaveURL('/entrar?conta=apagada')
  await expect(page.getByText('Sua conta foi excluída.')).toBeVisible()
  await page.getByLabel('E-mail ou usuário').fill(student.email)
  await page.getByLabel('Senha').fill(student.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(
    page.getByText('E-mail, usuário ou senha incorretos.')
  ).toBeVisible()
})

test('a teacher deletes the account of a student they invited', async ({
  page
}) => {
  test.slow()
  await signUpTeacher(page)
  await createClass(page)
  const student = orchestrator.newUser()
  await page.getByRole('link', { name: 'Convidar alunos' }).click()
  await page.getByLabel('Alunos').fill(`${student.name}, ${student.email}`)
  await page.getByRole('button', { name: 'Enviar convites' }).click()
  await page.getByRole('link', { name: 'Voltar à turma' }).click()

  await page
    .getByRole('button', {
      name: `Excluir conta de ${student.name} (${student.email})`
    })
    .click()
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Excluir conta' })
    .click()

  const message = page.getByText('Conta do aluno excluída.')
  await expect(message).toBeVisible()
  await expect(message.locator('..')).toBeFocused()
  await expect(page.getByText('Nenhum aluno na turma')).toBeVisible()
})
