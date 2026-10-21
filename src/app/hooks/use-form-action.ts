'use client'

import { useForm, useSelector } from '@tanstack/react-form'
import {
  type ChangeEvent,
  type FocusEvent,
  type ReactNode,
  startTransition,
  type SubmitEvent,
  useActionState,
  useEffect,
  useRef,
  useState
} from 'react'
import type { z } from 'zod'

import {
  ActionField,
  type ActionFieldProps,
  ActionForm,
  type ActionFormFields,
  type TextFieldApi
} from '@/app/components/ui/custom/action-form'
import type { FormState } from '@/infra/form-action'

type FormActionOptions<TSchema extends z.ZodObject> = {
  schema: TSchema
  defaultValues: z.input<TSchema>
  action: (
    state: FormState<z.input<TSchema>>,
    formData: FormData
  ) => Promise<FormState<z.input<TSchema>>>
  initialState?: FormState<z.input<TSchema>>
}

type Errors = Record<string, string | undefined>

const NO_ERRORS: Errors = {}

// TanStack stores whatever the validator returned: a string, a Standard Schema issue or a list
const messageOf = (error: unknown): string | undefined => {
  if (typeof error === 'string') return error
  if (Array.isArray(error))
    return error.map((item) => messageOf(item)).find(Boolean)
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
}

export const useFormAction = <TSchema extends z.ZodObject>({
  schema,
  defaultValues,
  action,
  initialState = { status: 'idle' }
}: FormActionOptions<TSchema>) => {
  const [state, dispatch, pending] = useActionState(action, initialState)
  const [invalidSubmit, setInvalidSubmit] = useState<{
    id: string
    errors: Errors
  }>()
  // A server error describes the submitted value, so it hides once its field is edited
  const [editedAfter, setEditedAfter] = useState<Record<string, string>>({})
  const formElement = useRef<HTMLFormElement>(null)
  const serverErrors: Errors =
    state.status === 'error' ? state.errors : NO_ERRORS

  const form = useForm({
    defaultValues: {
      ...defaultValues,
      ...(state.status === 'error' && state.values)
    },
    // Every change revalidates the whole form, so errors never go stale; they're only shown once
    // the field was left or the form submitted
    // TanStack can't prove that a generic schema validates synchronously
    validators: { onChange: schema as never },
    onSubmit: ({ value }) => {
      setInvalidSubmit(undefined)
      const formData = new FormData()
      for (const [name, fieldValue] of Object.entries(value)) {
        formData.set(name, String(fieldValue))
      }
      startTransition(() => dispatch(formData))
    },
    onSubmitInvalid: ({ formApi }) => {
      const fields = formApi.getAllErrors().fields as Record<
        string,
        { errors: unknown[] }
      >
      setInvalidSubmit({
        id: crypto.randomUUID(),
        errors: Object.fromEntries(
          Object.entries(fields).map(([name, { errors }]) => [
            name,
            messageOf(errors)
          ])
        )
      })
    }
  })
  const submitted = useSelector(
    form.store,
    (formState) => formState.submissionAttempts > 0
  )

  // The latest submit wins: a client-side rejection, or else the Server Action's answer
  const errors = invalidSubmit?.errors ?? serverErrors
  const submitId =
    invalidSubmit?.id ?? (state.status === 'idle' ? undefined : state.id)
  // The schema's key order is the fields' order on screen
  const firstMessage = Object.keys(schema.shape)
    .map((name) => errors[name])
    .find(Boolean)

  // Runs after the commit, so the field already carries aria-invalid and its error description
  // when the focus reaches it
  useEffect(() => {
    if (!submitId) return
    const element = [...(formElement.current?.elements ?? [])].find(
      (element) => element instanceof HTMLInputElement && errors[element.name]
    )
    if (element instanceof HTMLElement) element.focus()
  }, [submitId, errors])

  const fieldProps = (field: TextFieldApi) => {
    const clientError =
      submitted || field.state.meta.isBlurred
        ? messageOf(field.state.meta.errors)
        : undefined
    const serverError =
      state.status !== 'idle' && editedAfter[field.name] === state.id
        ? undefined
        : serverErrors[field.name]

    return {
      name: field.name,
      value: field.state.value as string,
      error: clientError ?? serverError,
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        if (state.status !== 'idle') {
          setEditedAfter((edited) => ({ ...edited, [field.name]: state.id }))
        }
        field.handleChange(event.target.value)
      },
      onBlur: (event: FocusEvent<HTMLInputElement>) => {
        // Revealing errors on the way to the submit button would move it under the pointer, and
        // the submit reveals them anyway
        const next = event.relatedTarget
        if (next instanceof HTMLButtonElement && next.type === 'submit') return
        field.handleBlur()
      }
    }
  }

  const fields: ActionFormFields = {
    Field: form.Field as unknown as ActionFormFields['Field'],
    fieldProps
  }

  return {
    Form: ActionForm,
    // The same component, with `name` narrowed to the schema's fields
    Field: ActionField as (
      props: ActionFieldProps<keyof z.input<TSchema> & string>
    ) => ReactNode,
    state,
    pending,
    announcement:
      submitId && firstMessage
        ? { id: submitId, text: firstMessage }
        : undefined,
    formProps: {
      fields,
      ref: formElement,
      // Without JavaScript the browser posts straight to the Server Action, which validates the
      // same schema; with it, the submit is intercepted to validate on the client first
      action: dispatch,
      noValidate: true,
      onSubmit: (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault()
        void form.handleSubmit()
      }
    }
  }
}
