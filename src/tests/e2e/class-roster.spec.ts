import { expect, test } from '@playwright/test'

import { orchestrator } from '@/tests/orchestrator'

import { createClass } from './classes'
import { signUpTeacher } from './sign-up'

test('a teacher sees a pending student and removes them from the class', async ({
  page
}) => {
  // Routes compiled by `pnpm dev` on their first request
  test.slow()
  await signUpTeacher(page)
  await createClass(page)
  await expect(page.getByText('Nenhum aluno na turma')).toBeVisible()
  const student = orchestrator.newUser()

  await page.getByRole('link', { name: 'Convidar alunos' }).click()
  await page.getByLabel('Alunos').fill(`${student.name}, ${student.email}`)
  await page.getByRole('button', { name: 'Enviar convites' }).click()
  await page.getByRole('link', { name: 'Voltar à turma' }).click()
  await expect(
    page.getByText(`Convite pendente: ${student.email}`)
  ).toBeVisible()

  await page
    .getByRole('button', { name: `Remover ${student.name} (${student.email})` })
    .click()
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Remover' })
    .click()

  const message = page.getByText('Aluno removido da turma.')
  await expect(message).toBeVisible()
  await expect(message.locator('..')).toBeFocused()
  await expect(page.getByRole('alertdialog')).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Alunos' })).toBeVisible()
  await expect(page.getByText('Nenhum aluno na turma')).toBeVisible()
})
