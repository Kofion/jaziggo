"use client"

import { useState } from "react"

export type DocumentType = "CPF" | "RG"

type DocumentInputFieldsProps = Readonly<{
  baseId: string
  currentDocumentMasked?: string
  currentDocumentType?: DocumentType
  editMode?: boolean
}>

const DOCUMENT_TYPE_LABELS = {
  CPF: "CPF",
  RG: "RG",
} as const satisfies Record<DocumentType, string>

export function onlyDocumentDigits(value: string): string {
  return value.replace(/\D+/g, "")
}

export function formatDocumentValue(type: DocumentType, value: string): string {
  const digits = onlyDocumentDigits(value)

  if (type === "CPF") {
    return digits
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
  }

  return digits
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,6})$/, "$1-$2")
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

export function isDocumentLengthValid(type: DocumentType, value: string): boolean {
  const digits = onlyDocumentDigits(value)

  return type === "CPF" ? isValidCpf(digits) : digits.length >= 5
}

export function DocumentInputFields({
  baseId,
  currentDocumentMasked,
  currentDocumentType,
  editMode = false,
}: DocumentInputFieldsProps) {
  const [documentType, setDocumentType] = useState<DocumentType>(
    currentDocumentType ?? "CPF",
  )
  const [documentValue, setDocumentValue] = useState("")

  return (
    <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
      <div>
        <label
          className="mb-2 block text-sm font-medium text-zinc-800"
          htmlFor={`${baseId}-documentType`}
        >
          Tipo
        </label>
        <select
          className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
          id={`${baseId}-documentType`}
          name="documentType"
          onChange={(event) => {
            const nextType = event.currentTarget.value as DocumentType
            setDocumentType(nextType)
            setDocumentValue((current) => formatDocumentValue(nextType, current))
          }}
          value={documentType}
        >
          {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          className="mb-2 block text-sm font-medium text-zinc-800"
          htmlFor={`${baseId}-document`}
        >
          Documento
        </label>
        <input
          autoComplete="off"
          className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
          id={`${baseId}-document`}
          inputMode="numeric"
          maxLength={documentType === "CPF" ? 14 : 17}
          name="document"
          onChange={(event) => {
            setDocumentValue(formatDocumentValue(documentType, event.currentTarget.value))
          }}
          pattern="[0-9.\-]*"
          placeholder={editMode ? "Informar novo documento" : undefined}
          type="text"
          value={documentValue}
        />
        {editMode ? (
          <p className="mt-1 text-xs text-zinc-600">
            Documento atual: {currentDocumentType ? `${currentDocumentType} ` : ""}
            {currentDocumentMasked ?? "Não informado"}
          </p>
        ) : null}
      </div>
    </div>
  )
}