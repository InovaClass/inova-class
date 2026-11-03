import { type Browser, expect, type Page, test } from '@playwright/test'

import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH } from '@/constants/class'

import { createClass } from './classes'
import { signUpStudent, signUpTeacher } from './sign-up'

const INVALID_CODE_MESSAGE =
  'Esse código não é válido. Confira com o professor da turma.'

const joinCodeOn = (page: Page) =>
  page.getByText(new RegExp(`^[${JOIN_CODE_ALPHABET}]{${JOIN_CODE_LENGTH}}$`))

const readJoinCode = async (page: Page) =>
  (await joinCodeOn(page).textContent()) ?? ''

const newStudentPage = async (browser: Browser) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await signUpStudent(page)
  return page
}

const submitCode = async (page: Page, code: string) => {
  await page.getByLabel('Código da turma').fill(code)
  await page.getByRole('button', { name: 'Entrar na turma' }).click()
}

test('a student joins with a valid code and fails with a disabled one', async ({
  page: teacherPage,
  browser
}) => {
  // Two sign-ups, plus routes compiled by `pnpm dev` on their first request
  test.slow()
  await signUpTeacher(teacherPage)
  const { name } = await createClass(teacherPage)
  const code = await readJoinCode(teacherPage)
  const studentPage = await newStudentPage(browser)

  await teacherPage.getByRole('button', { name: 'Desativar' }).click()
  await expect(
    teacherPage.getByRole('button', { name: 'Ativar' })
  ).toBeVisible()
  await submitCode(studentPage, code)
  await expect(
    studentPage.getByLabel('Código da turma')
  ).toHaveAccessibleDescription(new RegExp(INVALID_CODE_MESSAGE))

  await teacherPage.getByRole('button', { name: 'Ativar' }).click()
  await expect(
    teacherPage.getByRole('button', { name: 'Desativar' })
  ).toBeVisible()
  await submitCode(studentPage, code.toLowerCase())
  await expect(
    studentPage.getByText(`Você entrou na turma ${name}.`)
  ).toBeVisible()

  await submitCode(studentPage, code)
  await expect(
    studentPage.getByText(`Você já está na turma ${name}.`)
  ).toBeVisible()
  await studentPage.context().close()
})

test('a regenerated code asks for confirmation and replaces the old one', async ({
  page: teacherPage,
  browser
}) => {
  test.slow()
  await signUpTeacher(teacherPage)
  const { name } = await createClass(teacherPage)
  const oldCode = await readJoinCode(teacherPage)
  const dialog = teacherPage.getByRole('alertdialog')
  const regenerate = teacherPage.getByRole('button', {
    name: 'Gerar novo código'
  })

  await regenerate.click()
  await dialog.getByRole('button', { name: 'Cancelar' }).click()
  await expect(dialog).toBeHidden()
  await expect(joinCodeOn(teacherPage)).toHaveText(oldCode)

  await regenerate.click()
  await dialog.getByRole('button', { name: 'Gerar código' }).click()
  await expect(dialog).toBeHidden()
  await expect(regenerate).toBeFocused()
  await expect(teacherPage.getByText('Novo código gerado.')).toBeVisible()
  await expect(joinCodeOn(teacherPage)).not.toHaveText(oldCode)
  const newCode = await readJoinCode(teacherPage)

  const studentPage = await newStudentPage(browser)
  await submitCode(studentPage, oldCode)
  await expect(
    studentPage.getByLabel('Código da turma')
  ).toHaveAccessibleDescription(new RegExp(INVALID_CODE_MESSAGE))
  await submitCode(studentPage, newCode)
  await expect(
    studentPage.getByText(`Você entrou na turma ${name}.`)
  ).toBeVisible()
  await studentPage.context().close()
})
