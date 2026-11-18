import { afterEach, describe, expect, test } from 'vitest'

import { restoreLostFocus } from './restore-lost-focus'

const renderPage = () => {
  document.body.innerHTML =
    '<main><h1>Turma</h1><button id="buy">Comprar</button><button id="back">Voltar</button></main>'
  const byId = (id: string) => document.querySelector<HTMLElement>(`#${id}`)!
  return {
    buy: byId('buy'),
    back: byId('back'),
    heading: document.querySelector('h1')
  }
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('restoreLostFocus', () => {
  test('moves the focus to the page heading when the focused control was removed', () => {
    const { buy, heading } = renderPage()
    buy.focus()
    buy.remove()

    restoreLostFocus(buy)

    expect(document.activeElement).toBe(heading)
  })

  test('keeps the focus when the focused control is still on the page', () => {
    const { buy } = renderPage()
    buy.focus()

    restoreLostFocus(buy)

    expect(document.activeElement).toBe(buy)
  })

  test('keeps the focus when it already moved to another control', () => {
    const { buy, back } = renderPage()
    buy.remove()
    back.focus()

    restoreLostFocus(buy)

    expect(document.activeElement).toBe(back)
  })
})
