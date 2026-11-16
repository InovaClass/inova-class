import { expect, test } from '@playwright/test'

import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH } from '@/models/class/constants'

import { createClass } from './classes'
import { signUpStudent, signUpTeacher } from './sign-up'

test('a student buys a reward, the teacher cancels it with a refund and delivers the next one', async ({
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
  await teacherPage.getByLabel('Estoque (opcional)').fill('1')
  await teacherPage.getByRole('button', { name: 'Criar recompensa' }).click()
  await expect(
    teacherPage.getByRole('listitem').filter({ hasText: 'Figurinha' })
  ).toContainText('1 unidade em estoque')

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
    studentPage.getByRole('listitem').filter({ hasText: 'Figurinha' })
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
  await studentPage.getByRole('button', { name: 'Comprar Figurinha' }).click()
  await studentPage
    .getByRole('alertdialog', { name: 'Comprar recompensa?' })
    .getByRole('button', { name: 'Comprar' })
    .click()
  await expect(
    studentPage.getByText('Recompensa comprada. Aguarde o professor entregar.')
  ).toBeVisible()
  await expect(
    studentPage.getByRole('listitem').filter({ hasText: 'Figurinha' }).first()
  ).toContainText('Esgotada')
  await expect(studentPage.getByText('Aguardando entrega')).toBeVisible()

  await teacherPage.reload()
  await teacherPage.getByRole('link', { name: 'Entregas (1)' }).click()
  await teacherPage.getByRole('button', { name: /^Cancelar Figurinha/ }).click()
  await teacherPage
    .getByRole('alertdialog', { name: 'Cancelar pedido?' })
    .getByRole('button', { name: 'Cancelar pedido' })
    .click()
  await expect(
    teacherPage.getByText('Pedido cancelado. As moedas voltaram para o aluno.')
  ).toBeVisible()
  await expect(teacherPage.getByText('Nenhuma entrega pendente')).toBeVisible()

  await studentPage.reload()
  await expect(
    studentPage.getByText('Cancelado, moedas devolvidas')
  ).toBeVisible()
  await studentPage.getByRole('button', { name: 'Comprar Figurinha' }).click()
  await studentPage
    .getByRole('alertdialog', { name: 'Comprar recompensa?' })
    .getByRole('button', { name: 'Comprar' })
    .click()
  await expect(
    studentPage.getByText('Recompensa comprada. Aguarde o professor entregar.')
  ).toBeVisible()

  await teacherPage.reload()
  await teacherPage.getByRole('button', { name: /^Entregar Figurinha/ }).click()
  await expect(teacherPage.getByText('Recompensa entregue.')).toBeVisible()

  await teacherPage.getByRole('link', { name: 'Voltar à turma' }).click()
  await teacherPage
    .getByRole('link', { name: 'Histórico', exact: true })
    .click()
  await expect(
    teacherPage.getByText('Reembolso de recompensa: Figurinha')
  ).toBeVisible()
  await expect(
    teacherPage.getByText('Compra de recompensa: Figurinha')
  ).toHaveCount(2)

  await studentPage.reload()
  await expect(studentPage.getByText('Entregue', { exact: true })).toBeVisible()

  await studentContext.close()
})
