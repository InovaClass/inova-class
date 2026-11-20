import { expect, test } from '@playwright/test'

test('an unknown address shows the not-found page', async ({ page }) => {
  const response = await page.goto('/rota-inexistente')
  expect(response?.status()).toBe(404)
  await expect(
    page.getByRole('heading', { name: 'Página não encontrada' })
  ).toBeVisible()

  await page.getByRole('link', { name: 'Voltar ao início' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Sua turma em uma aventura' })
  ).toBeVisible()
})
