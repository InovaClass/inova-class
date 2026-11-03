import { redirect } from 'next/navigation'
import { describe, expect, test, vi } from 'vitest'
import { z } from 'zod'

import { ValidationError } from '@/infra/errors'

import { formAction, formSuccess } from './form-action'

const submitted = { email: 'ana@', password: 'curta' }

describe('formAction', () => {
  test('turns a Zod error into the first message of each field', async () => {
    const schema = z.object({
      email: z.email('Informe um e-mail válido.'),
      password: z.string().min(8, 'Senha curta.').max(1, 'Nunca chega aqui.')
    })
    const state = await formAction(submitted, async (input) => {
      schema.parse(input)
      return formSuccess('Pronto.')
    })
    expect(state).toMatchObject({
      status: 'error',
      errors: { email: 'Informe um e-mail válido.', password: 'Senha curta.' }
    })
  })

  test("keeps a nested field's dotted path", async () => {
    const linkSchema = z.object({ url: z.url('Informe um link válido.') })
    const schema = z.object({ links: z.array(linkSchema) })
    const input = { links: [{ url: 'https://inova.class' }, { url: 'ana' }] }
    const state = await formAction(input, async (value) => {
      schema.parse(value)
      return formSuccess('Pronto.')
    })
    expect(state).toMatchObject({
      status: 'error',
      errors: { 'links.1.url': 'Informe um link válido.' }
    })
  })

  test("turns an app error into the form's message and action", async () => {
    const state = await formAction(submitted, async () => {
      throw new ValidationError({
        message: 'Turma cheia.',
        action: 'Escolha outra turma.'
      })
    })
    expect(state).toMatchObject({
      status: 'error',
      message: 'Turma cheia.',
      action: 'Escolha outra turma.',
      errors: {}
    })
  })

  test('hides an unexpected error behind a generic message', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const state = await formAction(submitted, async () => {
      throw new Error('connection refused')
    })
    expect(state).toMatchObject({
      status: 'error',
      message: 'Ocorreu um erro inesperado.'
    })
    expect(log).toHaveBeenCalled()
    log.mockRestore()
  })

  test('lets redirect() through', async () => {
    await expect(
      formAction(submitted, async () => redirect('/'))
    ).rejects.toThrow('NEXT_REDIRECT')
  })
})
