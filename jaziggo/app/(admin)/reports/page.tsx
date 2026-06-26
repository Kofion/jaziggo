import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { z } from "zod"

import {
  BurialsPeriodReportTable,
} from "@/components/reports/burials-period-report-table"
import {
  DeceasedReportTable,
} from "@/components/reports/deceased-report-table"
import {
  ReportFilters,
  REPORT_TYPE,
  reportTypeLabel,
  type ReportFilterValues,
} from "@/components/reports/report-filters"
import {
  SpaceOccupationReportTable,
} from "@/components/reports/space-occupation-report-table"
import {
  SpaceStatusReportTable,
} from "@/components/reports/space-status-report-table"
import { ErrorMessage } from "@/components/ui/error-message"
import { getCurrentActiveUser } from "@/lib/auth/session"
import { paginationSchema } from "@/lib/validation/pagination"
import {
  BURIAL_SPACE_STATUS,
  BURIAL_SPACE_TYPE,
} from "@/types/burial-space"
import { USER_ROLE } from "@/types/user"

export const metadata: Metadata = {
  title: "Relatorios | Jaziggo",
}

type ReportsPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>
}>

const ALLOWED_QUERY_PARAMS = new Set([
  "page",
  "pageSize",
  "reportType",
  "startDate",
  "endDate",
  "status",
  "type",
  "sector",
])

const reportPageQuerySchema = paginationSchema
  .extend({
    reportType: z
      .enum([
        REPORT_TYPE.DECEASED,
        REPORT_TYPE.BURIALS_BY_PERIOD,
        REPORT_TYPE.SPACE_OCCUPATION,
        REPORT_TYPE.SPACE_STATUS,
      ])
      .default(REPORT_TYPE.DECEASED),
    startDate: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.iso.date().optional(),
    ),
    endDate: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.iso.date().optional(),
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
    type: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z
        .enum([BURIAL_SPACE_TYPE.SEPULTURA, BURIAL_SPACE_TYPE.JAZIGO])
        .optional(),
    ),
    sector: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().trim().min(1).optional(),
    ),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.startDate && value.endDate && value.startDate > value.endDate) {
      context.addIssue({
        code: "custom",
        message: "startDate cannot be after endDate",
        path: ["endDate"],
      })
    }
  })

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

function toFilterValues(
  query: z.output<typeof reportPageQuerySchema>,
): ReportFilterValues {
  const usesPeriodFilters =
    query.reportType === REPORT_TYPE.DECEASED ||
    query.reportType === REPORT_TYPE.BURIALS_BY_PERIOD
  const usesSpaceFilters =
    query.reportType === REPORT_TYPE.SPACE_OCCUPATION ||
    query.reportType === REPORT_TYPE.SPACE_STATUS

  return {
    reportType: query.reportType,
    pageSize: query.pageSize,
    startDate: usesPeriodFilters ? query.startDate : undefined,
    endDate: usesPeriodFilters ? query.endDate : undefined,
    status: usesSpaceFilters ? query.status : undefined,
    type: usesSpaceFilters ? query.type : undefined,
    sector: usesSpaceFilters ? query.sector : undefined,
  }
}

function selectedFilterSummary(query: z.output<typeof reportPageQuerySchema>) {
  const values = toFilterValues(query)
  const filters = [
    values.startDate ? `Inicio: ${values.startDate}` : undefined,
    values.endDate ? `Fim: ${values.endDate}` : undefined,
    values.sector ? `Setor: ${values.sector}` : undefined,
    values.type ? `Espaco: ${values.type}` : undefined,
    values.status ? `Status: ${values.status}` : undefined,
  ].filter(Boolean)

  return filters.length > 0 ? filters.join(" | ") : "Sem filtros adicionais"
}

function ReportResults(query: z.output<typeof reportPageQuerySchema>) {
  if (query.reportType === REPORT_TYPE.DECEASED) {
    return (
      <DeceasedReportTable
        endDate={query.endDate}
        page={query.page}
        pageSize={query.pageSize}
        startDate={query.startDate}
      />
    )
  }

  if (query.reportType === REPORT_TYPE.BURIALS_BY_PERIOD) {
    return (
      <BurialsPeriodReportTable
        endDate={query.endDate}
        page={query.page}
        pageSize={query.pageSize}
        startDate={query.startDate}
      />
    )
  }

  if (query.reportType === REPORT_TYPE.SPACE_OCCUPATION) {
    return (
      <SpaceOccupationReportTable
        page={query.page}
        pageSize={query.pageSize}
        sector={query.sector}
        status={query.status}
        type={query.type}
      />
    )
  }

  return (
    <SpaceStatusReportTable
      page={query.page}
      pageSize={query.pageSize}
      sector={query.sector}
      status={query.status}
      type={query.type}
    />
  )
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const currentUser = await getCurrentActiveUser()

  if (!currentUser) {
    redirect("/login")
  }

  if (currentUser.role !== USER_ROLE.ADMIN) {
    redirect("/")
  }

  const normalizedSearchParams = normalizeSearchParams(await searchParams)
  const parsedQuery = hasUnknownQueryParameter(normalizedSearchParams)
    ? { success: false as const }
    : reportPageQuerySchema.safeParse(normalizedSearchParams)

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-zinc-500">Administracao</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
          Relatorios
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-zinc-600">
          Consulte visoes administrativas restritas sobre cadastros, sepultamentos e ocupacao dos espacos.
        </p>
      </header>

      {parsedQuery.success ? (
        <>
          <ReportFilters values={toFilterValues(parsedQuery.data)} />

          <section
            aria-labelledby="selected-report-heading"
            className="rounded-md border border-zinc-200 bg-white p-4"
          >
            <div className="space-y-1">
              <h2
                className="text-base font-semibold text-zinc-950"
                id="selected-report-heading"
              >
                {reportTypeLabel(parsedQuery.data.reportType)}
              </h2>
              <p className="text-sm text-zinc-600">
                {selectedFilterSummary(parsedQuery.data)}
              </p>
            </div>
          </section>

          <ReportResults {...parsedQuery.data} />
        </>
      ) : (
        <ErrorMessage
          message="Revise os filtros e remova parametros nao reconhecidos antes de tentar novamente."
          title="Filtros invalidos"
        />
      )}
    </div>
  )
}
