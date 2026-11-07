'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { type SubmitEvent, useState, useTransition } from 'react'
import {
  type DefaultValues,
  type FieldError,
  type FieldValues,
  get,
  type Path,
  type Resolver,
  useForm
} from 'react-hook-form'
import type { z } from 'zod'

import type { FormState } from '@/entry/form-action'

// TState lets an action return more than the form renders, e.g. the email to resend a link to
type FormActionOptions<
  TValues extends FieldValues,
  TState extends FormState<TValues>
> = {
  schema: z.ZodType<unknown, TValues>
  defaultValues: DefaultValues<TValues>
  action: (input: TValues) => Promise<TState>
  initialState?: TState
}

type FieldOptions<TValues extends FieldValues> = {
  // RHF validates one field at a time, and its own `deps` would reveal an error on a field that
  // wasn't visited yet
  revalidates?: Path<TValues> | Path<TValues>[]
}

type Announcement = { id: string; text: string }

const firstMessageOf = (errors: object): string | undefined => {
  // A leaf also carries `ref`, a DOM element the search must not walk into. A string `type` tells a
  // leaf from a field that happens to be named `type`
  if ('type' in errors && typeof errors.type === 'string') {
    return 'message' in errors && typeof errors.message === 'string'
      ? errors.message
      : undefined
  }
  for (const value of Object.values(errors) as unknown[]) {
    const message =
      value && typeof value === 'object' ? firstMessageOf(value) : undefined
    if (message) return message
  }
}

export const useFormAction = <
  TValues extends FieldValues,
  TState extends FormState<TValues> = FormState<TValues>
>({
  schema,
  defaultValues,
  action,
  initialState
}: FormActionOptions<TValues, TState>) => {
  const [pending, startTransition] = useTransition()
  const [state, setState] = useState<TState | FormState<TValues>>(
    initialState ?? { status: 'idle' }
  )
  const [announcement, setAnnouncement] = useState<Announcement>()

  const form = useForm<TValues>({
    // `raw` hands the action the input as typed: the model parses it again
    resolver: zodResolver(schema, undefined, {
      raw: true
    }) as unknown as Resolver<TValues>,
    defaultValues,
    mode: 'onTouched'
  })
  const { errors } = form.formState

  const showServerErrors = (id: string, fieldErrors: object) => {
    const entries = Object.entries(fieldErrors) as [Path<TValues>, string][]
    for (const [index, [name, message]] of entries.entries()) {
      form.setError(
        name,
        { type: 'server', message },
        { shouldFocus: index === 0 }
      )
    }
    const first = entries[0]
    if (first) setAnnouncement({ id, text: first[1] })
  }

  const field = (
    name: Path<TValues>,
    { revalidates }: FieldOptions<TValues> = {}
  ) => ({
    ...form.register(name, {
      onChange: () => {
        const names =
          typeof revalidates === 'string' ? [revalidates] : (revalidates ?? [])
        const visited = names.filter((other) => {
          const { isTouched, invalid } = form.getFieldState(other)
          return isTouched || invalid
        })
        if (visited.length > 0) void form.trigger(visited)
      }
    }),
    error: (get(errors, name) as FieldError | undefined)?.message
  })

  const onSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    // RHF only marks the form as submitted when handleSubmit resolves. Before that, focusing a field
    // the server rejected would revalidate the one it leaves on blur, erasing that field's server
    // error
    const values = (await form.handleSubmit(
      (validValues) => validValues,
      (fieldErrors) => {
        setState({ status: 'idle' })
        const text = firstMessageOf(fieldErrors)
        if (text) setAnnouncement({ id: crypto.randomUUID(), text })
      }
    )(event)) as TValues | undefined
    if (!values) return

    setAnnouncement(undefined)
    // redirect() rejects the action's promise, and only a transition takes it to the RedirectBoundary
    startTransition(async () => {
      const result = await action(values)
      setState(result)
      if (result.status === 'error') showServerErrors(result.id, result.errors)
    })
  }

  return {
    field,
    control: form.control,
    state,
    pending,
    announcement,
    formProps: {
      // A click before hydration posts natively: the default GET would put the password in the URL
      method: 'post',
      noValidate: true,
      onSubmit
    }
  }
}
