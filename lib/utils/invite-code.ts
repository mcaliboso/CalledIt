import { customAlphabet } from 'nanoid'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'  // no ambiguous chars
const generateCode = customAlphabet(ALPHABET, 6)

export function generateInviteCode(): string {
  return generateCode()
}
