import { expect, type Page, test } from '@playwright/test'

import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH } from '@/models/class/constants'

import { createClass } from './classes'
import { signUpStudent, signUpTeacher } from './sign-up'

// Only the hydrated form rejects an empty message on the client, so that error proves it's ready
const postMessage = async (page: Page, body: string) => {
  const field = page.getByRole('textbox', { name: 'Mensagem' })
  await expect(async () => {
    await page.getByRole('button', { name: 'Enviar' }).click()
    await expect(field).toHaveAccessibleDescription(/Escreva a mensagem/, {
      timeout: 1000
    })
  }).toPass()
  await field.fill(body)
  await page.getByRole('button', { name: 'Enviar' }).click()
  await expect(field).toHaveValue('')
}

const messageOf = (page: Page, body: string) =>
  page.getByRole('list', { name: 'Mensagens' }).getByRole('listitem').filter({
    hasText: body
  })

test('the teacher opens the board, mutes a student and removes a message', async ({
  page: teacherPage,
  browser
}) => {
  // Two sign-ups, plus routes compiled by `pnpm dev` on their first request
  test.slow()
  await signUpTeacher(teacherPage)
  await createClass(teacherPage)
  const code =
    (await teacherPage
      .getByText(new RegExp(`^[${JOIN_CODE_ALPHABET}]{${JOIN_CODE_LENGTH}}$`))
      .textContent()) ?? ''

  await teacherPage.getByRole('link', { name: 'Mural' }).click()
  await teacherPage.getByRole('button', { name: 'Abrir mural' }).click()
  await expect(
    teacherPage.getByRole('button', { name: 'Fechar mural' })
  ).toBeVisible()
  await postMessage(teacherPage, 'Bem-vindos ao mural')
  await expect(messageOf(teacherPage, 'Bem-vindos ao mural')).toContainText(
    'Professor'
  )

  const studentContext = await browser.newContext()
  const studentPage = await studentContext.newPage()
  const student = await signUpStudent(studentPage)
  await expect(async () => {
    await studentPage.getByRole('button', { name: 'Entrar na turma' }).click()
    await expect(
      studentPage.getByLabel('Código da turma')
    ).toHaveAccessibleDescription(/Informe o código/, { timeout: 1000 })
  }).toPass()
  await studentPage.getByLabel('Código da turma').fill(code)
  await studentPage.getByRole('button', { name: 'Entrar na turma' }).click()
  await studentPage.getByRole('link', { name: 'Mural' }).click()
  await expect(messageOf(studentPage, 'Bem-vindos ao mural')).toBeVisible()
  await postMessage(studentPage, 'Oi, professor')
  await expect(messageOf(studentPage, 'Oi, professor')).toContainText('Você')

  await teacherPage.reload()
  const studentMessage = messageOf(teacherPage, 'Oi, professor')
  await expect(studentMessage).toContainText(student.name)
  await studentMessage
    .getByRole('button', { name: `Silenciar ${student.name}` })
    .click()
  await expect(
    studentMessage.getByRole('button', { name: `Reativar ${student.name}` })
  ).toBeVisible()

  await studentPage.reload()
  await expect(studentPage.getByText(/silenciou você/)).toBeVisible()
  await expect(
    studentPage.getByRole('textbox', { name: 'Mensagem' })
  ).toBeHidden()

  await studentMessage
    .getByRole('button', { name: `Remover mensagem de ${student.name}` })
    .click()
  await teacherPage
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Remover' })
    .click()
  await expect(studentMessage).toContainText('Os alunos não a veem mais.')

  await studentPage.reload()
  await expect(messageOf(studentPage, 'Bem-vindos ao mural')).toBeVisible()
  await expect(messageOf(studentPage, 'Oi, professor')).toBeHidden()

  await studentContext.close()
})
