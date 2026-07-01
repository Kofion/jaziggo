"use client"

import { useMemo, useState } from "react"

import { LocationDetail } from "@/components/location/location-detail"
import {
  LocationSearchForm,
  type LocationSearchFilterValues,
  type LocationSearchItem,
  type LocationSearchPageData,
} from "@/components/location/location-search-form"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorMessage } from "@/components/ui/error-message"
import { LoadingState } from "@/components/ui/loading-state"
import { Pagination } from "@/components/ui/pagination"
import type {
  BurialSpaceStatus,
  BurialSpaceType,
} from "@/types/burial-space"

export type {
  LocationSearchFilterValues,
  LocationSearchPageData,
} from "@/components/location/location-search-form"

type LocationResultsMode = "idle" | "query"

type LocationResultsProps = Readonly<{
  initialFilters: LocationSearchFilterValues
  initialResult?: LocationSearchPageData
  initialMode?: LocationResultsMode
  errorMessage?: string
}>

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
})

const SPACE_TYPE_LABELS = {
  SEPULTURA: "Sepultura",
  JAZIGO: "Jazigo",
} as const satisfies Record<BurialSpaceType, string>

const STATUS_LABELS = {
  AVAILABLE: "Disponível",
  OCCUPIED: "Ocupado",
  RESERVED: "Reservado",
  INACTIVE: "Inativo",
} as const satisfies Record<BurialSpaceStatus, string>

function formatDate(value: string | undefined) {
  if (!value) {
    return "Não informada"
  }

  return DATE_FORMATTER.format(new Date(`${value}T00:00:00.000Z`))
}

function displayCount(totalRecords: number) {
  return totalRecords === 1
    ? "1 resultado localizado"
    : `${totalRecords} resultados localizados`
}

