import { expect, type Page, test } from '@playwright/test'

import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH } from '@/models/class/constants'

import { createClass } from './classes'
import { signUpStudent, signUpTeacher } from './sign-up'

const groupOf = (page: Page, name: string) =>
  page.getByRole('radiogroup', { name, exact: true })

// A click before hydration does nothing on a Base UI radio, so a checked one proves the form is ready
const pick = async (page: Page, group: string, option: string) => {
  const radio = groupOf(page, group).getByRole('radio', {
    name: option,
    exact: true
  })
  await expect(async () => {
    await radio.click()
    await expect(radio).toBeChecked({ timeout: 1000 })
  }).toPass()
}

test('a student picks a character, changes its look, and only the teacher changes its class', async ({
  page: teacherPage,
  browser
}) => {
  // Two sign-ups, plus routes compiled by `pnpm dev` on their first request
  test.slow()
  await signUpTeacher(teacherPage)
  const { name: className } = await createClass(teacherPage)
  const code =
    (await teacherPage
      .getByText(new RegExp(`^[${JOIN_CODE_ALPHABET}]{${JOIN_CODE_LENGTH}}$`))
      .textContent()) ?? ''

  const studentContext = await browser.newContext()
  const studentPage = await studentContext.newPage()
  const student = await signUpStudent(studentPage)
  // A click before hydration posts natively and reloads the page, losing the typed code. Only the
  // hydrated form rejects an empty code on the client, so that error proves it's ready
  await expect(async () => {
    await studentPage.getByRole('button', { name: 'Entrar na turma' }).click()
    await expect(
      studentPage.getByLabel('Código da turma')
    ).toHaveAccessibleDescription(/Informe o código/, { timeout: 1000 })
  }).toPass()
  await studentPage.getByLabel('Código da turma').fill(code)
  await studentPage.getByRole('button', { name: 'Entrar na turma' }).click()
  await expect(
    studentPage.getByRole('heading', { name: 'Escolha seu personagem' })
  ).toBeVisible()
  await expect(
    studentPage.getByRole('heading', { name: className })
  ).toBeVisible()

  await pick(studentPage, 'Classe', 'Mago')
  await pick(studentPage, 'Cor da roupa', 'Vinho')
  await studentPage
    .getByRole('button', { name: 'Confirmar personagem' })
    .click()
  await expect(studentPage.getByText('Personagem escolhido.')).toBeVisible()
  await expect(groupOf(studentPage, 'Classe')).toBeHidden()

  await pick(studentPage, 'Cabelo', 'Sem cabelo')
  await expect(groupOf(studentPage, 'Cor do cabelo')).toBeHidden()
  await studentPage.getByRole('button', { name: 'Salvar aparência' }).click()
  await expect(studentPage.getByText('Aparência salva.')).toBeVisible()

  await teacherPage.reload()
  const studentLabel = `${student.name} (${student.username})`
  await expect(teacherPage.getByText('Mago', { exact: true })).toBeVisible()
  const changeCharacterClassButton = teacherPage.getByRole('button', {
    name: `Trocar classe de ${studentLabel}`
  })
  await changeCharacterClassButton.click()
  const dialog = teacherPage.getByRole('dialog', { name: 'Trocar classe' })
  await expect(dialog.getByRole('button', { name: 'Mago' })).toBeHidden()
  await dialog.getByRole('button', { name: 'Curandeiro' }).click()
  await expect(dialog).toBeHidden()
  await expect(changeCharacterClassButton).toBeFocused()
  await expect(
    teacherPage.getByText('Classe trocada para Curandeiro.')
  ).toBeVisible()
  await expect(
    teacherPage.getByText('Curandeiro', { exact: true })
  ).toBeVisible()

  await studentPage.reload()
  await expect(
    groupOf(studentPage, 'Cor da roupa').getByRole('radio', {
      name: 'Branco'
    })
  ).toBeChecked()
  await expect(
    groupOf(studentPage, 'Cabelo').getByRole('radio', { name: 'Sem cabelo' })
  ).toBeChecked()
  await studentContext.close()
})
