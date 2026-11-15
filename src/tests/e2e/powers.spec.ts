import { expect, type Page, test } from '@playwright/test'

import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH } from '@/models/class/constants'

import { createClass } from './classes'
import { pick } from './radio'
import { signUpStudent, signUpTeacher } from './sign-up'

const createPower = async (page: Page, name: string) => {
  await page.getByRole('link', { name: 'Novo poder' }).click()
  await pick(page, 'Classe', 'Mago')
  await page.getByLabel('Nome').fill(name)
  await page.getByLabel('Custo em moedas').fill('12')
  await page.getByRole('button', { name: 'Criar poder' }).click()
  await expect(page.getByRole('link', { name: `Editar ${name}` })).toBeVisible()
}

test('a teacher manages the powers and a student sees the ones of their character class', async ({
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

  await teacherPage.getByRole('link', { name: 'Poderes' }).click()
  await createPower(teacherPage, 'Poder rascunho')
  await teacherPage.getByRole('link', { name: 'Editar Poder rascunho' }).click()
  await teacherPage.getByLabel('Nome').fill('Poder do mago')
  await teacherPage.getByRole('button', { name: 'Salvar' }).click()
  await expect(
    teacherPage.getByRole('link', { name: 'Editar Poder do mago' })
  ).toBeVisible()

  await createPower(teacherPage, 'Poder escondido')
  await teacherPage
    .getByRole('button', { name: 'Desativar Poder escondido' })
    .click()
  await expect(
    teacherPage.getByRole('listitem').filter({ hasText: 'Poder escondido' })
  ).toContainText('Desativado')
  await expect(
    teacherPage.getByRole('button', { name: 'Reativar Poder escondido' })
  ).toBeVisible()

  await createPower(teacherPage, 'Poder removido')
  await teacherPage
    .getByRole('button', { name: 'Remover Poder removido' })
    .click()
  await teacherPage
    .getByRole('alertdialog', { name: 'Remover poder?' })
    .getByRole('button', { name: 'Remover' })
    .click()
  await expect(teacherPage.getByText('Poder removido.')).toBeVisible()
  await expect(
    teacherPage.getByRole('link', { name: 'Editar Poder removido' })
  ).toBeHidden()

  const studentContext = await browser.newContext()
  const studentPage = await studentContext.newPage()
  await signUpStudent(studentPage)
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
    studentPage.getByRole('heading', { name: 'Poderes' })
  ).toBeHidden()
  await pick(studentPage, 'Classe', 'Mago')
  await studentPage
    .getByRole('button', { name: 'Confirmar personagem' })
    .click()

  const powers = studentPage.getByRole('listitem')
  const unlockedPower = powers.filter({ hasText: 'Poder do mago' })
  await expect(unlockedPower).toContainText('Moedas insuficientes')
  await expect(unlockedPower).not.toContainText('a partir do nível')
  await expect(powers.filter({ hasText: 'Tema da prova' })).toContainText(
    'Disponível a partir do nível 4'
  )
  await expect(studentPage.getByText('Poder escondido')).toBeHidden()
  await expect(studentPage.getByText('Prazo extra')).toBeHidden()

  await studentContext.close()
})
