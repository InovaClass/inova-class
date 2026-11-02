import { formError } from '@/entry/form-action'
import { googleErrorFromCode } from '@/models/authentication/errors'

export const googleNoticeFrom = ({
  error,
  origem
}: Record<string, string | string[] | undefined>) =>
  origem === 'google' && typeof error === 'string'
    ? formError(googleErrorFromCode(error))
    : undefined
