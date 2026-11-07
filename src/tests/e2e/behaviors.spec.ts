import { expect, test } from '@playwright/test'

import { createClass } from './classes'
import { signUpTeacher } from './sign-up'

test('a teacher adapts the default behaviors of a class', async ({ page }) => {
  // Goes through many routes, each compiled by `pnpm dev` on its first request
  test.slow()
  await signUpTeacher(page)
  await createClass(page)

  await page.getByRole('link', { name: 'Comportamentos' }).click()
  const positives = page.getByRole('listitem').filter({
    hasText: 'Ajudou um colega'
  })
  await expect(positives).toContainText('+10 XP, +5 moedas')

  await page.getByRole('link', { name: 'Novo comportamento' }).click()
  await page.getByLabel('Nome').fill('Leu em voz alta')
  await page.getByLabel('XP', { exact: true }).fill('10')
  await page.getByLabel('HP', { exact: true }).fill('-5')
  await page.getByRole('button', { name: 'Criar comportamento' }).click()
  await expect(
    page.getByLabel('HP', { exact: true })
  ).toHaveAccessibleDescription(/Use valores só positivos ou só negativos/)
  await page.getByLabel('HP', { exact: true }).fill('')
  await page.getByRole('button', { name: 'Criar comportamento' }).click()
  const created = page
    .getByRole('listitem')
    .filter({ hasText: 'Leu em voz alta' })
  await expect(created).toContainText('+10 XP')

  await page.getByRole('link', { name: 'Editar Leu em voz alta' }).click()
  await expect(page.getByLabel('XP', { exact: true })).toHaveValue('10')
  await page.getByLabel('XP', { exact: true }).fill('5')
  await page.getByLabel('Moedas', { exact: true }).fill('2')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(created).toContainText('+5 XP, +2 moedas')

  await page.getByRole('button', { name: 'Remover Leu em voz alta' }).click()
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Remover' })
    .click()
  await expect(page.getByText('Comportamento removido.')).toBeVisible()
  await expect(created).toBeHidden()
})
