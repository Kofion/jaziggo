import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { z } from "zod"

import { EmptyState } from "@/components/ui/empty-state"
import { ErrorMessage } from "@/components/ui/error-message"
import { LoadingState } from "@/components/ui/loading-state"
import { Pagination } from "@/components/ui/pagination"
import { UserForm } from "@/components/users/user-form"
import { UserTable } from "@/components/users/user-table"
import { getCurrentActiveUser } from "@/lib/auth/session"
import { paginationSchema } from "@/lib/validation/pagination"
import { listUsers, UserServiceError } from "@/services/user-service"
import type { PaginatedData } from "@/types/api"
import { USER_ROLE, USER_STATUS } from "@/types/user"
import type { UserDto } from "@/types/user"

export const metadata: Metadata = {
  title: "Usuários | Jaziggo",
}

type UsersPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>
}>

const userListQuerySchema = paginationSchema
  .extend({
    role: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.enum([USER_ROLE.ADMIN, USER_ROLE.EMPLOYEE]).optional(),
    ),
    status: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.enum([USER_STATUS.ACTIVE, USER_STATUS.INACTIVE]).optional(),
    ),
  })
  .strict()

const ROLE_FILTER_OPTIONS = [
  { label: "Todos os perfis", value: "" },
  { label: "Administradores", value: USER_ROLE.ADMIN },
  { label: "Funcionários", value: USER_ROLE.EMPLOYEE },
] as const

const STATUS_FILTER_OPTIONS = [
  { label: "Todos os status", value: "" },
  { label: "Ativos", value: USER_STATUS.ACTIVE },
  { label: "Inativos", value: USER_STATUS.INACTIVE },
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
  return totalRecords === 1 ? "1 usuário encontrado" : `${totalRecords} usuários encontrados`
}

async function UsersList({ query }: { query: z.output<typeof userListQuerySchema> }) {
  let result: PaginatedData<UserDto>

  try {
    result = await listUsers(query)
  } catch (error) {
    if (error instanceof UserServiceError) {
      return (
        <ErrorMessage
          message="Não foi possível carregar a lista de usuários com os filtros informados."
          title="Lista de usuários indisponível"
        />
      )
    }

    return (
      <ErrorMessage
        message="Tente novamente em instantes. Se o problema persistir, informe o suporte interno."
        title="Erro ao carregar usuários"
      />
    )
  }

  if (result.items.length === 0) {
    return (
      <EmptyState
        title="Nenhum usuário encontrado"
        description="Ajuste os filtros para verificar outros perfis ou status de contas internas."
      />
    )
  }

  return (
    <section aria-labelledby="users-list-heading" className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-950" id="users-list-heading">
            Contas internas
          </h2>
          <p className="text-sm text-zinc-600">
            {displayCount(result.pagination.totalRecords)}
          </p>
        </div>
      </div>

      <UserTable users={result.items} />

      <Pagination
        ariaLabel="Paginação de usuários"
        basePath="/users"
        page={result.pagination.page}
        pageSize={result.pagination.pageSize}
        searchParams={query}
        totalRecords={result.pagination.totalRecords}
      />
    </section>
  )
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const currentUser = await getCurrentActiveUser()

  if (!currentUser) {
    redirect("/login")
  }

  if (currentUser.role !== USER_ROLE.ADMIN) {
    redirect("/dashboard")
  }

  const normalizedSearchParams = normalizeSearchParams(await searchParams)
  const parsedQuery = userListQuerySchema.safeParse(normalizedSearchParams)

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-zinc-500">Administração</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Usuários</h1>
        <p className="max-w-3xl text-sm leading-6 text-zinc-600">
          Cadastre, consulte e mantenha contas internas autorizadas a acessar o Jaziggo.
        </p>
      </header>

      <section className="space-y-4">
        <UserForm mode="create" />
      </section>

      <form
        action="/users"
        className="grid gap-4 rounded-md border border-zinc-200 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
        method="get"
      >
        <input name="pageSize" type="hidden" value={parsedQuery.success ? parsedQuery.data.pageSize : 25} />

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-800" htmlFor="role">
            Perfil
          </label>
          <select
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            defaultValue={parsedQuery.success ? parsedQuery.data.role ?? "" : ""}
            id="role"
            name="role"
          >
            {ROLE_FILTER_OPTIONS.map((option) => (
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
              description="A lista de contas internas está sendo consultada."
              label="Carregando usuários"
              rows={4}
            />
          }
        >
          <UsersList query={parsedQuery.data} />
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
