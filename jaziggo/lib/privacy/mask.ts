import { normalizeDocument } from "../validation/normalize"

export const REDACTED_VALUE = "[REDACTED]" as const

export const SENSITIVE_KEYS = [
  "password",
  "passwordHash",
  "hash",
  "token",
  "accessToken",
  "refreshToken",
  "secret",
  "authSecret",
  "authorization",
  "cookie",
  "session",
  "DATABASE_URL",
  "TEST_DATABASE_URL",
  "document",
  "phone",
  "email",
  "address",
  "url",
] as const

const VISIBLE_DOCUMENT_CHARACTERS = 4

function normalizeKey(key: string): string {
  return key.replace(/[^a-z0-9]/gi, "").toLowerCase()
}

const NORMALIZED_SENSITIVE_KEYS = new Set(
  SENSITIVE_KEYS.map(normalizeKey),
)

function isSensitiveKey(key: string): boolean {
  return NORMALIZED_SENSITIVE_KEYS.has(normalizeKey(key))
}

export function maskDocument(
  document: string | null | undefined,
): string {
  const normalized = normalizeDocument(document)

  if (!normalized) return ""
  if (normalized.length <= VISIBLE_DOCUMENT_CHARACTERS) {
    return "*".repeat(normalized.length)
  }

  const hiddenLength = normalized.length - VISIBLE_DOCUMENT_CHARACTERS
  return `${"*".repeat(hiddenLength)}${normalized.slice(-VISIBLE_DOCUMENT_CHARACTERS)}`
}

function isPlainObject(value: object): boolean {
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function defineSafeProperty(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  })
}

function redactValue(
  value: unknown,
  seen: WeakMap<object, unknown>,
): unknown {
  if (value === null || typeof value !== "object") return value
  if (seen.has(value)) return seen.get(value)

  if (Array.isArray(value)) {
    const redacted: unknown[] = []
    seen.set(value, redacted)

    for (const item of value) {
      redacted.push(redactValue(item, seen))
    }

    return redacted
  }

  if (!isPlainObject(value)) return REDACTED_VALUE

  const redacted: Record<string, unknown> = {}
  seen.set(value, redacted)

  for (const key of Object.keys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    const propertyValue =
      descriptor && "value" in descriptor
        ? descriptor.value
        : REDACTED_VALUE

    defineSafeProperty(
      redacted,
      key,
      isSensitiveKey(key)
        ? REDACTED_VALUE
        : redactValue(propertyValue, seen),
    )
  }

  return redacted
}

export function redactSensitiveFields(value: unknown): unknown {
  return redactValue(value, new WeakMap())
}
