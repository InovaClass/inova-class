import { describe, expect, test } from 'vitest'

import { behaviorSchema } from './schema'

const errorOf = (values: { xp: string; hp: string; coins: string }) =>
  behaviorSchema.safeParse({ name: 'Ajudou um colega', ...values }).error
    ?.issues[0]

describe('behaviorSchema', () => {
  test('counts a blank value as zero', () => {
    expect(
      behaviorSchema.parse({
        name: 'Atrapalhou a aula',
        xp: '',
        hp: '-5',
        coins: ''
      })
    ).toEqual({ name: 'Atrapalhou a aula', xp: 0, hp: -5, coins: 0 })
  })

  test('rejects a behavior that changes nothing, on the XP field', () => {
    expect(errorOf({ xp: '0', hp: '', coins: '0' })).toMatchObject({
      path: ['xp'],
      message: 'Informe pelo menos um valor diferente de zero.'
    })
  })

  test.each([
    [{ xp: '10', hp: '-5', coins: '0' }, 'hp'],
    [{ xp: '10', hp: '', coins: '-5' }, 'coins'],
    [{ xp: '0', hp: '5', coins: '-5' }, 'coins'],
    [{ xp: '0', hp: '-5', coins: '5' }, 'coins']
  ])('rejects %o, which gives and takes points, on %s', (values, field) => {
    expect(errorOf(values)).toMatchObject({
      path: [field],
      message:
        'Use valores só positivos ou só negativos: um comportamento dá pontos ou tira pontos.'
    })
  })
})
