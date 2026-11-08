import { expect, test } from '@playwright/test'

import { DEFAULT_CONSEQUENCES } from '@/models/consequence/constants'
import { orchestrator } from '@/tests/orchestrator'

import { createClass } from './classes'
import { signUpTeacher } from './sign-up'

test('a student without HP gets a consequence drawn and the HP back', async ({
  page
}) => {
  test.slow()
  await signUpTeacher(page)
  await createClass(page)

  await page.getByRole('link', { name: 'Comportamentos' }).click()
  await page.getByRole('link', { name: 'Novo comportamento' }).click()
  await page.getByLabel('Nome').fill('Perdeu todo o HP')
  await page.getByLabel('HP').fill('-50')
  await page.getByRole('button', { name: 'Criar comportamento' }).click()
  await expect(
    page.getByRole('link', { name: 'Editar Perdeu todo o HP' })
  ).toBeVisible()
  await page.getByRole('link', { name: 'Voltar à turma' }).click()

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
    .getByRole('button', { name: /Perdeu todo o HP/ })
    .click()
  await expect(row.getByText('Sem HP')).toBeVisible()

  await row.getByRole('link', { name: /Sortear consequência/ }).click()
  await page.getByRole('button', { name: 'Sortear' }).click()

  await expect(page.getByText('Consequência sorteada')).toBeVisible()
  const drawableNames = DEFAULT_CONSEQUENCES.map(({ name }) => name).join('|')
  await expect(page.getByText(new RegExp(drawableNames))).toBeVisible()

  await page.getByRole('link', { name: 'Voltar à turma' }).click()
  await expect(row.getByText('HP 50/50')).toBeVisible()
  await expect(row.getByText('Sem HP')).toBeHidden()
})
