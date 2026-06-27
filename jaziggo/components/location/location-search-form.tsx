"use client"

import { useId, useState, type FormEvent } from "react"

import { ErrorMessage } from "@/components/ui/error-message"
import {
  DOMAIN_ERROR_CODE,
  type ApiEnvelope,
  type PaginationMeta,
} from "@/types/api"
import type {
  BurialSpaceStatus,
  BurialSpaceType,
} from "@/types/burial-space"

type DocumentSearchTarget = "deceasedDocument" | "responsibleDocument"

export type LocationSearchFilterValues = Readonly<{
  deceasedName?: string
  responsibleName?: string
  deathDate?: string
  burialDate?: string
  sector?: string
  burialSpaceIdentifier?: string
  pageSize: number
}>

export type LocationSearchItem = Readonly<{
  deceasedId: string
  internalCode: string
  deceasedName: string
  deceasedDocumentMasked?: string
  deathDate?: string
  burialDate?: string
  historicalDataIncomplete: boolean
  responsibleName?: string
  responsibleDocumentMasked?: string
  burialSpaceId: string
  burialSpaceType: BurialSpaceType
  locationDescription: string
  status: BurialSpaceStatus
}>

export type LocationSearchPageData = PaginationMeta & {
  data: LocationSearchItem[]
}

type LocationSearchFormProps = Readonly<{
  initialFilters: LocationSearchFilterValues
  onDocumentSearch?: (result: LocationSearchPageData) => void
  onDocumentSearchStart?: () => void
  onDocumentSearchEnd?: () => void
  className?: string
}>

const DOCUMENT_TARGET_OPTIONS = [
  { label: "Documento do falecido", value: "deceasedDocument" },
  { label: "Documento do responsavel", value: "responsibleDocument" },
] as const satisfies ReadonlyArray<{
  label: string
  value: DocumentSearchTarget
}>

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function errorMessageForResponse(
  body: ApiEnvelope<LocationSearchPageData> | null,
) {
  if (body?.success === false) {
    if (body.error.code === DOMAIN_ERROR_CODE.VALIDATION_ERROR) {
      return "Revise o tipo de documento e tente novamente."
    }

    if (
      body.error.code === DOMAIN_ERROR_CODE.UNAUTHORIZED ||
      body.error.code === DOMAIN_ERROR_CODE.FORBIDDEN
    ) {
      return "Sua sessao nao permite executar esta busca."
    }
  }

  return "Nao foi possivel concluir a busca por documento. Tente novamente."
}

function resultSummary(totalRecords: number) {
  return totalRecords === 1
    ? "1 registro localizado por documento."
    : `${totalRecords} registros localizados por documento.`
}

async function readJsonEnvelope<TData>(response: Response) {
  return (await response.json().catch(() => null)) as ApiEnvelope<TData> | null
}

