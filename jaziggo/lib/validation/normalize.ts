const COMBINING_MARKS_PATTERN = /\p{Mark}+/gu
const EXTRA_WHITESPACE_PATTERN = /\s+/g
const NON_ALPHANUMERIC_PATTERN = /[^\p{Letter}\p{Number}]+/gu
const NON_DIGIT_PATTERN = /\D+/g

export const LOCATION_COMPONENT_KEYS = [
  "sector",
  "block",
  "street",
  "row",
  "number",
  "complement",
] as const

export type LocationComponentKey =
  (typeof LOCATION_COMPONENT_KEYS)[number]

export type LocationComponents = Partial<
  Record<LocationComponentKey, string | null | undefined>
>

export type NormalizedLocationComponents = Partial<
  Record<LocationComponentKey, string>
>

type NormalizableString = string | null | undefined

function removeDiacritics(value: string): string {
  return value.normalize("NFD").replace(COMBINING_MARKS_PATTERN, "")
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(EXTRA_WHITESPACE_PATTERN, " ")
}

export function normalizeSearchName(value: NormalizableString): string {
  if (!value) return ""

  return removeDiacritics(normalizeWhitespace(value)).toLowerCase()
}

export function normalizeDocument(value: NormalizableString): string {
  if (!value) return ""

  return removeDiacritics(value)
    .replace(NON_ALPHANUMERIC_PATTERN, "")
    .toUpperCase()
}

export function normalizePhone(value: NormalizableString): string {
  return value?.replace(NON_DIGIT_PATTERN, "") ?? ""
}

export function normalizeLocationComponent(
  value: NormalizableString,
): string {
  return normalizeSearchName(value)
}

export function normalizeLocationComponents(
  components: LocationComponents | null | undefined,
): NormalizedLocationComponents {
  const normalized: NormalizedLocationComponents = {}

  for (const key of LOCATION_COMPONENT_KEYS) {
    const value = normalizeLocationComponent(components?.[key])

    if (value) normalized[key] = value
  }

  return normalized
}

export function generateLocationKey(
  components: LocationComponents | null | undefined,
): string {
  const normalized = normalizeLocationComponents(components)

  return LOCATION_COMPONENT_KEYS.flatMap((key) => {
    const value = normalized[key]
    return value ? [`${key}=${encodeURIComponent(value)}`] : []
  }).join("|")
}
