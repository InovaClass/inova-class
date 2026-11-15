import { expect, type Page } from '@playwright/test'

// A click before hydration does nothing on a Base UI radio, so a checked one proves the form is ready
export const pick = async (page: Page, group: string, option: string) => {
  const radio = page
    .getByRole('radiogroup', { name: group, exact: true })
    .getByRole('radio', { name: option, exact: true })
  await expect(async () => {
    await radio.click()
    await expect(radio).toBeChecked({ timeout: 1000 })
  }).toPass()
}
