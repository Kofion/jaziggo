import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { z } from "zod"

import { BurialSpaceForm } from "@/components/burial-spaces/burial-space-form"
import { BurialSpaceTable } from "@/components/burial-spaces/burial-space-table"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorMessage } from "@/components/ui/error-message"
import { LoadingState } from "@/components/ui/loading-state"
import { Pagination } from "@/components/ui/pagination"
import { SuccessMessage } from "@/components/ui/success-message"
import { getCurrentActiveUser } from "@/lib/auth/session"
import { paginationSchema } from "@/lib/validation/pagination"
import {
  BurialSpaceServiceError,
  listBurialSpaces,
} from "@/services/burial-space-service"
import type { PaginatedData } from "@/types/api"
import {
  BURIAL_SPACE_STATUS,
  BURIAL_SPACE_TYPE,
  type BurialSpaceListItemDto,
} from "@/types/burial-space"

export const metadata: Metadata = {
  title: "Sepulturas e jázigos | Jaziggo",
}

type BurialSpacesPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>
}>

const burialSpaceListQuerySchema = paginationSchema
  .extend({
    identifier: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().trim().min(1).optional(),
    ),
    type: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z
        .enum([BURIAL_SPACE_TYPE.SEPULTURA, BURIAL_SPACE_TYPE.JAZIGO])
        .optional(),
    ),
    status: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z
        .enum([
          BURIAL_SPACE_STATUS.AVAILABLE,
          BURIAL_SPACE_STATUS.OCCUPIED,
          BURIAL_SPACE_STATUS.RESERVED,
          BURIAL_SPACE_STATUS.INACTIVE,
        ])
        .optional(),
    ),
    sector: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().trim().min(1).optional(),
    ),
  })
  .strict()

const TYPE_FILTER_OPTIONS = [
  { label: "Todos os tipos", value: "" },
  { label: "Sepulturas", value: BURIAL_SPACE_TYPE.SEPULTURA },
  { label: "Jazigos", value: BURIAL_SPACE_TYPE.JAZIGO },
] as const

const STATUS_FILTER_OPTIONS = [
  { label: "Todos os status", value: "" },
  { label: "Disponíveis", value: BURIAL_SPACE_STATUS.AVAILABLE },
  { label: "Ocupados", value: BURIAL_SPACE_STATUS.OCCUPIED },
  { label: "Reservados", value: BURIAL_SPACE_STATUS.RESERVED },
  { label: "Inativos", value: BURIAL_SPACE_STATUS.INACTIVE },
] as const

function normalizeSearchParams(params: Record<string, string | string[] | undefined>) {
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

function displayCount(totalRecords: number) {
  return totalRecords === 1
    ? "1 espaço encontrado"
    : `${totalRecords} espaços encontrados`
}

async function BurialSpacesList({
  query,
}: {
  query: z.output<typeof burialSpaceListQuerySchema>
}) {
  let result: PaginatedData<BurialSpaceListItemDto>

  try {
    result = await listBurialSpaces(query)
  } catch (error) {
    if (error instanceof BurialSpaceServiceError) {
      return (
        <ErrorMessage
          message="Não foi possível carregar a lista de sepulturas e jázigos com os filtros informados."
          title="Lista de espaços indisponível"
        />
      )
    }

    return (
      <ErrorMessage
        message="Tente novamente em instantes. Se o problema persistir, informe o suporte interno."
        title="Erro ao carregar espaços"
      />
    )
  }

  if (result.items.length === 0) {
    return (
      <div className="space-y-4">
        <SuccessMessage
          message="A busca foi realizada, mas nenhum espaço corresponde aos filtros informados."
          title="Busca concluída"
        />
        <EmptyState
        title="Nenhum espaço encontrado"
        description="Ajuste os filtros para verificar outros tipos, status ou setores cadastrados."
        />
      </div>
    )
  }

  return (
    <section aria-labelledby="burial-spaces-list-heading" className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-950" id="burial-spaces-list-heading">
            Espaços cemiteriais
          </h2>
          <p className="text-sm text-zinc-600">
            {displayCount(result.pagination.totalRecords)}
          </p>
        </div>
      </div>

      <SuccessMessage
        message={`${displayCount(result.pagination.totalRecords)} com os filtros informados.`}
        title="Busca concluída"
      />

      <BurialSpaceTable spaces={result.items} />

      <Pagination
        ariaLabel="Paginação de sepulturas e jázigos"
        basePath="/burial-spaces"
        page={result.pagination.page}
        pageSize={result.pagination.pageSize}
        searchParams={query}
        totalRecords={result.pagination.totalRecords}
      />
    </section>
  )
}

export default async function BurialSpacesPage({ searchParams }: BurialSpacesPageProps) {
  const currentUser = await getCurrentActiveUser()

  if (!currentUser) {
    redirect("/login")
  }

  const normalizedSearchParams = normalizeSearchParams(await searchParams)
  const parsedQuery = burialSpaceListQuerySchema.safeParse(normalizedSearchParams)

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-zinc-500">Operação cemiterial</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
          Sepulturas e jázigos
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-zinc-600">
          Consulte espaços cadastrados, capacidade configurada, ocupação atual e status operacional.
        </p>
      </header>

      <section className="space-y-4">
        <BurialSpaceForm mode="create" />
      </section>

      <form
        action="/burial-spaces"
        className="grid gap-4 rounded-md border border-zinc-200 bg-white p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
        method="get"
      >
        <input
          name="pageSize"
          type="hidden"
          value={parsedQuery.success ? parsedQuery.data.pageSize : 25}
        />

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-800" htmlFor="identifier">
            Identificação
          </label>
          <input
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            defaultValue={parsedQuery.success ? parsedQuery.data.identifier ?? "" : ""}
            id="identifier"
            name="identifier"
            type="search"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-800" htmlFor="type">
            Tipo
          </label>
          <select
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            defaultValue={parsedQuery.success ? parsedQuery.data.type ?? "" : ""}
            id="type"
            name="type"
          >
            {TYPE_FILTER_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-800" htmlFor="status">
            Status
          </label>
          <select
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            defaultValue={parsedQuery.success ? parsedQuery.data.status ?? "" : ""}
            id="status"
            name="status"
          >
            {STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-800" htmlFor="sector">
            Setor
          </label>
          <input
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            defaultValue={parsedQuery.success ? parsedQuery.data.sector ?? "" : ""}
            id="sector"
            name="sector"
            type="search"
          />
        </div>

        <div className="flex items-end">
          <button
            aria-label="Filtrar sepulturas e jázigos"
            className="inline-flex min-h-10 w-full items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 lg:w-auto"
            type="submit"
          >
            Filtrar
          </button>
        </div>
      </form>

      {parsedQuery.success ? (
        <Suspense
          fallback={
            <LoadingState
              description="A lista de sepulturas e jázigos esta sendo consultada."
              label="Carregando espaços"
              rows={4}
            />
          }
        >
          <BurialSpacesList query={parsedQuery.data} />
        </Suspense>
      ) : (
        <ErrorMessage
          message="Revise os filtros e a paginação antes de tentar novamente."
          title="Filtros inválidos"
        />
      )}
    </div>
  )
}
