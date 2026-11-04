'use client'

import { Textarea } from '@/app/components/ui/8bit/textarea'
import { FieldFrame } from '@/app/components/ui/custom/form-field'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { useFormAction } from '@/app/hooks/use-form-action'
import { STUDENT_INVITE_LIST_MAX } from '@/models/student/constants'
import { inviteStudentsSchema } from '@/models/student/schema'

import { inviteStudents } from './action'

export const InviteStudentsForm = ({ classId }: { classId: string }) => {
  const { field, state, pending, announcement, formProps } = useFormAction({
    schema: inviteStudentsSchema,
    defaultValues: { students: '' },
    action: inviteStudents.bind(null, classId)
  })
  const { error, ...students } = field('students')

  // Sending the same list again would replace the links just emailed
  if (state.status === 'success') return <FormMessage state={state} />

  return (
    <form {...formProps} className="flex flex-col gap-6">
      <FieldFrame
        label="Alunos"
        hint={`Um aluno por linha, no formato nome, e-mail. Até ${STUDENT_INVITE_LIST_MAX} por vez.`}
        error={error}
      >
        {(control) => (
          // The pixel frame is drawn 1.5 spacing units outside the textarea; the margin makes room for it
          <Textarea
            className="my-1.5"
            placeholder="Maria Silva, maria@exemplo.com"
            spellCheck={false}
            {...students}
            {...control}
          />
        )}
      </FieldFrame>
      <FormMessage state={state} announcement={announcement} />
      <SubmitButton pending={pending}>Enviar convites</SubmitButton>
    </form>
  )
}
