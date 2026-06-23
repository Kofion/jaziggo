import { randomUUID } from "node:crypto"

const INTERNAL_CODE_PREFIX = "JZG"
const RANDOM_SEGMENT_LENGTH = 12
const DEFAULT_MAX_GENERATION_ATTEMPTS = 5

export type InternalCodeCollisionCheck = (
  internalCode: string,
) => boolean | Promise<boolean>

export interface GenerateInternalCodeOptions {
  now?: Date
  randomId?: string
}

export interface GenerateUniqueInternalCodeOptions {
  now?: Date
  randomId?: () => string
  maxAttempts?: number
}

function formatDateSegment(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid internal code timestamp")
  }

  return date.toISOString().slice(0, 10).replaceAll("-", "")
}

function formatRandomSegment(randomId: string): string {
  const normalizedRandomId = randomId
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase()

  if (normalizedRandomId.length < RANDOM_SEGMENT_LENGTH) {
    throw new Error("Invalid internal code random segment")
  }

  return normalizedRandomId.slice(0, RANDOM_SEGMENT_LENGTH)
}

export function generateInternalCode(
  options: GenerateInternalCodeOptions = {},
): string {
  const now = options.now ?? new Date()
  const randomId = options.randomId ?? randomUUID()

  return [
    INTERNAL_CODE_PREFIX,
    formatDateSegment(now),
    formatRandomSegment(randomId),
  ].join("-")
}

export async function generateUniqueInternalCode(
  isInternalCodeTaken: InternalCodeCollisionCheck,
  options: GenerateUniqueInternalCodeOptions = {},
): Promise<string> {
  const maxAttempts =
    options.maxAttempts ?? DEFAULT_MAX_GENERATION_ATTEMPTS

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error("Invalid internal code generation attempt limit")
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const internalCode = generateInternalCode({
      now: options.now,
      randomId: options.randomId?.(),
    })

    if (!(await isInternalCodeTaken(internalCode))) {
      return internalCode
    }
  }

  throw new Error("Unable to generate unique internal code")
}
