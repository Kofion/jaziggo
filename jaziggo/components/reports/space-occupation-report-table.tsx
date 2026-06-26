import Link from "next/link"

import { EmptyState } from "@/components/ui/empty-state"
import { Pagination } from "@/components/ui/pagination"
import { generateSpaceOccupationReport } from "@/services/report-service"
import type {
  BurialSpaceStatus,
  BurialSpaceType,
} from "@/types/burial-space"
import type { SpaceOccupationReportItemDto } from "@/types/report"

type SpaceOccupationReportTableProps = Readonly<{
  page: number
  pageSize: number
  status?: BurialSpaceStatus
  type?: BurialSpaceType
  sector?: string
}>

const SPACE_STATUS_LABELS = {
  AVAILABLE: "Disponivel",
  OCCUPIED: "Ocupado",
  RESERVED: "Reservado",
  INACTIVE: "Inativo",
} as const satisfies Record<BurialSpaceStatus, string>

const SPACE_TYPE_LABELS = {
  SEPULTURA: "Sepultura",
  JAZIGO: "Jazigo",
} as const satisfies Record<BurialSpaceType, string>

function statusClassName(status: BurialSpaceStatus) {
  if (status === "AVAILABLE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800"
  }

  if (status === "OCCUPIED") {
    return "border-sky-200 bg-sky-50 text-sky-800"
  }

  if (status === "RESERVED") {
    return "border-amber-200 bg-amber-50 text-amber-800"
  }

  return "border-zinc-200 bg-zinc-100 text-zinc-700"
}

function buildPaginationParams(props: SpaceOccupationReportTableProps) {
  return {
    reportType: "space-occupation",
    status: props.status,
    type: props.type,
    sector: props.sector,
  }
}

function formatOccupancy(item: SpaceOccupationReportItemDto) {
  return `${item.activeLinkCount}/${item.capacity}`
}

function SpaceOccupationRows({
  records,
}: Readonly<{ records: readonly SpaceOccupationReportItemDto[] }>) {
  return (
    <tbody className="divide-y divide-zinc-100">
      {records.map((item) => (
        <tr className="hover:bg-zinc-50" key={item.burialSpaceId}>
          <th className="px-4 py-3 text-left font-medium text-zinc-950" scope="row">
            <Link
              className="underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
              href={`/burial-spaces/${item.burialSpaceId}`}
            >
              {item.identifier}
            </Link>
          </th>
          <td className="px-4 py-3 text-zinc-700">
            {SPACE_TYPE_LABELS[item.burialSpaceType]}
          </td>
          <td className="max-w-md px-4 py-3 text-zinc-700">
            {item.locationDescription}
          </td>
          <td className="px-4 py-3">
            <span
              className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${statusClassName(
                item.status,
              )}`}
            >
              {SPACE_STATUS_LABELS[item.status]}
            </span>
          </td>
          <td className="px-4 py-3 text-zinc-700">{formatOccupancy(item)}</td>
          <td className="px-4 py-3 text-zinc-700">{item.availableCapacity}</td>
        </tr>
      ))}
    </tbody>
  )
}

export async function SpaceOccupationReportTable(
  props: SpaceOccupationReportTableProps,
) {
  const report = await generateSpaceOccupationReport({
    page: props.page,
    pageSize: props.pageSize,
    status: props.status,
    type: props.type,
    sector: props.sector,
  })

  if (report.data.length === 0) {
    return (
      <EmptyState
        title="Nenhum espaco encontrado"
        description={
          report.emptyMessage ??
          "Nao ha espacos para os filtros selecionados."
        }
      />
    )
  }

  return (
    <section aria-labelledby="space-occupation-report-results" className="space-y-4">
      <h2 className="sr-only" id="space-occupation-report-results">
        Resultados do relatorio de ocupacao de espacos
      </h2>
      <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <caption className="sr-only">{report.title}</caption>
          <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase text-zinc-600">
            <tr>
              <th className="px-4 py-3" scope="col">
                Identificacao
              </th>
              <th className="px-4 py-3" scope="col">
                Tipo
              </th>
              <th className="px-4 py-3" scope="col">
                Localizacao
              </th>
              <th className="px-4 py-3" scope="col">
                Status
              </th>
              <th className="px-4 py-3" scope="col">
                Ocupacao
              </th>
              <th className="px-4 py-3" scope="col">
                Vagas livres
              </th>
            </tr>
          </thead>
          <SpaceOccupationRows records={report.data} />
        </table>
      </div>

      <Pagination
        ariaLabel="Paginacao do relatorio de ocupacao de espacos"
        basePath="/reports"
        page={report.page}
        pageSize={report.pageSize}
        searchParams={buildPaginationParams(props)}
        totalRecords={report.totalRecords}
      />
    </section>
  )
}
