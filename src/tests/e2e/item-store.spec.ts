import { expect, test } from '@playwright/test'

import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH } from '@/models/class/constants'

import { createClass } from './classes'
import { pick } from './radio'
import { signUpStudent, signUpTeacher } from './sign-up'

test('a student buys and equips an item, and keeps it after the teacher closes the shop', async ({
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

  await teacherPage.getByRole('link', { name: 'Comportamentos' }).click()
  await teacherPage.getByRole('link', { name: 'Novo comportamento' }).click()
  await teacherPage.getByLabel('Nome').fill('Mesada')
  await teacherPage.getByLabel('Moedas', { exact: true }).fill('20')
  await teacherPage.getByRole('button', { name: 'Criar comportamento' }).click()
  await expect(
    teacherPage.getByRole('listitem').filter({ hasText: 'Mesada' })
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
  await pick(studentPage, 'Classe', 'Guerreiro')
  await studentPage
    .getByRole('button', { name: 'Confirmar personagem' })
    .click()
  await expect(studentPage.getByText('Personagem escolhido.')).toBeVisible()
  const bandana = studentPage
    .getByRole('listitem')
    .filter({ hasText: 'Bandana' })
  await expect(bandana).toContainText('Moedas insuficientes')
  await expect(
    studentPage.getByRole('listitem').filter({ hasText: 'Chapéu de mago' })
  ).toContainText('Só para Mago')

  await teacherPage.goto(classUrl)
  await teacherPage
    .getByRole('checkbox', { name: `Selecionar ${student.name}`, exact: false })
    .click()
  await teacherPage
    .getByRole('button', { name: 'Aplicar comportamento' })
    .click()
  await teacherPage
    .getByRole('dialog', { name: 'Aplicar comportamento' })
    .getByRole('button', { name: /Mesada/ })
    .click()
  await expect(
    teacherPage.getByText('Mesada: aplicado a 1 aluno.')
  ).toBeVisible()

  await studentPage.reload()
  await studentPage.getByRole('button', { name: 'Comprar Bandana' }).click()
  await studentPage
    .getByRole('alertdialog', { name: 'Comprar item?' })
    .getByRole('button', { name: 'Comprar' })
    .click()
  await expect(
    studentPage.getByText('Item comprado. Ele é seu em todas as turmas.')
  ).toBeVisible()
  await studentPage.getByRole('button', { name: 'Equipar Bandana' }).click()
  await expect(bandana).toContainText('Equipado')
  await expect(
    studentPage.getByRole('button', { name: 'Desequipar Bandana' })
  ).toBeVisible()

  await teacherPage.getByRole('link', { name: 'Recompensas' }).click()
  await teacherPage
    .getByRole('button', { name: 'Fechar loja de itens' })
    .click()
  await expect(
    teacherPage.getByRole('button', { name: 'Abrir loja de itens' })
  ).toBeVisible()

  await studentPage.reload()
  await expect(
    studentPage.getByText('O professor fechou a loja de itens nesta turma.')
  ).toBeVisible()
  await expect(bandana).toContainText('Equipado')
  await expect(
    studentPage.getByRole('listitem').filter({ hasText: 'Óculos redondos' })
  ).toBeHidden()

  await studentContext.close()
})
