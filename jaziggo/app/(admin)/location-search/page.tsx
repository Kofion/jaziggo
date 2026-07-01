import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { z } from "zod"

import {
  LocationResults,
  type LocationSearchFilterValues,
  type LocationSearchPageData,
} from "@/components/location/location-results"
import { LoadingState } from "@/components/ui/loading-state"
import { getCurrentActiveUser } from "@/lib/auth/session"
import { locationSearchFiltersSchema } from "@/lib/validation/search"
import {
  LocationSearchServiceError,
  searchLocations,
} from "@/services/location-search-service"

export const metadata: Metadata = {
  title: "Busca e localização | Jaziggo",
}

type LocationSearchPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>
}>

const ALLOWED_QUERY_PARAMS = new Set([
  "page",
  "pageSize",
  "deceasedName",
  "responsibleName",
  "deathDate",
  "burialDate",
  "sector",
  "burialSpaceIdentifier",
])

const locationSearchPageQuerySchema = locationSearchFiltersSchema
  .pick({
    page: true,
    pageSize: true,
    deceasedName: true,
    responsibleName: true,
    deathDate: true,
    burialDate: true,
    sector: true,
    burialSpaceIdentifier: true,
  })
  .strict()

function normalizeSearchParams(
  params: Record<string, string | string[] | undefined>,
) {
  const normalized: Record<string, string> = {}

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      const firstValue = value.at(0)

      if (firstValue !== undefined) {
        normalized[key] = firstValue
      }

      continue
    }

    if (value !== undefined) {
      normalized[key] = value
    }
  }

  return normalized
}

function hasUnknownQueryParameter(params: Record<string, string>) {
  return Object.keys(params).some((key) => !ALLOWED_QUERY_PARAMS.has(key))
}

function initialFilters(
  params: Record<string, string>,
  pageSize: number,
): LocationSearchFilterValues {
  return {
    deceasedName: params.deceasedName,
    responsibleName: params.responsibleName,
    deathDate: params.deathDate,
    burialDate: params.burialDate,
    sector: params.sector,
    burialSpaceIdentifier: params.burialSpaceIdentifier,
    pageSize,
  }
}

function hasSearchFilter(query: z.output<typeof locationSearchPageQuerySchema>) {
  return Boolean(
    query.deceasedName ||
      query.responsibleName ||
      query.deathDate ||
      query.burialDate ||
      query.sector ||
      query.burialSpaceIdentifier,
  )
}

function toLocationPageData(
  result: Awaited<ReturnType<typeof searchLocations>>,
): LocationSearchPageData {
  return {
    ...result.pagination,
    data: result.items,
  }
}

async function LocationSearchContent({
  filters,
  query,
}: {
  filters: LocationSearchFilterValues
  query: z.output<typeof locationSearchPageQuerySchema>
}) {
  if (!hasSearchFilter(query)) {
    return <LocationResults initialFilters={filters} initialMode="idle" />
  }

  let result: Awaited<ReturnType<typeof searchLocations>>

  try {
    result = await searchLocations(query)
  } catch (error) {
    const message =
      error instanceof LocationSearchServiceError
        ? "Não foi possível carregar os resultados com os filtros informados."
        : "Tente novamente em instantes. Se o problema persistir, informe o suporte interno."

    return (
      <LocationResults
        errorMessage={message}
        initialFilters={filters}
        initialMode="query"
      />
    )
  }

  return (
    <LocationResults
      initialFilters={filters}
      initialMode="query"
      initialResult={toLocationPageData(result)}
    />
  )
}

export default async function LocationSearchPage({
  searchParams,
}: LocationSearchPageProps) {
  const currentUser = await getCurrentActiveUser()

  if (!currentUser) {
    redirect("/login")
  }

  const normalizedSearchParams = normalizeSearchParams(await searchParams)
  const parsedQuery = hasUnknownQueryParameter(normalizedSearchParams)
    ? { success: false as const }
    : locationSearchPageQuerySchema.safeParse(normalizedSearchParams)

  const filters = initialFilters(
    normalizedSearchParams,
    parsedQuery.success ? parsedQuery.data.pageSize : 25,
  )

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-zinc-500">Atendimento interno</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
          Busca e localização
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-zinc-600">
          Localize falecidos por dados operacionais e identifique a sepultura ou jázigo ativo para orientar atendimentos.
        </p>
      </header>

      {parsedQuery.success ? (
        <Suspense
          fallback={
            <LoadingState
              description="Os resultados de localização estáo sendo consultados."
              label="Carregando localizações"
              rows={4}
            />
          }
        >
          <LocationSearchContent filters={filters} query={parsedQuery.data} />
        </Suspense>
      ) : (
        <LocationResults
          errorMessage="Revise os filtros e remova parâmetros não reconhecidos antes de tentar novamente."
          initialFilters={filters}
          initialMode="query"
        />
      )}
    </div>
  )
}
