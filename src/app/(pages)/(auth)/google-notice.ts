import { formError } from '@/infra/form-action'
import { googleErrorFromCode } from '@/models/authentication-model/errors'

export const googleNoticeFrom = ({
  error,
  origem
}: Record<string, string | string[] | undefined>) =>
  origem === 'google' && typeof error === 'string'
    ? formError(googleErrorFromCode(error))
    : undefined
