import { randomInt } from 'node:crypto'

import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH } from '@/constants/class'

export const generateJoinCode = () =>
  Array.from(
    { length: JOIN_CODE_LENGTH },
    () => JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)]
  ).join('')
