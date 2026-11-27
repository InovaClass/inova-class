'use client'

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from '@/app/components/ui/8bit/empty'
import { FormCheckboxGroup } from '@/app/components/ui/custom/form-checkbox-group'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { useFormAction } from '@/app/hooks/use-form-action'
import type { FormState } from '@/entry/form-action'
import {
  type CompleteObjectiveInput,
  completeObjectiveSchema
} from '@/models/objective-submission/schema'

type CompleteObjectiveFormProps = {
  students: { id: string; label: string }[]
  action: (
    input: CompleteObjectiveInput
  ) => Promise<FormState<CompleteObjectiveInput>>
}

export const CompleteObjectiveForm = ({
  students,
  action
}: CompleteObjectiveFormProps) => {
  const { control, setValue, state, pending, announcement, formProps } =
    useFormAction({
      schema: completeObjectiveSchema,
      defaultValues: { studentIds: [] },
      action: async (input) => {
        const result = await action(input)
        // The completed students leave the list, so they can't stay selected
        if (result.status === 'success') setValue('studentIds', [])
        return result
      }
    })

  // The form stays mounted when the last students leave, so its message stays too
  if (students.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <FormMessage state={state} />
        <Empty className="p-0 md:p-0">
          <EmptyHeader>
            <EmptyTitle className="text-sm leading-relaxed">
              Nenhum aluno para concluir
            </EmptyTitle>
            <EmptyDescription className="text-xs leading-relaxed">
              Todos os alunos da turma já enviaram ou concluíram este objetivo.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <form {...formProps} className="flex flex-col gap-6">
      <FormCheckboxGroup
        control={control}
        name="studentIds"
        label="Alunos"
        options={students.map(({ id, label }) => ({ value: id, label }))}
      />
      <FormMessage state={state} announcement={announcement} />
      {/* The frame is drawn outside the button, so it needs room for it */}
      <div className="p-1.5">
        <SubmitButton pendingLabel="Concluindo" pending={pending}>
          Concluir
        </SubmitButton>
      </div>
    </form>
  )
}
