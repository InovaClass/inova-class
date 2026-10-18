import { expect, test } from '@playwright/test'

test('renders a heading', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})
