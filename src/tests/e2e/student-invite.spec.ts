import { expect, test } from '@playwright/test'

import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH } from '@/models/class/constants'
import { orchestrator } from '@/tests/orchestrator'

import { createClass } from './classes'
import { signUpTeacher } from './sign-up'

test('a teacher invites a student, who creates a password and lands in the class', async ({
  page,
  browser
}) => {
  // Two accounts, plus routes compiled by `pnpm dev` on their first request
  test.slow()
  await signUpTeacher(page)
  const { name: className } = await createClass(page)
  const student = orchestrator.newUser()

  await page.getByRole('link', { name: 'Convidar alunos' }).click()
  const list = page.getByLabel('Alunos')
  await list.fill(student.name)
  await page.getByRole('button', { name: 'Enviar convites' }).click()
  await expect(list).toHaveAccessibleDescription(
    /Linha 1: use o formato nome, e-mail\./
  )
  await list.fill(`${student.name}, ${student.email}`)
  await page.getByRole('button', { name: 'Enviar convites' }).click()
  await expect(page.getByText(/Lista recebida com 1 aluno\./)).toBeVisible()

  const context = await browser.newContext()
  const studentPage = await context.newPage()
  const link = await orchestrator.waitForLinkSentTo(student.email, {
    subject: 'Crie sua senha'
  })
  await studentPage.goto(link.toString())
  await expect(studentPage.getByText(/Seu nome de usuário é/)).toBeVisible()
  await studentPage.getByLabel('Senha', { exact: true }).fill(student.password)
  await studentPage.getByLabel('Confirmar senha').fill(student.password)
  await studentPage.getByRole('checkbox', { name: /^Li e aceito/ }).click()
  await studentPage.getByRole('button', { name: 'Criar senha' }).click()
  await expect(studentPage).toHaveURL('/aluno')

  await studentPage.goto(link.toString())
  await expect(
    studentPage.getByText('Este convite é inválido ou expirou.')
  ).toBeVisible()

  await page.getByRole('link', { name: 'Voltar à turma' }).click()
  const joinCode = await page
    .getByText(new RegExp(`^[${JOIN_CODE_ALPHABET}]{${JOIN_CODE_LENGTH}}$`))
    .textContent()
  await studentPage.goto('/aluno')
  await expect(async () => {
    await studentPage.getByLabel('Código da turma').fill(joinCode ?? '')
    await studentPage.getByRole('button', { name: 'Entrar na turma' }).click()
    await expect(
      studentPage.getByText(`Você já está na turma ${className}.`)
    ).toBeVisible({ timeout: 2000 })
  }).toPass()
  await context.close()
})
