import { z } from 'zod'

import { STUDENT_INVITE_LIST_MAX } from '@/constants/student'
import { NAME_MAX_LENGTH } from '@/constants/user'

// Imported by the client forms too, so it must not import anything server-only

// Splits at the last separator, since an email has none. A tab comes from pasting a spreadsheet
const LINE_PATTERN = /^(.*)[,;\t]([^,;\t]*)$/

type InvitedStudent = { name: string; email: string }

const parseLine = (line: string): InvitedStudent | string => {
  const match = LINE_PATTERN.exec(line)
  if (!match) return 'use o formato nome, e-mail.'
  const [, rawName, rawEmail] = match
  const name = rawName!.trim()
  if (!name) return 'informe o nome.'
  if (name.length > NAME_MAX_LENGTH) {
    return `o nome pode ter no máximo ${NAME_MAX_LENGTH} caracteres.`
  }
  const email = rawEmail!.trim().toLowerCase()
  if (!z.email().safeParse(email).success) return 'informe um e-mail válido.'
  return { name, email }
}

export const inviteStudentsSchema = z.object({
  students: z.string().transform((text, context): InvitedStudent[] => {
    const addIssue = (message: string) => {
      context.issues.push({ code: 'custom', message, input: text })
      return z.NEVER
    }
    const lines = text
      .split(/\r?\n/)
      .map((line, index) => ({ number: index + 1, line: line.trim() }))
      .filter(({ line }) => line)
    if (lines.length === 0) return addIssue('Informe ao menos um aluno.')
    if (lines.length > STUDENT_INVITE_LIST_MAX) {
      return addIssue(
        `Convide no máximo ${STUDENT_INVITE_LIST_MAX} alunos por vez.`
      )
    }

    const students: InvitedStudent[] = []
    const seenEmails = new Set<string>()
    for (const { number, line } of lines) {
      const student = parseLine(line)
      if (typeof student === 'string') {
        return addIssue(`Linha ${number}: ${student}`)
      }
      if (seenEmails.has(student.email)) {
        return addIssue(`Linha ${number}: este e-mail já está na lista.`)
      }
      seenEmails.add(student.email)
      students.push(student)
    }
    return students
  })
})
export type InviteStudentsInput = z.input<typeof inviteStudentsSchema>
