import { describe, expect, test } from 'vitest'

import { STUDENT_INVITE_LIST_MAX } from './constants'
import { inviteStudentsSchema } from './schema'

const parse = (students: string) => inviteStudentsSchema.safeParse({ students })

const line = (index: number) => `Aluno, aluno${index}@example.com`

const errorOf = (students: string) => parse(students).error?.issues[0]?.message

describe('inviteStudentsSchema', () => {
  test('reads one student per line with any of the separators', () => {
    expect(
      parse(
        'Maria Silva, maria@example.com\r\nJoão Souza;joao@example.com\n\nAna Lima\tana@example.com\n'
      ).data
    ).toEqual({
      students: [
        { name: 'Maria Silva', email: 'maria@example.com' },
        { name: 'João Souza', email: 'joao@example.com' },
        { name: 'Ana Lima', email: 'ana@example.com' }
      ]
    })
  })

  test('keeps a comma in the name and lowercases the email', () => {
    expect(parse('Silva, Maria, MARIA@Example.com').data).toEqual({
      students: [{ name: 'Silva, Maria', email: 'maria@example.com' }]
    })
  })

  test('points to the line of the first invalid student', () => {
    const list = 'Maria, maria@example.com\n\nJoão Souza'

    expect(errorOf(list)).toBe('Linha 3: use o formato nome, e-mail.')
    expect(errorOf(', ana@example.com')).toBe('Linha 1: informe o nome.')
    expect(errorOf('Ana, ana')).toBe('Linha 1: informe um e-mail válido.')
  })

  test('rejects the same email twice, whatever its case', () => {
    expect(errorOf('Ana, ana@example.com\nAna Lima, ANA@example.com')).toBe(
      'Linha 2: este e-mail já está na lista.'
    )
  })

  test('rejects an empty list and one over the limit', () => {
    const longest = Array.from(
      { length: STUDENT_INVITE_LIST_MAX },
      (_, index) => line(index)
    )

    expect(errorOf(' \n ')).toBe('Informe ao menos um aluno.')
    expect(parse(longest.join('\n')).success).toBe(true)
    expect(errorOf([...longest, line(-1)].join('\n'))).toBe(
      `Convide no máximo ${STUDENT_INVITE_LIST_MAX} alunos por vez.`
    )
  })
})
