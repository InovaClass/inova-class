import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { z } from 'zod'

import { FormField } from '@/app/components/ui/custom/form-field'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { formError, type FormState, formSuccess } from '@/entry/form-action'

import { useFormAction } from './use-form-action'

const schema = z.object({
  name: z.string().min(1, 'Informe o nome.'),
  email: z.string().min(1, 'Informe o e-mail.')
})

type Values = z.input<typeof schema>
type Action = (input: Values) => Promise<FormState<Values>>

const TestForm = ({ action }: { action: Action }) => {
  const { field, state, pending, announcement, formProps } = useFormAction({
    schema,
    defaultValues: { name: '', email: '' },
    action
  })

  return (
    <form {...formProps}>
      <FormField label="Nome" {...field('name')} />
      <FormField label="E-mail" {...field('email')} />
      <FormMessage state={state} announcement={announcement} />
      <SubmitButton pending={pending}>Enviar</SubmitButton>
    </form>
  )
}

const answerWithFieldErrors =
  (errors: Partial<Values>): Action =>
  async () =>
    formError<Values>({ errors })

const setup = (action: Action) => {
  const user = userEvent.setup()
  render(<TestForm action={action} />)
  return {
    user,
    name: screen.getByRole('textbox', { name: 'Nome' }),
    email: screen.getByRole('textbox', { name: 'E-mail' }),
    submit: screen.getByRole('button', { name: 'Enviar' }),
    liveRegion: document.querySelector('[aria-live="polite"]')!
  }
}

describe('useFormAction', () => {
  test('submits the typed values', async () => {
    const action = vi.fn<Action>(async () => formSuccess('Pronto.'))
    const { user, name, email, submit, liveRegion } = setup(action)

    await user.type(name, 'Ana')
    await user.type(email, 'ana@inova.class')
    await user.click(submit)

    await waitFor(() => expect(liveRegion.textContent).toBe('Pronto.'))
    expect(action).toHaveBeenCalledWith({
      name: 'Ana',
      email: 'ana@inova.class'
    })
  })

  test('moves the focus to the first invalid field instead of submitting', async () => {
    const action = vi.fn<Action>(async () => formSuccess('Pronto.'))
    const { user, name, email, submit } = setup(action)

    await user.type(email, 'ana@inova.class')
    await user.click(submit)

    await waitFor(() => expect(document.activeElement).toBe(name))
    expect(name.getAttribute('aria-invalid')).toBe('true')
    expect(action).not.toHaveBeenCalled()
  })

  test('moves the focus to the first field the server rejected and announces it', async () => {
    const { user, name, email, submit, liveRegion } = setup(
      answerWithFieldErrors({ email: 'E-mail em uso.' })
    )

    await user.type(name, 'Ana')
    await user.type(email, 'ana@inova.class')
    await user.click(submit)

    await waitFor(() => expect(document.activeElement).toBe(email))
    expect(email.getAttribute('aria-invalid')).toBe('true')
    expect(liveRegion.textContent).toBe('E-mail em uso.')
  })

  test('hides a server error once its field is edited and keeps the others', async () => {
    const { user, name, email, submit } = setup(
      answerWithFieldErrors({ name: 'Nome em uso.', email: 'E-mail em uso.' })
    )

    await user.type(name, 'Ana')
    await user.type(email, 'ana@inova.class')
    await user.click(submit)
    await screen.findByRole('textbox', {
      name: 'Nome',
      description: 'Nome em uso.'
    })

    await user.type(name, 'Maria')

    await screen.findByRole('textbox', { name: 'Nome', description: '' })
    expect(
      screen.getByRole('textbox', {
        name: 'E-mail',
        description: 'E-mail em uso.'
      })
    ).toBe(email)
  })

  test('announces the first field error again on a repeated rejection', async () => {
    const { user, submit, liveRegion } = setup(answerWithFieldErrors({}))

    await user.click(submit)
    await waitFor(() => expect(liveRegion.textContent).toBe('Informe o nome.'))
    const firstAnnouncement = liveRegion.firstElementChild

    await user.click(submit)

    await waitFor(() =>
      expect(liveRegion.firstElementChild).not.toBe(firstAnnouncement)
    )
    expect(liveRegion.textContent).toBe('Informe o nome.')
  })

  test('replaces the previous answer with a later client-side rejection', async () => {
    const { user, name, email, submit, liveRegion } = setup(async () =>
      formError<Values>({ message: 'Dados incorretos.' })
    )

    await user.type(name, 'Ana')
    await user.type(email, 'ana@inova.class')
    await user.click(submit)
    await waitFor(() =>
      expect(liveRegion.textContent).toBe('Dados incorretos.')
    )

    await user.clear(email)
    await user.click(submit)

    await waitFor(() =>
      expect(liveRegion.textContent).toBe('Informe o e-mail.')
    )
    expect(document.activeElement).toBe(email)
  })

  test('keeps the focus on the field while the submit button is pressed', async () => {
    const { user, email, submit } = setup(answerWithFieldErrors({}))

    await user.type(email, 'a')
    await user.clear(email)
    await user.pointer({ keys: '[MouseLeft>]', target: submit })

    expect(document.activeElement).toBe(email)
    expect(
      screen.getByRole('textbox', { name: 'E-mail', description: '' })
    ).toBe(email)
  })
})

