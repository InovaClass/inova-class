import { describe, expect, test } from 'vitest'

import { USERNAME_MAX_LENGTH, USERNAME_PATTERN } from '@/constants/user'

import { generateUsername } from './username'

const generate = (name: string, taken: string[] = []) =>
  generateUsername(name, new Set(taken))

describe('generateUsername', () => {
  test('joins the first and the last name, without accents or symbols', () => {
    expect(generate('Maria da Conceição Araújo')).toBe('maria.araujo')
    expect(generate("  João   D'Ávila-Neto ")).toBe('joao.davilaneto')
    expect(generate('Cauã')).toBe('caua')
  })

  test('falls back when the name leaves too few valid characters', () => {
    expect(generate('Bo')).toBe('aluno')
    expect(generate('李雷')).toBe('aluno')
  })

  test('adds the first free number when the username is taken', () => {
    expect(generate('Ana Lima', ['ana.lima'])).toBe('ana.lima2')
    expect(generate('Ana Lima', ['ana.lima', 'ana.lima2'])).toBe('ana.lima3')
    expect(generate('Ana Lima', ['ana.lima2'])).toBe('ana.lima')
  })

  test('stays valid with a long name and a collision', () => {
    const name = `${'a'.repeat(26)} ${'b'.repeat(40)}`
    const first = generate(name)

    const second = generate(name, [first])

    expect(first.endsWith('.')).toBe(false)
    expect(second).toBe(`${first}2`)
    expect(second.length).toBeLessThanOrEqual(USERNAME_MAX_LENGTH)
    expect(second).toMatch(USERNAME_PATTERN)
  })
})
