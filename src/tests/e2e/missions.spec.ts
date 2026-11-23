import { expect, type Page, test } from '@playwright/test'

import { createClass } from './classes'
import { signUpTeacher } from './sign-up'

const createObjective = async (
  page: Page,
  name: string,
  fields: { dueOn?: string; latePenaltyHp?: string } = {}
) => {
  await page.getByRole('link', { name: 'Novo objetivo' }).click()
  await page.getByLabel('Nome').fill(name)
  await page.getByLabel('História').fill(`A história de ${name}.`)
  await page.getByLabel('XP da recompensa').fill('20')
  if (fields.dueOn) await page.getByLabel('Prazo (opcional)').fill(fields.dueOn)
  if (fields.latePenaltyHp) {
    await page.getByLabel('HP tirado no atraso').fill(fields.latePenaltyHp)
  }
  await page.getByRole('button', { name: 'Criar objetivo' }).click()
}

test('a teacher builds a mission, orders its objectives and publishes it', async ({
  page
}) => {
  // Goes through many routes, each compiled by `pnpm dev` on its first request
  test.slow()
  await signUpTeacher(page)
  await createClass(page)

  await page.getByRole('link', { name: 'Missões', exact: true }).click()
  await page.getByRole('link', { name: 'Nova missão' }).click()
  await page.getByLabel('Nome').fill('A floresta sombria')
  await page.getByRole('button', { name: 'Criar missão' }).click()
  await expect(
    page.getByRole('heading', { name: 'A floresta sombria' })
  ).toBeVisible()

  await page.getByRole('button', { name: 'Publicar missão' }).click()
  await expect(
    page.getByText('A missão ainda não tem objetivos.')
  ).toBeVisible()

  await createObjective(page, 'Entrar na floresta', { latePenaltyHp: '5' })
  await expect(
    page.getByLabel('HP tirado no atraso')
  ).toHaveAccessibleDescription(/Defina o prazo/)
  const dueOn = page.getByLabel('Prazo (opcional)')
  await dueOn.focus()
  await page.keyboard.type('12')
  await page.getByRole('button', { name: 'Criar objetivo' }).click()
  await expect(dueOn).toHaveAccessibleDescription(/Complete a data/)
  await dueOn.fill('2026-12-01')
  await page.getByRole('button', { name: 'Criar objetivo' }).click()
  const first = page
    .getByRole('listitem')
    .filter({ hasText: 'Entrar na floresta' })
  await expect(first).toContainText('Prazo: 01/12/2026')
  await expect(first).toContainText('Atraso: -5 HP')

  await createObjective(page, 'Encontrar o mapa')
  const objectives = page
    .getByRole('list')
    .filter({ hasText: 'Entrar na floresta' })
    .getByRole('listitem')
  await expect(objectives).toHaveText([/1\. Entrar/, /2\. Encontrar/])

  await page.getByRole('button', { name: 'Subir Encontrar o mapa' }).click()
  await expect(objectives).toHaveText([/1\. Encontrar/, /2\. Entrar/])
  // The moved row lost its "Subir" at the top, so the focus goes to its other button
  await expect(
    page.getByRole('button', { name: 'Descer Encontrar o mapa' })
  ).toBeFocused()

  await page.getByRole('button', { name: 'Publicar missão' }).click()
  await expect(
    page.getByText('Missão publicada. Os alunos já podem vê-la.')
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Publicar missão' })
  ).toBeHidden()

  await page.getByRole('link', { name: 'Voltar às missões' }).click()
  const published = page
    .getByRole('listitem')
    .filter({ hasText: 'A floresta sombria' })
  await expect(published).toContainText('2 objetivos')
  await page.getByRole('button', { name: 'Remover A floresta sombria' }).click()
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Remover' })
    .click()
  await expect(page.getByText('Missão removida.')).toBeVisible()
  await expect(published).toBeHidden()
})
