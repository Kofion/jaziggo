import "server-only"

import { argon2id, hash, verify } from "argon2"

const ARGON2_MEMORY_COST = 65_536
const ARGON2_TIME_COST = 3
const ARGON2_PARALLELISM = 1

export async function hashPassword(password: string): Promise<string> {
  if (password.length === 0) {
    throw new TypeError("Password must not be empty")
  }

  return hash(password, {
    type: argon2id,
    memoryCost: ARGON2_MEMORY_COST,
    timeCost: ARGON2_TIME_COST,
    parallelism: ARGON2_PARALLELISM,
  })
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  if (password.length === 0 || passwordHash.length === 0) {
    return false
  }

  try {
    return await verify(passwordHash, password)
  } catch {
    return false
  }
}
