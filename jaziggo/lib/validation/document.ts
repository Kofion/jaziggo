import { z } from "zod"

import { requiredTrimmedStringSchema } from "./common"

export const documentTypeSchema = z.enum(["CPF", "RG"])

const NON_DIGIT_PATTERN = /\D+/g

export type DocumentType = z.infer<typeof documentTypeSchema>

export function normalizeDocumentNumber(value: string): string {
  return value.replace(NON_DIGIT_PATTERN, "")
}

function isValidCpf(value: string): boolean {
  if (!/^\d{11}$/.test(value) || /^(\d)\1{10}$/.test(value)) {
    return false
  }

  const digits = value.split("").map(Number)
  const firstCheck = digits
    .slice(0, 9)
    .reduce((sum, digit, index) => sum + digit * (10 - index), 0)
  const firstRemainder = (firstCheck * 10) % 11
  const firstDigit = firstRemainder === 10 ? 0 : firstRemainder

  if (firstDigit !== digits[9]) {
    return false
  }

  const secondCheck = digits
    .slice(0, 10)
    .reduce((sum, digit, index) => sum + digit * (11 - index), 0)
  const secondRemainder = (secondCheck * 10) % 11
  const secondDigit = secondRemainder === 10 ? 0 : secondRemainder

  return secondDigit === digits[10]
}

function isValidRg(value: string): boolean {
  return /^\d{5,14}$/.test(value)
}

export const normalizedDocumentSchema = requiredTrimmedStringSchema
  .transform(normalizeDocumentNumber)
  .pipe(z.string().min(1))

export function validateDocumentByType(
  value: { document?: string; documentType?: DocumentType },
  context: z.RefinementCtx,
): void {
  if (value.document && !value.documentType) {
    context.addIssue({
      code: "custom",
      message: "Informe se o documento é CPF ou RG",
      path: ["documentType"],
    })
    return
  }

  if (!value.document && value.documentType) {
    context.addIssue({
      code: "custom",
      message: "Informe o número do documento",
      path: ["document"],
    })
    return
  }

  if (!value.document || !value.documentType) {
    return
  }

  const valid =
    value.documentType === "CPF"
      ? isValidCpf(value.document)
      : isValidRg(value.document)

  if (!valid) {
    context.addIssue({
      code: "custom",
      message:
        value.documentType === "CPF"
          ? "Informe um CPF válido com 11 números"
          : "Informe um RG válido usando apenas números",
      path: ["document"],
    })
  }
}