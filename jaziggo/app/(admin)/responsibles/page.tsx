import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"

import { ResponsibleRegistrationWorkflow } from "@/components/responsibles/responsible-registration-workflow"
import { ResponsibleTable } from "@/components/responsibles/responsible-table"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorMessage } from "@/components/ui/error-message"
import { LoadingState } from "@/components/ui/loading-state"
import { Pagination } from "@/components/ui/pagination"
import { SuccessMessage } from "@/components/ui/success-message"
import { getCurrentActiveUser } from "@/lib/auth/session"
import {
  responsibleListFiltersSchema,
  type ResponsibleListFilters,
} from "@/lib/validation/responsible"
import {
  listResponsibles,
  ResponsibleServiceError,
} from "@/services/responsible-service"
import type { PaginatedData } from "@/types/api"
import type { ResponsibleListItemDto } from "@/types/responsible"

export const metadata: Metadata = {
  title: "Responsáveis | Jaziggo",
}

type ResponsiblesPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>
}>

function shouldKeepQueryValue(key: string, value: string) {
  return key === "page" || key === "pageSize" || value.trim().length > 0
}

function normalizeSearchParams(params: Record<string, string | string[] | undefined>) {
  const normalized: Record<string, string> = {}

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      const firstValue = value.at(0)

      if (firstValue !== undefined && shouldKeepQueryValue(key, firstValue)) {
        normalized[key] = firstValue
      }

      continue
    }

    if (value !== undefined && shouldKeepQueryValue(key, value)) {
      normalized[key] = value
    }
  }

  return normalized
}

function displayCount(totalRecords: number) {
  return totalRecords === 1
    ? "1 responsável encontrado"
    : `${totalRecords} responsáveis encontrados`
}

async function ResponsiblesList({
  query,
}: {
  query: ResponsibleListFilters
}) {
  let result: PaginatedData<ResponsibleListItemDto>

  try {
    result = await listResponsibles(query)
  } catch (error) {
    if (error instanceof ResponsibleServiceError) {
      return (
        <ErrorMessage
          message="Não foi possível carregar a lista de responsáveis com os filtros informados."
          title="Lista de responsáveis indisponível"
        />
      )
    }

    return (
      <ErrorMessage
        message="Tente novamente em instantes. Se o problema persistir, informe o suporte interno."
        title="Erro ao carregar responsáveis"
      />
    )
  }

  if (result.items.length === 0) {
    return (
      <div className="space-y-4">
        <SuccessMessage
          message="A busca foi realizada, mas nenhum responsável corresponde aos filtros informados."
          title="Busca concluída"
        />
        <EmptyState
        title="Nenhum responsável encontrado"
        description="Ajuste o filtro de nome para verificar outros cadastros administrativos."
        />
      </div>
    )
  }

  return (
    <section aria-labelledby="responsibles-list-heading" className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-950" id="responsibles-list-heading">
            Cadastros de responsáveis
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

      <ResponsibleTable responsibles={result.items} />

      <Pagination
        ariaLabel="Paginação de responsáveis"
        basePath="/responsibles"
        page={result.pagination.page}
        pageSize={result.pagination.pageSize}
        searchParams={query}
        totalRecords={result.pagination.totalRecords}
      />
    </section>
  )
}

export default async function ResponsiblesPage({
  searchParams,
}: ResponsiblesPageProps) {
  const currentUser = await getCurrentActiveUser()

  if (!currentUser) {
    redirect("/login")
  }

  const normalizedSearchParams = normalizeSearchParams(await searchParams)
  const parsedQuery =
    responsibleListFiltersSchema.safeParse(normalizedSearchParams)

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-zinc-500">Operação cemiterial</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
          Responsáveis
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-zinc-600">
          Consulte responsáveis administrativos por nome. A listagem mantém
          contatos fora da tela e exibe documentos somente mascarados.
        </p>
      </header>

      <section className="space-y-4">
        <ResponsibleRegistrationWorkflow />
      </section>

      <form
        action="/responsibles"
        className="grid gap-4 rounded-md border border-zinc-200 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_auto]"
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

        <div className="flex items-end">
          <button
            className="inline-flex min-h-10 w-full items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 sm:w-auto"
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
              description="A lista de responsáveis está sendo consultada."
              label="Carregando responsáveis"
              rows={4}
            />
          }
        >
          <ResponsiblesList query={parsedQuery.data} />
        </Suspense>
      ) : (
        <ErrorMessage
          message="Revise o filtro e a paginação antes de tentar novamente."
          title="Filtros inválidos"
        />
      )}
    </div>
  )
}
