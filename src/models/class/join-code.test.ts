import { describe, expect, test } from 'vitest'

import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH } from './constants'
import { generateJoinCode } from './join-code'

describe('generateJoinCode', () => {
  test('uses only the characters of the alphabet, at the fixed length', () => {
    const pattern = new RegExp(`^[${JOIN_CODE_ALPHABET}]{${JOIN_CODE_LENGTH}}$`)

    for (let index = 0; index < 1000; index++) {
      expect(generateJoinCode()).toMatch(pattern)
    }
  })

  test('reaches every character of the alphabet', () => {
    const characters = new Set(
      Array.from({ length: 1000 }, generateJoinCode).join('')
    )

    expect(characters.size).toBe(JOIN_CODE_ALPHABET.length)
  })
})
