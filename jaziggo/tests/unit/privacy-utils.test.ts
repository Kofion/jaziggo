import { describe, expect, it } from "vitest"

import { maskDocument } from "@/lib/privacy/mask-document"
import { normalizeDocument } from "@/lib/validation/normalize"

describe("privacy document utilities", () => {
  it.each([
    { input: " abc.123-45 ", expected: "ABC12345" },
    { input: "\u00E1\u00E9-\u00E7 987", expected: "AEC987" },
    { input: "Doc number 42/2026", expected: "DOCNUMBER422026" },
    { input: null, expected: "" },
    { input: undefined, expected: "" },
  ])("normalizes document value %#", ({ input, expected }) => {
    expect(normalizeDocument(input)).toBe(expected)
  })

  it.each([
    { input: "123.456.789-00", expected: "*******8900" },
    { input: "abc-12345", expected: "****2345" },
    { input: "\u00E1\u00E9-\u00E7 987", expected: "**C987" },
  ])("shows only the final four normalized characters %#", ({ input, expected }) => {
    expect(maskDocument(input)).toBe(expected)
    expect(maskDocument(input).endsWith(normalizeDocument(input).slice(-4))).toBe(
      true,
    )
  })

  it.each([
    { input: "1234", expected: "****" },
    { input: "A-1", expected: "**" },
    { input: "\u00E7", expected: "*" },
  ])("fully masks short normalized values %#", ({ input, expected }) => {
    expect(maskDocument(input)).toBe(expected)
  })

  it.each([null, undefined, "", " - . / "])(
    "returns an empty mask for absent document value %#",
    (input) => {
      expect(maskDocument(input)).toBe("")
    },
  )
})
