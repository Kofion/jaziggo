import Link from "next/link"

type PaginationSearchParams = Readonly<
  Record<string, string | number | boolean | readonly string[] | null | undefined>
>

type PaginationProps = Readonly<{
  page: number
  pageSize: number
  totalRecords: number
  basePath: string
  searchParams?: PaginationSearchParams
  pageParam?: string
  pageSizeParam?: string
  ariaLabel?: string
  className?: string
}>

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function clampPage(page: number, totalPages: number) {
  return Math.min(Math.max(page, 1), Math.max(totalPages, 1))
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const firstPage = Math.max(1, currentPage - 2)
  const lastPage = Math.min(totalPages, firstPage + 4)
  const startPage = Math.max(1, lastPage - 4)

  return Array.from({ length: lastPage - startPage + 1 }, (_, index) => startPage + index)
}

function buildHref(
  basePath: string,
  searchParams: PaginationSearchParams | undefined,
  pageParam: string,
  pageSizeParam: string,
  page: number,
  pageSize: number,
) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value === null || value === undefined || key === pageParam || key === pageSizeParam) {
      continue
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item)
      }
      continue
    }

    params.set(key, String(value))
  }

  params.set(pageParam, String(page))
  params.set(pageSizeParam, String(pageSize))

  return `${basePath}?${params.toString()}`
}

export function Pagination({
  page,
  pageSize,
  totalRecords,
  basePath,
  searchParams,
  pageParam = "page",
  pageSizeParam = "pageSize",
  ariaLabel = "Paginação",
  className,
}: PaginationProps) {
  const safePageSize = Math.max(1, pageSize)
  const safeTotalRecords = Math.max(0, totalRecords)
  const totalPages = Math.ceil(safeTotalRecords / safePageSize)
  const currentPage = clampPage(page, totalPages)
  const visiblePages = totalPages > 0 ? getVisiblePages(currentPage, totalPages) : []
  const firstRecord = safeTotalRecords === 0 ? 0 : (currentPage - 1) * safePageSize + 1
  const lastRecord = Math.min(currentPage * safePageSize, safeTotalRecords)
  const previousPage = currentPage - 1
  const nextPage = currentPage + 1

  return (
    <nav
      aria-label={ariaLabel}
      className={cx(
        "flex flex-col gap-3 border-t border-zinc-200 pt-4 text-sm text-zinc-700 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p aria-live="polite">
        {safeTotalRecords === 0
          ? "Nenhum registro para paginar."
          : `Exibindo ${firstRecord}-${lastRecord} de ${safeTotalRecords} registros.`}
      </p>

      <ul className="flex flex-wrap items-center gap-2">
        <li>
          {previousPage >= 1 ? (
            <Link
              className="inline-flex min-h-10 items-center rounded-md border border-zinc-300 px-3 font-medium text-zinc-700 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
              href={buildHref(
                basePath,
                searchParams,
                pageParam,
                pageSizeParam,
                previousPage,
                safePageSize,
              )}
            >
              Anterior
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="inline-flex min-h-10 items-center rounded-md border border-zinc-200 px-3 font-medium text-zinc-400"
            >
              Anterior
            </span>
          )}
        </li>

        {visiblePages.map((visiblePage) => {
          const active = visiblePage === currentPage

          return (
            <li key={visiblePage}>
              {active ? (
                <span
                  aria-current="page"
                  className="inline-flex h-10 min-w-10 items-center justify-center rounded-md border border-zinc-950 bg-zinc-950 px-3 font-semibold text-white"
                >
                  {visiblePage}
                </span>
              ) : (
                <Link
                  className="inline-flex h-10 min-w-10 items-center justify-center rounded-md border border-zinc-300 px-3 font-medium text-zinc-700 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
                  href={buildHref(
                    basePath,
                    searchParams,
                    pageParam,
                    pageSizeParam,
                    visiblePage,
                    safePageSize,
                  )}
                >
                  {visiblePage}
                </Link>
              )}
            </li>
          )
        })}

        <li>
          {nextPage <= totalPages ? (
            <Link
              className="inline-flex min-h-10 items-center rounded-md border border-zinc-300 px-3 font-medium text-zinc-700 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
              href={buildHref(
                basePath,
                searchParams,
                pageParam,
                pageSizeParam,
                nextPage,
                safePageSize,
              )}
            >
              Próxima
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="inline-flex min-h-10 items-center rounded-md border border-zinc-200 px-3 font-medium text-zinc-400"
            >
              Próxima
            </span>
          )}
        </li>
      </ul>
    </nav>
  )
}
