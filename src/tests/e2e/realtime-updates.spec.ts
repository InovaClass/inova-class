import { expect, type Page, test } from '@playwright/test'

import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH } from '@/models/class/constants'

import { createClass } from './classes'
import { signUpStudent, signUpTeacher } from './sign-up'

// The route subscribes before it answers, so an event published after the response reaches the page
const waitForClassEvents = (page: Page) =>
  page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith('/eventos')
  )

const award = async (page: Page, studentName: string, behavior: string) => {
  await page
    .getByRole('checkbox', { name: `Selecionar ${studentName}`, exact: false })
    .click()
  await page.getByRole('button', { name: 'Aplicar comportamento' }).click()
  await page
    .getByRole('dialog', { name: 'Aplicar comportamento' })
    .getByRole('button', { name: new RegExp(behavior) })
    .click()
  await expect(page.getByText(`${behavior}: aplicado a 1 aluno.`)).toBeVisible()
}

test('the student and teacher screens update without a reload', async ({
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

  await teacherPage.getByRole('link', { name: 'Recompensas' }).click()
  await teacherPage.getByRole('link', { name: 'Nova recompensa' }).click()
  await teacherPage.getByLabel('Nome').fill('Figurinha')
  await teacherPage.getByLabel('Preço em moedas').fill('5')
  await teacherPage.getByRole('button', { name: 'Criar recompensa' }).click()
  await expect(
    teacherPage.getByRole('listitem').filter({ hasText: 'Figurinha' })
  ).toBeVisible()

  await teacherPage.goto(`${classUrl}/comportamentos/novo`)
  await teacherPage.getByLabel('Nome').fill('Perdeu moedas')
  await teacherPage.getByLabel('Moedas', { exact: true }).fill('-5')
  await teacherPage.getByRole('button', { name: 'Criar comportamento' }).click()
  await expect(
    teacherPage.getByRole('link', { name: 'Editar Perdeu moedas' })
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
  const studentEvents = waitForClassEvents(studentPage)
  await studentPage.getByRole('button', { name: 'Entrar na turma' }).click()
  await studentEvents
  await expect(studentPage.getByText('XP 0/100')).toBeVisible()
  await expect(
    studentPage.getByRole('listitem').filter({ hasText: 'Figurinha' })
  ).toContainText('Moedas insuficientes')

  const teacherEvents = waitForClassEvents(teacherPage)
  await teacherPage.goto(classUrl)
  await teacherEvents
  await award(teacherPage, student.name, 'Ajudou um colega')
  await expect(studentPage.getByText('XP 10/100')).toBeVisible()

  // The penalty removes the button of the open dialog, and the focus would drop to the body
  await studentPage.getByRole('button', { name: 'Comprar Figurinha' }).click()
  await expect(
    studentPage.getByRole('alertdialog', { name: 'Comprar recompensa?' })
  ).toBeVisible()
  await award(teacherPage, student.name, 'Perdeu moedas')
  await expect(
    studentPage.getByRole('listitem').filter({ hasText: 'Figurinha' })
  ).toContainText('Moedas insuficientes')
  await expect(studentPage.getByRole('alertdialog')).toHaveCount(0)
  await expect(studentPage.getByRole('heading', { level: 1 })).toBeFocused()

  await award(teacherPage, student.name, 'Ajudou um colega')
  await studentPage.getByRole('button', { name: 'Comprar Figurinha' }).click()
  await studentPage
    .getByRole('alertdialog', { name: 'Comprar recompensa?' })
    .getByRole('button', { name: 'Comprar' })
    .click()
  await expect(
    studentPage.getByText('Recompensa comprada. Aguarde o professor entregar.')
  ).toBeVisible()

  await expect(
    teacherPage.getByRole('link', { name: 'Entregas (1)' })
  ).toBeVisible()

  await studentContext.close()
})
