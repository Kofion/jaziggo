import type { Metadata } from "next"
import { redirect } from "next/navigation"

import {
  LocationSearchForm,
  type LocationSearchFilterValues,
} from "@/components/location/location-search-form"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorMessage } from "@/components/ui/error-message"
import { getCurrentActiveUser } from "@/lib/auth/session"
import { locationSearchFiltersSchema } from "@/lib/validation/search"

export const metadata: Metadata = {
  title: "Busca e localizacao | Jaziggo",
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
          Busca e localizacao
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-zinc-600">
          Localize falecidos por dados operacionais e identifique a sepultura ou jazigo ativo para orientar atendimentos.
        </p>
      </header>

      <LocationSearchForm initialFilters={filters} />

      {parsedQuery.success ? (
        <EmptyState
          title="Nenhum resultado carregado"
          description="Informe filtros de atendimento para preparar a busca de localizacao."
        />
      ) : (
        <ErrorMessage
          message="Revise os filtros e remova parametros nao reconhecidos antes de tentar novamente."
          title="Filtros invalidos"
        />
      )}
    </div>
  )
}