export function LocationSearchForm({
  initialFilters,
  onDocumentSearch,
  onDocumentSearchStart,
  onDocumentSearchEnd,
  className,
}: LocationSearchFormProps) {
  const formId = useId()
  const errorId = useId()
  const successId = useId()
  const [documentTarget, setDocumentTarget] =
    useState<DocumentSearchTarget>("deceasedDocument")
  const [documentValue, setDocumentValue] = useState("")
  const [pendingDocumentSearch, setPendingDocumentSearch] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const describedBy = [
    errorMessage ? errorId : undefined,
    successMessage ? successId : undefined,
  ]
    .filter(Boolean)
    .join(" ")

  async function handleDocumentSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const selectedDocument = documentValue.trim()

    if (selectedDocument.length === 0) {
      setSuccessMessage(null)
      setErrorMessage("Informe o documento para executar a busca exata.")
      return
    }

    setPendingDocumentSearch(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    onDocumentSearchStart?.()

    try {
      const response = await fetch("/api/v1/location-search/by-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          [documentTarget]: selectedDocument,
          page: 1,
          pageSize: initialFilters.pageSize,
        }),
      })
      const body = await readJsonEnvelope<LocationSearchPageData>(response)

      if (!response.ok || !body?.success) {
        setErrorMessage(errorMessageForResponse(body))
        return
      }

      setSuccessMessage(resultSummary(body.data.totalRecords))
      onDocumentSearch?.(body.data)
    } catch {
      setErrorMessage(
        "Nao foi possivel concluir a busca por documento. Tente novamente.",
      )
    } finally {
      setDocumentValue("")
      setPendingDocumentSearch(false)
      onDocumentSearchEnd?.()
    }
  }

  return (
    <section
      aria-describedby={describedBy || undefined}
      className={cx("space-y-4", className)}
    >
      <form
        action="/location-search"
        className="grid gap-4 rounded-md border border-zinc-200 bg-white p-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1fr)_auto]"
        method="get"
      >
        <input name="pageSize" type="hidden" value={initialFilters.pageSize} />

        <div>
          <label
            className="mb-2 block text-sm font-medium text-zinc-800"
            htmlFor={`${formId}-deceasedName`}
          >
            Nome do falecido
          </label>
          <input
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            defaultValue={initialFilters.deceasedName ?? ""}
            id={`${formId}-deceasedName`}
            name="deceasedName"
            type="search"
          />
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium text-zinc-800"
            htmlFor={`${formId}-responsibleName`}
          >
            Nome do responsavel
          </label>
          <input
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            defaultValue={initialFilters.responsibleName ?? ""}
            id={`${formId}-responsibleName`}
            name="responsibleName"
            type="search"
          />
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium text-zinc-800"
            htmlFor={`${formId}-deathDate`}
          >
            Falecimento
          </label>
          <input
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            defaultValue={initialFilters.deathDate ?? ""}
            id={`${formId}-deathDate`}
            name="deathDate"
            type="date"
          />
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium text-zinc-800"
            htmlFor={`${formId}-burialDate`}
          >
            Sepultamento
          </label>
          <input
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            defaultValue={initialFilters.burialDate ?? ""}
            id={`${formId}-burialDate`}
            name="burialDate"
            type="date"
          />
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium text-zinc-800"
            htmlFor={`${formId}-sector`}
          >
            Setor
          </label>
          <input
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            defaultValue={initialFilters.sector ?? ""}
            id={`${formId}-sector`}
            name="sector"
            type="search"
          />
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium text-zinc-800"
            htmlFor={`${formId}-burialSpaceIdentifier`}
          >
            Identificacao
          </label>
          <input
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            defaultValue={initialFilters.burialSpaceIdentifier ?? ""}
            id={`${formId}-burialSpaceIdentifier`}
            name="burialSpaceIdentifier"
            type="search"
          />
        </div>

        <div className="flex items-end">
          <button
            aria-label="Filtrar localizacoes"
            className="inline-flex min-h-10 w-full items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 lg:w-auto"
            type="submit"
          >
            Filtrar
          </button>
        </div>
      </form>

      <form
        aria-busy={pendingDocumentSearch}
        className="grid gap-4 rounded-md border border-zinc-200 bg-white p-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto]"
        onSubmit={handleDocumentSearch}
      >
        <div>
          <label
            className="mb-2 block text-sm font-medium text-zinc-800"
            htmlFor={`${formId}-documentTarget`}
          >
            Busca exata
          </label>
          <select
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            id={`${formId}-documentTarget`}
            name="documentTarget"
            onChange={(event) => {
              setDocumentTarget(event.currentTarget.value as DocumentSearchTarget)
            }}
            value={documentTarget}
          >
            {DOCUMENT_TARGET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium text-zinc-800"
            htmlFor={`${formId}-document`}
          >
            Documento
          </label>
          <input
            autoComplete="off"
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            id={`${formId}-document`}
            inputMode="text"
            name="document"
            onChange={(event) => {
              setDocumentValue(event.currentTarget.value)
            }}
            type="search"
            value={documentValue}
          />
        </div>

        <div className="flex items-end">
          <button
            aria-label="Buscar por documento"
            aria-busy={pendingDocumentSearch}
            className="inline-flex min-h-10 w-full items-center justify-center rounded-md border border-zinc-950 px-4 text-sm font-semibold text-zinc-950 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-300 disabled:text-zinc-400 lg:w-auto"
            disabled={pendingDocumentSearch}
            type="submit"
          >
            {pendingDocumentSearch ? "Buscando..." : "Buscar"}
          </button>
        </div>
      </form>

      {errorMessage ? (
        <ErrorMessage id={errorId} message={errorMessage} title="Busca nao concluida" />
      ) : null}

      {successMessage ? (
        <div
          aria-atomic="true"
          aria-live="polite"
          className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
          id={successId}
          role="status"
        >
          {successMessage}
        </div>
      ) : null}
    </section>
  )
}
