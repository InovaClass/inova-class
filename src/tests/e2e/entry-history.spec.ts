import { expect, test } from '@playwright/test'

import { orchestrator } from '@/tests/orchestrator'

import { createClass } from './classes'
import { signUpTeacher } from './sign-up'

test('a teacher reverses an entry from the history of a student', async ({
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
  const row = page.getByRole('listitem').filter({ hasText: student.email })

  await page.getByRole('checkbox', { name: 'Selecionar todos' }).click()
  await page.getByRole('button', { name: 'Aplicar comportamento' }).click()
  await page
    .getByRole('dialog', { name: 'Aplicar comportamento' })
    .getByRole('button', { name: /Ajudou um colega/ })
    .click()
  await expect(row.getByText('XP 10/100')).toBeVisible()

  await row.getByRole('link', { name: /Histórico/ }).click()
  await expect(
    page.getByRole('heading', { name: `Histórico de ${student.name}` })
  ).toBeVisible()
  await expect(page.getByText('+10 XP, +5 moedas')).toBeVisible()

  await page.getByRole('button', { name: /Reverter/ }).click()
  await page
    .getByRole('alertdialog', { name: 'Reverter lançamento?' })
    .getByRole('button', { name: 'Reverter' })
    .click()

  const message = page.getByText('Lançamento revertido.')
  await expect(message).toBeVisible()
  await expect(message.locator('..')).toBeFocused()
  await expect(page.getByText(/Revertido em .*-10 XP, -5 moedas/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Reverter/ })).toBeHidden()

  await page.getByRole('link', { name: 'Voltar à turma' }).click()
  await expect(row.getByText('XP 0/100')).toBeVisible()
})
