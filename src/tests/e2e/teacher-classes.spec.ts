import { expect, type Page, test } from '@playwright/test'

import { orchestrator } from '@/tests/orchestrator'

import { signUpTeacher } from './sign-up'

const createClass = async (page: Page) => {
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

test('a teacher creates, edits and archives a class', async ({ page }) => {
  // Goes through many routes, each compiled by `pnpm dev` on its first request
  test.slow()
  await signUpTeacher(page)
  await expect(page.getByText('Nenhuma turma ainda')).toBeVisible()

  const { name, description } = await createClass(page)
  await expect(page.getByText(description)).toBeVisible()

  await page.goto('/professor')
  await page.getByRole('link', { name }).click()
  await page.getByRole('link', { name: 'Editar' }).click()
  await expect(page.getByLabel('Nome')).toHaveValue(name)
  const edited = orchestrator.newClass()
  await page.getByLabel('Nome').fill(edited.name)
  await page.getByLabel('Descrição (opcional)').fill(edited.description)
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByRole('heading', { name: edited.name })).toBeVisible()
  await expect(page.getByText(edited.description)).toBeVisible()
  const classPath = new URL(page.url()).pathname

  await page.getByRole('button', { name: 'Arquivar' }).click()
  const dialog = page.getByRole('alertdialog')
  await dialog.getByRole('button', { name: 'Cancelar' }).click()
  await expect(dialog).toBeHidden()
  await page.getByRole('button', { name: 'Arquivar' }).click()
  await dialog.getByRole('button', { name: 'Arquivar' }).click()
  await expect(page).toHaveURL('/professor')
  await expect(page.getByText('Nenhuma turma ainda')).toBeVisible()

  await page.goto(classPath)
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible()
})

test('the archive dialog stays open while archiving and forgets a failure once closed', async ({
  page,
  context
}) => {
  test.slow()
  await signUpTeacher(page)
  await createClass(page)
  const classPath = new URL(page.url()).pathname
  const dialog = page.getByRole('alertdialog')
  const failure = dialog.getByText('Não encontramos essa turma.')

  // A second tab archives the class first, so the dialog of this one gets a failure back
  const otherTab = await context.newPage()
  await otherTab.goto(classPath)
  await otherTab.getByRole('button', { name: 'Arquivar' }).click()
  await otherTab
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Arquivar' })
    .click()
  await expect(otherTab).toHaveURL('/professor')
  await otherTab.close()

  await page.route(classPath, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await route.continue()
  })
  await page.getByRole('button', { name: 'Arquivar' }).click()
  await dialog.getByRole('button', { name: 'Arquivar' }).click()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  await expect(failure).toBeVisible()

  await dialog.getByRole('button', { name: 'Cancelar' }).click()
  await expect(dialog).toBeHidden()
  await page.getByRole('button', { name: 'Arquivar' }).click()
  await expect(dialog).toBeVisible()
  await expect(failure).toBeHidden()
})

test('a teacher cannot open the class of another teacher', async ({
  page,
  browser
}) => {
  // Two sign-ups, plus routes compiled by `pnpm dev` on their first request
  test.slow()
  await signUpTeacher(page)
  await createClass(page)
  const classPath = new URL(page.url()).pathname

  const otherContext = await browser.newContext()
  const otherPage = await otherContext.newPage()
  await signUpTeacher(otherPage)

  for (const path of [classPath, `${classPath}/editar`]) {
    await otherPage.goto(path)
    await expect(otherPage.getByRole('heading', { name: '404' })).toBeVisible()
  }
  await otherContext.close()
})
