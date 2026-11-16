import { expect, test } from '@playwright/test'

import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH } from '@/models/class/constants'

import { createClass } from './classes'
import { pick } from './radio'
import { signUpStudent, signUpTeacher } from './sign-up'

test('a student requests a power, reserving its cost, and the teacher approves it', async ({
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

  await teacherPage.getByRole('link', { name: 'Poderes' }).click()
  await teacherPage.getByRole('link', { name: 'Novo poder' }).click()
  await pick(teacherPage, 'Classe', 'Mago')
  await teacherPage.getByLabel('Nome').fill('Poder barato')
  await teacherPage.getByLabel('Custo em moedas').fill('5')
  await teacherPage.getByRole('button', { name: 'Criar poder' }).click()
  await expect(
    teacherPage.getByRole('link', { name: 'Editar Poder barato' })
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
  await pick(studentPage, 'Classe', 'Mago')
  await studentPage
    .getByRole('button', { name: 'Confirmar personagem' })
    .click()
  await expect(
    studentPage.getByRole('listitem').filter({ hasText: 'Poder barato' })
  ).toContainText('Moedas insuficientes')

  await teacherPage.goto(classUrl)
  await teacherPage
    .getByRole('checkbox', { name: `Selecionar ${student.name}`, exact: false })
    .click()
  await teacherPage
    .getByRole('button', { name: 'Aplicar comportamento' })
    .click()
  await teacherPage
    .getByRole('dialog', { name: 'Aplicar comportamento' })
    .getByRole('button', { name: /Ajudou um colega/ })
    .click()
  await expect(
    teacherPage.getByText('Ajudou um colega: aplicado a 1 aluno.')
  ).toBeVisible()

  await studentPage.reload()
  await studentPage
    .getByRole('button', { name: 'Usar poder Poder barato' })
    .click()
  await expect(
    studentPage.getByText('Pedido enviado. Aguarde a resposta do professor.')
  ).toBeVisible()
  await expect(
    studentPage.getByText('5 moedas reservadas em pedidos pendentes.')
  ).toBeVisible()
  await expect(
    studentPage.getByRole('button', { name: 'Cancelar pedido Poder barato' })
  ).toBeVisible()

  await teacherPage.reload()
  await teacherPage.getByRole('link', { name: 'Pedidos (1)' }).click()
  await teacherPage
    .getByRole('button', { name: /^Aprovar Poder barato/ })
    .click()
  await teacherPage
    .getByRole('alertdialog', { name: 'Aprovar pedido?' })
    .getByRole('button', { name: 'Aprovar' })
    .click()
  await expect(
    teacherPage.getByText('Pedido aprovado. As moedas foram descontadas.')
  ).toBeVisible()
  await expect(teacherPage.getByText('Nenhum pedido pendente')).toBeVisible()

  await teacherPage.getByRole('link', { name: 'Voltar à turma' }).click()
  await teacherPage
    .getByRole('link', { name: 'Histórico', exact: true })
    .click()
  await expect(teacherPage.getByText('Poder: Poder barato')).toBeVisible()

  await studentPage.reload()
  await expect(
    studentPage.getByRole('heading', { name: 'Pedidos pendentes' })
  ).toBeHidden()
  await expect(
    studentPage.getByRole('listitem').filter({ hasText: 'Poder barato' })
  ).toContainText('Moedas insuficientes')

  await studentContext.close()
})
