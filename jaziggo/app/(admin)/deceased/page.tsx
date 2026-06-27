import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { z } from "zod"

import { DeceasedTable } from "@/components/deceased/deceased-table"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorMessage } from "@/components/ui/error-message"
import { LoadingState } from "@/components/ui/loading-state"
import { Pagination } from "@/components/ui/pagination"
import { getCurrentActiveUser } from "@/lib/auth/session"
import { deceasedListFiltersSchema } from "@/lib/validation/deceased"
import {
  DeceasedServiceError,
  listDeceased,
} from "@/services/deceased-service"
import type { PaginatedData } from "@/types/api"
import type { DeceasedListItemDto } from "@/types/deceased"

export const metadata: Metadata = {
  title: "Falecidos | Jaziggo",
}

type DeceasedPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>
}>

const deceasedListQuerySchema = deceasedListFiltersSchema.pick({
  page: true,
  pageSize: true,
  name: true,
  internalCode: true,
  deathDate: true,
  burialDate: true,
})

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
    ? "1 falecido encontrado"
    : `${totalRecords} falecidos encontrados`
}

async function DeceasedList({
  query,
}: {
  query: z.output<typeof deceasedListQuerySchema>
}) {
  let result: PaginatedData<DeceasedListItemDto>

  try {
    result = await listDeceased(query)
  } catch (error) {
    if (error instanceof DeceasedServiceError) {
      return (
        <ErrorMessage
          message="Nao foi possivel carregar a lista de falecidos com os filtros informados."
          title="Lista de falecidos indisponivel"
        />
      )
    }

    return (
      <ErrorMessage
        message="Tente novamente em instantes. Se o problema persistir, informe o suporte interno."
        title="Erro ao carregar falecidos"
      />
    )
  }

  if (result.items.length === 0) {
    return (
      <EmptyState
        title="Nenhum falecido encontrado"
        description="Ajuste os filtros para verificar outros nomes, codigos ou datas cadastradas."
      />
    )
  }

  return (
    <section aria-labelledby="deceased-list-heading" className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-950" id="deceased-list-heading">
            Cadastros de falecidos
          </h2>
          <p className="text-sm text-zinc-600">
            {displayCount(result.pagination.totalRecords)}
          </p>
        </div>
      </div>

      <DeceasedTable deceasedRecords={result.items} />

      <Pagination
        ariaLabel="Paginacao de falecidos"
        basePath="/deceased"
        page={result.pagination.page}
        pageSize={result.pagination.pageSize}
        searchParams={query}
        totalRecords={result.pagination.totalRecords}
      />
    </section>
  )
}

export default async function DeceasedPage({ searchParams }: DeceasedPageProps) {
  const currentUser = await getCurrentActiveUser()

  if (!currentUser) {
    redirect("/login")
  }

  const normalizedSearchParams = normalizeSearchParams(await searchParams)
  const parsedQuery = deceasedListQuerySchema.safeParse(normalizedSearchParams)

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-zinc-500">Operacao cemiterial</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
          Falecidos
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-zinc-600">
          Consulte registros por nome, codigo interno e datas. Documentos aparecem somente
          mascarados e registros historicos incompletos ficam sinalizados.
        </p>
      </header>

      <form
        action="/deceased"
        className="grid gap-4 rounded-md border border-zinc-200 bg-white p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto]"
        method="get"
      >
        <input
          name="pageSize"
          type="hidden"
          value={parsedQuery.success ? parsedQuery.data.pageSize : 25}
        />

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-800" htmlFor="name">
            Nome
          </label>
          <input
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            defaultValue={parsedQuery.success ? parsedQuery.data.name ?? "" : ""}
            id="name"
            name="name"
            type="search"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-800" htmlFor="internalCode">
            Codigo interno
          </label>
          <input
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            defaultValue={parsedQuery.success ? parsedQuery.data.internalCode ?? "" : ""}
            id="internalCode"
            name="internalCode"
            type="search"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-800" htmlFor="deathDate">
            Falecimento
          </label>
          <input
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            defaultValue={parsedQuery.success ? parsedQuery.data.deathDate ?? "" : ""}
            id="deathDate"
            name="deathDate"
            type="date"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-800" htmlFor="burialDate">
            Sepultamento
          </label>
          <input
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            defaultValue={parsedQuery.success ? parsedQuery.data.burialDate ?? "" : ""}
            id="burialDate"
            name="burialDate"
            type="date"
          />
        </div>

        <div className="flex items-end">
          <button
            aria-label="Filtrar falecidos"
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
              description="A lista de falecidos esta sendo consultada."
              label="Carregando falecidos"
              rows={4}
            />
          }
        >
          <DeceasedList query={parsedQuery.data} />
        </Suspense>
      ) : (
        <ErrorMessage
          message="Revise os filtros e a paginacao antes de tentar novamente."
          title="Filtros invalidos"
        />
      )}
    </div>
  )
}