function historyClassName(historicalDataIncomplete: boolean) {
  if (historicalDataIncomplete) {
    return "border-amber-200 bg-amber-50 text-amber-800"
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800"
}

function resultKey(item: LocationSearchItem) {
  return `${item.deceasedId}:${item.burialSpaceId}`
}

function documentText(value: string | undefined) {
  return value ?? "Não informado"
}

function searchParamsFromFilters(filters: LocationSearchFilterValues) {
  return {
    deceasedName: filters.deceasedName,
    responsibleName: filters.responsibleName,
    deathDate: filters.deathDate,
    burialDate: filters.burialDate,
    sector: filters.sector,
    burialSpaceIdentifier: filters.burialSpaceIdentifier,
  }
}

export function LocationResults({
  initialFilters,
  initialResult,
  initialMode = "idle",
  errorMessage,
}: LocationResultsProps) {
  const [documentResult, setDocumentResult] =
    useState<LocationSearchPageData | null>(null)
  const [documentSearchPending, setDocumentSearchPending] = useState(false)
  const activeResult = documentResult ?? initialResult
  const mode = documentResult ? "query" : initialMode
  const [selectedKey, setSelectedKey] = useState<string | null>(
    activeResult?.data.at(0) ? resultKey(activeResult.data[0]) : null,
  )
  const selectedItem = useMemo(() => {
    if (!activeResult?.data.length) {
      return undefined
    }

    return (
      activeResult.data.find((item) => resultKey(item) === selectedKey) ??
      activeResult.data[0]
    )
  }, [activeResult, selectedKey])

  function handleDocumentSearch(result: LocationSearchPageData) {
    setDocumentResult(result)
    setSelectedKey(result.data.at(0) ? resultKey(result.data[0]) : null)
  }

  return (
    <div className="space-y-6">
      <LocationSearchForm
        initialFilters={initialFilters}
        onDocumentSearch={handleDocumentSearch}
        onDocumentSearchEnd={() => {
          setDocumentSearchPending(false)
        }}
        onDocumentSearchStart={() => {
          setDocumentResult(null)
          setSelectedKey(null)
          setDocumentSearchPending(true)
        }}
      />

      {documentSearchPending ? (
        <LoadingState
          description="A busca por documento esta em andamento sem persistir o valor informado na URL."
          label="Buscando localização"
          rows={3}
        />
      ) : null}

      {errorMessage ? (
        <ErrorMessage
          message={errorMessage}
          title="Resultados indisponíveis"
        />
      ) : null}

      {!documentSearchPending && !errorMessage && mode === "idle" ? (
        <EmptyState
          title="Nenhum resultado carregado"
          description="Informe filtros de atendimento para iniciar a busca de localização."
        />
      ) : null}

      {!documentSearchPending &&
      !errorMessage &&
      mode === "query" &&
      activeResult &&
      activeResult.data.length === 0 ? (
        <EmptyState
          title="Nenhum registro encontrado"
          description="Revise nome, datas, setor, identificação ou documento e tente novamente."
        />
      ) : null}

      {!documentSearchPending &&
      !errorMessage &&
      activeResult &&
      activeResult.data.length > 0 ? (
        <section
          aria-labelledby="location-results-heading"
          className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]"
        >
          <div className="space-y-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2
                  className="text-base font-semibold text-zinc-950"
                  id="location-results-heading"
                >
                  Resultados de localização
                </h2>
                <p className="text-sm text-zinc-600">
                  {displayCount(activeResult.totalRecords)}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <caption className="sr-only">
                  Resultados internos de busca de localização
                </caption>
                <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase text-zinc-600">
                  <tr>
                    <th className="px-4 py-3" scope="col">
                      Falecido
                    </th>
                    <th className="px-4 py-3" scope="col">
                      Documento
                    </th>
                    <th className="px-4 py-3" scope="col">
                      Datas
                    </th>
                    <th className="px-4 py-3" scope="col">
                      Localização
                    </th>
                    <th className="px-4 py-3" scope="col">
                      Responsável
                    </th>
                    <th className="px-4 py-3" scope="col">
                      Ação
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {activeResult.data.map((item) => {
                    const selected = selectedItem
                      ? resultKey(selectedItem) === resultKey(item)
                      : false

                    return (
                      <tr
                        className={selected ? "bg-zinc-50" : "hover:bg-zinc-50"}
                        key={resultKey(item)}
                      >
                        <th
                          className="px-4 py-3 text-left align-top"
                          scope="row"
                        >
                          <span className="block font-medium text-zinc-950">
                            {item.deceasedName}
                          </span>
                          <span className="mt-1 block font-mono text-xs font-semibold text-zinc-700">
                            {item.internalCode}
                          </span>
                          <span
                            className={`mt-2 inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${historyClassName(
                              item.historicalDataIncomplete,
                            )}`}
                          >
                            {item.historicalDataIncomplete
                              ? "Histórico incompleto"
                              : "Registro completo"}
                          </span>
                        </th>
                        <td className="px-4 py-3 align-top font-mono text-xs text-zinc-700">
                          {documentText(item.deceasedDocumentMasked)}
                        </td>
                        <td className="px-4 py-3 align-top text-zinc-700">
                          <span className="block">
                            Falecimento: {formatDate(item.deathDate)}
                          </span>
                          <span className="mt-1 block">
                            Sepultamento: {formatDate(item.burialDate)}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top text-zinc-800">
                          <span className="block font-medium text-zinc-950">
                            {SPACE_TYPE_LABELS[item.burialSpaceType]}
                          </span>
                          <span className="mt-1 block leading-6">
                            {item.locationDescription}
                          </span>
                          <span className="mt-1 block text-xs font-semibold text-zinc-500">
                            {STATUS_LABELS[item.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top text-zinc-700">
                          <span className="block">
                            {item.responsibleName ?? "Não informado"}
                          </span>
                          <span className="mt-1 block font-mono text-xs">
                            {documentText(item.responsibleDocumentMasked)}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <button
                            aria-label={`Ver orientação de ${item.internalCode}`}
                            aria-pressed={selected}
                            className="inline-flex min-h-10 items-center justify-center rounded-md border border-zinc-300 px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
                            onClick={() => {
                              setSelectedKey(resultKey(item))
                            }}
                            type="button"
                          >
                            Ver orientação
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {documentResult ? (
              <p className="text-sm leading-6 text-zinc-600">
                Resultado de busca exata por documento. O documento informado não
                foi persistido na URL.
              </p>
            ) : (
              <Pagination
                ariaLabel="Paginação de resultados de localização"
                basePath="/location-search"
                page={activeResult.page}
                pageSize={activeResult.pageSize}
                searchParams={searchParamsFromFilters(initialFilters)}
                totalRecords={activeResult.totalRecords}
              />
            )}
          </div>

          <LocationDetail item={selectedItem} />
        </section>
      ) : null}
    </div>
  )
}
