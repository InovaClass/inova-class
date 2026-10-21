import { redirect } from 'next/navigation'
import { describe, expect, test, vi } from 'vitest'
import { z } from 'zod'

import { ValidationError } from '@/infra/errors'
import { formAction, formSuccess } from '@/infra/form-action'

const formData = (entries: Record<string, string>) => {
  const data = new FormData()
  for (const [key, value] of Object.entries(entries)) data.set(key, value)
  return data
}

const submitted = formData({
  email: 'ana@',
  password: 'curta',
  $ACTION_ID_abc: ''
})

describe('formAction', () => {
  test('passes the submitted fields to the handler, without React entries', async () => {
    const handler = vi.fn(async () => formSuccess('Pronto.'))
    await formAction(submitted, handler)
    expect(handler).toHaveBeenCalledWith({ email: 'ana@', password: 'curta' })
  })

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

  test('echoes the submitted values except passwords', async () => {
    const state = await formAction(submitted, async () => {
      throw new ValidationError()
    })
    expect(state).toMatchObject({ values: { email: 'ana@' } })
    expect(state.status === 'error' && state.values).not.toHaveProperty(
      'password'
    )
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
