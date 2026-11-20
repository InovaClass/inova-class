import { Card, CardHeader } from '@/app/components/ui/8bit/card'
import { ConfirmActionDialog } from '@/app/components/ui/custom/confirm-action-dialog'
import { CardContent, CardTitle } from '@/app/components/ui/shadcn/card'
import type { UserRole } from '@/constants/user'

import { deleteAccountWithoutPassword } from './delete-account-action'
import { DeleteAccountForm } from './delete-account-form'

type DeleteAccountSectionProps = {
  role: UserRole
  summary: { hasPassword: boolean; classCount: number; studentCount?: number }
}

const plural = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`

const teacherClassesOf = (classCount: number) =>
  classCount === 1 ? 'sua turma' : `suas ${classCount} turmas`

const teacherConsequences = (classCount: number, studentCount: number) =>
  `${
    classCount === 0
      ? 'Sua conta será apagada para sempre.'
      : `Sua conta e ${teacherClassesOf(classCount)}, com o progresso de ${plural(studentCount, 'aluno', 'alunos')}, serão apagadas para sempre.`
  } Os alunos que você convidou e que ainda não ativaram a conta também serão excluídos.`

const studentConsequences = (classCount: number) =>
  classCount === 0
    ? 'Sua conta e seus itens serão apagados para sempre.'
    : `Sua conta, seu progresso em ${plural(classCount, 'turma', 'turmas')} e seus itens serão apagados para sempre.`

const consequencesOf = (
  role: UserRole,
  { classCount, studentCount = 0 }: DeleteAccountSectionProps['summary']
) =>
  role === 'teacher'
    ? teacherConsequences(classCount, studentCount)
    : studentConsequences(classCount)

export const DeleteAccountSection = ({
  role,
  summary
}: DeleteAccountSectionProps) => {
  const consequences = consequencesOf(role, summary)

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>
          <h2 className="text-sm leading-relaxed">Excluir conta</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <p className="text-xs leading-relaxed">
          {consequences} Não é possível desfazer.
        </p>
        {summary.hasPassword ? (
          <DeleteAccountForm />
        ) : (
          // The frame is drawn outside the button, so it needs room for it
          <div className="p-1.5">
            <ConfirmActionDialog
              triggerLabel="Excluir conta"
              title="Excluir conta?"
              description={`${consequences} Não é possível desfazer.`}
              confirmLabel="Excluir conta"
              action={deleteAccountWithoutPassword}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
