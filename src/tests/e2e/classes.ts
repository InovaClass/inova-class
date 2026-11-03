import { expect, type Page } from '@playwright/test'

import { orchestrator } from '@/tests/orchestrator'

export const createClass = async (page: Page) => {
  const schoolClass = orchestrator.newClass()

  await page.goto('/professor/turmas/nova')
  await page.getByLabel('Nome').fill(schoolClass.name)
  await page.getByLabel('Descrição (opcional)').fill(schoolClass.description)
  await page.getByRole('button', { name: 'Criar turma' }).click()
  await expect(
    page.getByRole('heading', { name: schoolClass.name })
  ).toBeVisible()
  return schoolClass
}
