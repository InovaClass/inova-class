import { expect, test } from '@playwright/test'

import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH } from '@/models/class/constants'

import { createClass } from './classes'
import { signUpStudent, signUpTeacher } from './sign-up'

test('a student sees the ranking only after the teacher shows it', async ({
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
    studentPage.getByRole('heading', { name: 'Seu progresso' })
  ).toBeVisible()
  await expect(
    studentPage.getByRole('heading', { name: 'Ranking' })
  ).toBeHidden()

  await teacherPage.getByRole('link', { name: 'Ranking' }).click()
  await expect(
    teacherPage.getByRole('listitem').filter({ hasText: student.name })
  ).toContainText('1º lugar')
  await teacherPage.getByRole('button', { name: 'Mostrar aos alunos' }).click()
  await expect(
    teacherPage.getByRole('button', { name: 'Ocultar dos alunos' })
  ).toBeVisible()

  await studentPage.reload()
  await expect(
    studentPage.getByRole('heading', { name: 'Ranking' })
  ).toBeVisible()
  await expect(
    studentPage.getByRole('listitem').filter({ hasText: student.name })
  ).toContainText('Você')

  await studentContext.close()
})
