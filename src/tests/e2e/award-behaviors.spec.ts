import { expect, type Locator, type Page, test } from '@playwright/test'

import { orchestrator } from '@/tests/orchestrator'

import { createClass } from './classes'
import { signUpTeacher } from './sign-up'

const inviteStudents = async (page: Page, count: number) => {
  const students = Array.from({ length: count }, orchestrator.newUser)
  await page.getByRole('link', { name: 'Convidar alunos' }).click()
  await page
    .getByLabel('Alunos')
    .fill(students.map(({ name, email }) => `${name}, ${email}`).join('\n'))
  await page.getByRole('button', { name: 'Enviar convites' }).click()
  await page.getByRole('link', { name: 'Voltar à turma' }).click()
  return students
}

const coinsOf = (row: Locator) => row.locator('[data-slot="coin-counter"]')

test('a teacher awards a behavior to several students and undoes it', async ({
  page
}) => {
  test.slow()
  await signUpTeacher(page)
  await createClass(page)
  const students = await inviteStudents(page, 2)
  const rows = students.map(({ email }) =>
    page.getByRole('listitem').filter({ hasText: email })
  )
  await expect(coinsOf(rows[0]!)).toContainText('0')

  await page.getByRole('checkbox', { name: 'Selecionar todos' }).click()
  await expect(page.getByText('2 selecionados')).toBeVisible()
  await page.getByRole('button', { name: 'Aplicar comportamento' }).click()
  await page
    .getByRole('dialog', { name: 'Aplicar comportamento' })
    .getByRole('button', { name: /Ajudou um colega/ })
    .click()

  await expect(
    page.getByRole('dialog', { name: 'Aplicar comportamento' })
  ).toBeHidden()
  await expect(
    page.getByText('Ajudou um colega: aplicado a 2 alunos.')
  ).toBeVisible()
  await expect(page.getByText('Nenhum aluno selecionado')).toBeVisible()
  for (const row of rows) {
    await expect(row.getByText('XP 10/100')).toBeVisible()
    await expect(coinsOf(row)).toContainText('5')
  }

  await page.getByRole('button', { name: 'Desfazer' }).click()

  await expect(page.getByText('Aplicação desfeita.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Desfazer' })).toBeHidden()
  for (const row of rows) {
    await expect(row.getByText('XP 0/100')).toBeVisible()
    await expect(coinsOf(row)).toContainText('0')
  }
})

test('a teacher awards a behavior to one selected student', async ({
  page
}) => {
  test.slow()
  await signUpTeacher(page)
  await createClass(page)
  const [first, second] = await inviteStudents(page, 2)

  await page
    .getByRole('checkbox', { name: `Selecionar ${first!.name}`, exact: false })
    .click()
  await expect(page.getByText('1 selecionado')).toBeVisible()
  await page.getByRole('button', { name: 'Aplicar comportamento' }).click()
  await page
    .getByRole('dialog', { name: 'Aplicar comportamento' })
    .getByRole('button', { name: /Chegou atrasado/ })
    .click()

  await expect(
    page
      .getByRole('listitem')
      .filter({ hasText: first!.email })
      .getByText('HP 45/50')
  ).toBeVisible()
  await expect(
    page
      .getByRole('listitem')
      .filter({ hasText: second!.email })
      .getByText('HP 50/50')
  ).toBeVisible()
})
