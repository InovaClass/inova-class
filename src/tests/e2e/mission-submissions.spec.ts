import { expect, test } from '@playwright/test'

import { orchestrator } from '@/tests/orchestrator'

import { createClass } from './classes'
import { signUpTeacher } from './sign-up'

// The student's side, sending an objective, comes with the student mission view (#96)
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
