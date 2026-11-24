import { expect, test } from '@playwright/test'

import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH } from '@/models/class/constants'
import { orchestrator } from '@/tests/orchestrator'

import { createClass } from './classes'
import { signUpStudent, signUpTeacher } from './sign-up'

test('a teacher completes an objective for a student and reverses it from the history', async ({
  page
}) => {
  // Goes through many routes, each compiled by `pnpm dev` on its first request
  test.slow()
  await signUpTeacher(page)
  await createClass(page)
  const classUrl = page.url()
  const student = orchestrator.newUser()
  await page.getByRole('link', { name: 'Convidar alunos' }).click()
  await page.getByLabel('Alunos').fill(`${student.name}, ${student.email}`)
  await page.getByRole('button', { name: 'Enviar convites' }).click()
  await expect(page.getByText(/Lista recebida com 1 aluno\./)).toBeVisible()

  await page.goto(classUrl)
  await page.getByRole('link', { name: 'Entregas de missões' }).click()
  await expect(page.getByText('Nenhuma entrega pendente')).toBeVisible()

  await page.goto(classUrl)
  await page.getByRole('link', { name: 'Missões', exact: true }).click()
  await page.getByRole('link', { name: 'Nova missão' }).click()
  await page.getByLabel('Nome').fill('A floresta sombria')
  await page.getByRole('button', { name: 'Criar missão' }).click()
  await page.getByRole('link', { name: 'Novo objetivo' }).click()
  await page.getByLabel('Nome').fill('Entrar na floresta')
  await page.getByLabel('História').fill('A trilha começa no rio.')
  await page.getByLabel('XP da recompensa').fill('20')
  await page.getByRole('button', { name: 'Criar objetivo' }).click()
  // A draft is hidden from the students, so its objectives can't be completed yet
  await expect(
    page.getByRole('link', { name: 'Concluir Entrar na floresta' })
  ).toBeHidden()
  await page.getByRole('button', { name: 'Publicar missão' }).click()
  await page.getByRole('link', { name: 'Concluir Entrar na floresta' }).click()
  await expect(
    page.getByRole('heading', { name: 'Concluir Entrar na floresta' })
  ).toBeVisible()
  const completionUrl = page.url()

  const students = page.getByRole('group', { name: 'Alunos' })
  await page.getByRole('button', { name: 'Concluir' }).click()
  await expect(students).toHaveAccessibleDescription(
    'Selecione pelo menos um aluno.'
  )
  await students.getByRole('checkbox', { name: student.name }).click()
  await page.getByRole('button', { name: 'Concluir' }).click()
  await expect(
    page.getByText('Entrar na floresta: concluído para 1 aluno.')
  ).toBeVisible()
  await expect(page.getByText('Nenhum aluno para concluir')).toBeVisible()

  await page.goto(classUrl)
  await page.getByRole('link', { name: 'Histórico', exact: true }).click()
  await page
    .getByRole('button', { name: /Reverter Objetivo: Entrar na floresta/ })
    .click()
  await page
    .getByRole('alertdialog', { name: 'Reverter lançamento?' })
    .getByRole('button', { name: 'Reverter' })
    .click()
  await expect(page.getByText('Lançamento revertido.')).toBeVisible()

  // The reversal returns the objective, so it can be completed again
  await page.goto(completionUrl)
  await expect(
    students.getByRole('checkbox', { name: student.name })
  ).toBeVisible()
})