const passwordSchema = z
  .object({ password: z.string(), confirmation: z.string() })
  .refine((data) => data.password === data.confirmation, {
    message: 'As senhas não coincidem.',
    path: ['confirmation']
  })

type PasswordValues = z.input<typeof passwordSchema>

const PasswordForm = () => {
  const { field, formProps } = useFormAction({
    schema: passwordSchema,
    defaultValues: { password: '', confirmation: '' },
    action: async (): Promise<FormState<PasswordValues>> => ({ status: 'idle' })
  })

  return (
    <form {...formProps}>
      <FormField
        label="Senha"
        {...field('password', { revalidates: 'confirmation' })}
      />
      <FormField label="Confirmação" {...field('confirmation')} />
    </form>
  )
}

describe('useFormAction with a field that depends on another', () => {
  test('revalidates it when the other changes, without revealing an error before its visit', async () => {
    const user = userEvent.setup()
    render(<PasswordForm />)
    const password = screen.getByRole('textbox', { name: 'Senha' })
    const confirmation = screen.getByRole('textbox', { name: 'Confirmação' })

    await user.type(password, 'senha123')
    await user.tab()
    expect(confirmation.getAttribute('aria-invalid')).toBeNull()

    await user.type(confirmation, 'senha123')
    await user.tab()
    await user.type(password, '4')

    await screen.findByRole('textbox', {
      name: 'Confirmação',
      description: 'As senhas não coincidem.'
    })
  })
})

const linkSchema = z.object({ url: z.string().min(1, 'Informe o link.') })

const listSchema = z.object({ links: z.array(linkSchema) })

type ListValues = z.input<typeof listSchema>
type ListAction = (input: ListValues) => Promise<FormState<ListValues>>

const ListForm = ({ action }: { action: ListAction }) => {
  const { field, state, pending, announcement, formProps } = useFormAction({
    schema: listSchema,
    defaultValues: { links: [{ url: '' }, { url: '' }] },
    action
  })

  return (
    <form {...formProps}>
      <FormField label="Primeiro link" {...field('links.0.url')} />
      <FormField label="Segundo link" {...field('links.1.url')} />
      <FormMessage state={state} announcement={announcement} />
      <SubmitButton pending={pending}>Salvar</SubmitButton>
    </form>
  )
}

const setupList = (action: ListAction) => {
  const user = userEvent.setup()
  render(<ListForm action={action} />)
  return {
    user,
    first: screen.getByRole('textbox', { name: 'Primeiro link' }),
    second: screen.getByRole('textbox', { name: 'Segundo link' }),
    submit: screen.getByRole('button', { name: 'Salvar' }),
    liveRegion: document.querySelector('[aria-live="polite"]')!
  }
}

describe('useFormAction with a list of fields', () => {
  test('focuses and announces an invalid item after a valid one', async () => {
    const { user, first, second, submit, liveRegion } = setupList(async () =>
      formSuccess('Pronto.')
    )

    await user.type(first, 'https://inova.class')
    await user.click(submit)

    await waitFor(() => expect(document.activeElement).toBe(second))
    expect(liveRegion.textContent).toBe('Informe o link.')
  })

  test('focuses and announces the item the server rejected', async () => {
    const { user, first, second, submit, liveRegion } = setupList(async () =>
      formError<ListValues>({ errors: { 'links.1.url': 'Link fora do ar.' } })
    )

    await user.type(first, 'https://inova.class')
    await user.type(second, 'https://inova.class/fora')
    await user.click(submit)

    await waitFor(() => expect(document.activeElement).toBe(second))
    expect(liveRegion.textContent).toBe('Link fora do ar.')
  })
})
