import { expect, type Locator, type Page, test } from '@playwright/test'

import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH } from '@/models/class/constants'

import { createClass } from './classes'
import { signUpStudent, signUpTeacher } from './sign-up'

const OBJECTIVE = 'Atravessar a ponte'

const discussionOf = (page: Page) =>
  page.getByRole('region', { name: `Discussão de ${OBJECTIVE}` })

// Only the hydrated form rejects an empty message on the client, so that error proves it's ready
const postMessage = async (discussion: Locator, body: string) => {
  const field = discussion.getByRole('textbox', { name: 'Mensagem' })
  await expect(async () => {
    await discussion.getByRole('button', { name: 'Enviar' }).click()
    await expect(field).toHaveAccessibleDescription(/Escreva a mensagem/, {
      timeout: 1000
    })
  }).toPass()
  await field.fill(body)
  await discussion.getByRole('button', { name: 'Enviar' }).click()
  await expect(field).toHaveValue('')
}

test('the teacher and a student talk in the discussion of an objective', async ({
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

  await teacherPage.getByRole('link', { name: 'Missões', exact: true }).click()
  await teacherPage.getByRole('link', { name: 'Nova missão' }).click()
  await teacherPage.getByLabel('Nome').fill('O rio')
  await teacherPage.getByRole('button', { name: 'Criar missão' }).click()
  await teacherPage.getByRole('link', { name: 'Novo objetivo' }).click()
  await teacherPage.getByLabel('Nome').fill(OBJECTIVE)
  await teacherPage.getByLabel('História').fill('A ponte balança.')
  await teacherPage.getByLabel('XP da recompensa').fill('20')
  await teacherPage.getByRole('checkbox', { name: /Abrir a discussão/ }).click()
  await teacherPage.getByRole('button', { name: 'Criar objetivo' }).click()
  await teacherPage.getByRole('button', { name: 'Publicar missão' }).click()
  await postMessage(discussionOf(teacherPage), 'Perguntem aqui')
  const missionPath = new URL(teacherPage.url()).pathname

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
  await expect(studentPage).toHaveURL(/\/aluno\/turmas\//)
  await studentPage.goto(missionPath.replace('/professor/', '/aluno/'))
  const studentDiscussion = discussionOf(studentPage)
  await expect(studentDiscussion).toContainText('Perguntem aqui')
  await postMessage(studentDiscussion, 'A ponte aguenta?')

  // The `message` event refreshes the teacher's mission page
  const teacherDiscussion = discussionOf(teacherPage)
  await expect(
    teacherDiscussion.getByRole('listitem').filter({
      hasText: 'A ponte aguenta?'
    })
  ).toContainText(student.name)

  await teacherPage.getByRole('link', { name: `Editar ${OBJECTIVE}` }).click()
  await teacherPage.getByRole('checkbox', { name: /Abrir a discussão/ }).click()
  await teacherPage.getByRole('button', { name: 'Salvar' }).click()
  await expect(teacherDiscussion).toContainText('A discussão está fechada.')

  // Editing an objective sends no event, so the student sees it on the next load
  await studentPage.reload()
  await expect(studentDiscussion).toContainText(
    'O professor fechou a discussão.'
  )
  await expect(studentDiscussion).toContainText('A ponte aguenta?')
  await expect(
    studentDiscussion.getByRole('textbox', { name: 'Mensagem' })
  ).toBeHidden()

  await studentContext.close()
})