test('a student sends an objective, the teacher returns it and approves it after a new send', async ({
  page: teacherPage,
  browser
}) => {
  // Two sign-ups, plus routes compiled by `pnpm dev` on their first request
  test.slow()
  await signUpTeacher(teacherPage)
  await createClass(teacherPage)
  const classUrl = teacherPage.url()
  const code =
    (await teacherPage
      .getByText(new RegExp(`^[${JOIN_CODE_ALPHABET}]{${JOIN_CODE_LENGTH}}$`))
      .textContent()) ?? ''

  await teacherPage.getByRole('link', { name: 'Missões', exact: true }).click()
  await teacherPage.getByRole('link', { name: 'Nova missão' }).click()
  await teacherPage.getByLabel('Nome').fill('A floresta sombria')
  await teacherPage.getByRole('button', { name: 'Criar missão' }).click()
  for (const [name, story] of [
    ['Entrar na floresta', 'A trilha começa no rio.'],
    ['Achar a cabana', 'Uma luz brilha entre as árvores.']
  ] as const) {
    await teacherPage.getByRole('link', { name: 'Novo objetivo' }).click()
    await teacherPage.getByLabel('Nome').fill(name)
    await teacherPage.getByLabel('História').fill(story)
    await teacherPage.getByLabel('XP da recompensa').fill('20')
    await teacherPage.getByRole('button', { name: 'Criar objetivo' }).click()
    await expect(
      teacherPage.getByRole('link', { name: `Editar ${name}` })
    ).toBeVisible()
  }
  await teacherPage.getByRole('button', { name: 'Publicar missão' }).click()
  await expect(
    teacherPage.getByRole('link', { name: 'Concluir Entrar na floresta' })
  ).toBeVisible()

  const studentContext = await browser.newContext()
  const studentPage = await studentContext.newPage()
  const student = await signUpStudent(studentPage)
  // Only the hydrated form rejects an empty code on the client, so that error proves it's ready
  await expect(async () => {
    await studentPage.getByRole('button', { name: 'Entrar na turma' }).click()
    await expect(
      studentPage.getByLabel('Código da turma')
    ).toHaveAccessibleDescription(/Informe o código/, { timeout: 1000 })
  }).toPass()
  await studentPage.getByLabel('Código da turma').fill(code)
  await studentPage.getByRole('button', { name: 'Entrar na turma' }).click()
  await expect(
    studentPage.getByText('Objetivo atual: Entrar na floresta')
  ).toBeVisible()
  await studentPage
    .getByRole('link', { name: 'Continuar A floresta sombria' })
    .click()
  await expect(
    studentPage.getByRole('heading', { name: 'A floresta sombria' })
  ).toBeVisible()
  await expect(
    studentPage.getByText('Uma luz brilha entre as árvores.')
  ).toBeHidden()

  const textField = studentPage
    .getByRole('form', { name: /Entrar na floresta/ })
    .getByLabel('O que você fez')
  await studentPage
    .getByRole('button', { name: 'Enviar Entrar na floresta' })
    .click()
  await expect(textField).toHaveAccessibleDescription(/Conte o que você fez\./)
  await textField.fill('Cheguei ao rio.')
  await studentPage
    .getByRole('button', { name: 'Enviar Entrar na floresta' })
    .click()
  const sent = studentPage.getByText(
    'Objetivo enviado. Aguarde a avaliação do professor.'
  )
  await expect(sent).toBeVisible()
  // The form left with the objective's new state, so the message takes the focus
  await expect(sent.locator('..')).toBeFocused()
  // Any submission opens the next objective, before the teacher decides
  await expect(
    studentPage.getByText('Uma luz brilha entre as árvores.')
  ).toBeVisible()

  await teacherPage.goto(classUrl)
  await teacherPage.getByRole('link', { name: /Entregas de missões/ }).click()
  await teacherPage
    .getByRole('button', {
      name: `Devolver Entrar na floresta de ${student.name} (${student.username})`
    })
    .click()
  await teacherPage.getByLabel('Comentário').fill('Conte o que viu no rio.')
  const returnDialog = teacherPage.getByRole('dialog', {
    name: 'Devolver entrega'
  })
  await returnDialog.getByRole('button', { name: 'Devolver' }).click()
  await expect(returnDialog).toBeHidden()
  await expect(
    teacherPage.getByText('Entrega devolvida ao aluno com o seu comentário.')
  ).toBeVisible()

  // The class event refreshes the student's page
  await expect(
    studentPage.getByText('Comentário do professor: Conte o que viu no rio.')
  ).toBeVisible()
  await expect(sent).toBeHidden()
  await expect(textField).toHaveValue('Cheguei ao rio.')
  await textField.fill('Cheguei ao rio e vi uma ponte.')
  await studentPage
    .getByRole('button', { name: 'Enviar Entrar na floresta' })
    .click()
  await expect(sent).toBeVisible()

  await teacherPage.reload()
  await teacherPage
    .getByRole('button', {
      name: `Aprovar Entrar na floresta de ${student.name} (${student.username})`
    })
    .click()
  await expect(
    teacherPage.getByText('Entrega aprovada. A recompensa foi lançada.')
  ).toBeVisible()

  await expect(studentPage.getByText('1/2 objetivos concluídos')).toBeVisible()
  await expect(
    studentPage.getByRole('listitem').filter({ hasText: 'Entrar na floresta' })
  ).toContainText('Concluído')
  await studentContext.close()
})
