import { unstable_rethrow } from 'next/navigation'
import { z } from 'zod'

import { AppError } from '@/infra/errors'

type FieldName<TValues> = keyof TValues & string

// A nested field goes by its dotted path, e.g. `links.0.url`
type FieldErrors<TValues> = Partial<
  Record<FieldName<TValues> | `${FieldName<TValues>}.${string}`, string>
>

export type FormState<TValues = Record<string, unknown>> =
  | { status: 'idle' }
  | {
      status: 'error'
      // A repeated identical error must still update the UI and the live region, so each result is unique
      id: string
      message?: string
      action?: string
      errors: FieldErrors<TValues>
    }
  | { status: 'success'; id: string; message: string }

export const formError = <TValues>(details: {
  message?: string
  action?: string
  errors?: FieldErrors<TValues>
}): FormState<TValues> => ({
  status: 'error',
  id: crypto.randomUUID(),
  message: details.message,
  action: details.action,
  errors: details.errors ?? {}
})

export const formSuccess = <TValues>(message: string): FormState<TValues> => ({
  status: 'success',
  id: crypto.randomUUID(),
  message
})

const fieldErrorsOf = (error: z.ZodError) => {
  const errors: Record<string, string> = {}
  for (const { path, message } of error.issues) {
    if (path.length > 0) errors[path.map(String).join('.')] ??= message
  }
  return errors
}

export const formAction = async <TInput>(
  input: TInput,
  handler: (input: TInput) => Promise<FormState<TInput>>
): Promise<FormState<TInput>> => {
  try {
    return await handler(input)
  } catch (error_) {
    // redirect() and notFound() work by throwing
    unstable_rethrow(error_)
    if (error_ instanceof z.ZodError) {
      return formError<TInput>({
        errors: fieldErrorsOf(error_) as FieldErrors<TInput>
      })
    }
    if (error_ instanceof AppError) {
      return formError<TInput>({
        message: error_.message,
        action: error_.action
      })
    }
    console.error(error_)
    return formError<TInput>({
      message: 'Ocorreu um erro inesperado.',
      action: 'Tente novamente em instantes.'
    })
  }
}
