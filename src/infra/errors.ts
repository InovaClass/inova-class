type AppErrorOptions = {
  message?: string
  action?: string
  cause?: unknown
}

// Errors the user can act on: `message` says what happened and `action` what to do next, both
// shown as they are, so they're written for the user (pt-BR)
export abstract class AppError extends Error {
  readonly action: string

  constructor(
    { message, action, cause }: AppErrorOptions,
    defaults: Required<Pick<AppErrorOptions, 'message' | 'action'>>
  ) {
    super(message ?? defaults.message, { cause })
    this.action = action ?? defaults.action
  }
}

export class ValidationError extends AppError {
  readonly name = 'ValidationError'

  constructor(options: AppErrorOptions = {}) {
    super(options, {
      message: 'Os dados enviados não são válidos.',
      action: 'Ajuste os dados e tente novamente.'
    })
  }
}

export class UnauthorizedError extends AppError {
  readonly name = 'UnauthorizedError'

  constructor(options: AppErrorOptions = {}) {
    super(options, {
      message: 'Não foi possível confirmar sua identidade.',
      action: 'Entre novamente para continuar.'
    })
  }
}
