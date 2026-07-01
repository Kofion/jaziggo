import Link from "next/link"

import { ActionLink } from "@/components/ui/action-link"

import { EmptyState } from "@/components/ui/empty-state"
import { Pagination } from "@/components/ui/pagination"
import { generateBurialsByPeriodReport } from "@/services/report-service"
import {
  type BurialLinkStatus,
} from "@/types/burial-link"
import {
  type BurialSpaceStatus,
  type BurialSpaceType,
} from "@/types/burial-space"
import type { BurialByPeriodReportItemDto } from "@/types/report"

type BurialsPeriodReportTableProps = Readonly<{
  page: number
  pageSize: number
  startDate?: string
  endDate?: string
}>

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
})

const LINK_STATUS_LABELS = {
  ACTIVE: "Ativo",
  ENDED: "Encerrado",
} as const satisfies Record<BurialLinkStatus, string>

const SPACE_STATUS_LABELS = {
  AVAILABLE: "Disponível",
  OCCUPIED: "Ocupado",
  RESERVED: "Reservado",
  INACTIVE: "Inativo",
} as const satisfies Record<BurialSpaceStatus, string>

const SPACE_TYPE_LABELS = {
  SEPULTURA: "Sepultura",
  JAZIGO: "Jazigo",
} as const satisfies Record<BurialSpaceType, string>

function formatDate(value: string | undefined) {
  if (!value) {
    return "Não informada"
  }

  return DATE_FORMATTER.format(new Date(`${value}T00:00:00.000Z`))
}

function linkStatusClassName(status: BurialLinkStatus) {
  if (status === "ACTIVE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800"
  }

  return "border-zinc-200 bg-zinc-100 text-zinc-700"
}

function spaceStatusClassName(status: BurialSpaceStatus) {
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

function buildPaginationParams(props: BurialsPeriodReportTableProps) {
  return {
    reportType: "burials-by-period",
    startDate: props.startDate,
    endDate: props.endDate,
  }
}

function BurialsPeriodReportRows({
  records,
}: Readonly<{ records: readonly BurialByPeriodReportItemDto[] }>) {
  return (
    <tbody className="divide-y divide-zinc-100">
      {records.map((item) => (
        <tr className="hover:bg-zinc-50" key={item.burialLinkId}>
          <td className="px-4 py-3 text-zinc-700">{formatDate(item.burialDate)}</td>
          <td className="px-4 py-3 font-mono text-xs font-semibold text-zinc-700">
            {item.internalCode}
          </td>
          <th className="px-4 py-3 text-left font-medium text-zinc-950" scope="row">
            <Link
              className="underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
              href={`/deceased/${item.deceasedId}`}
            >
              {item.deceasedName}
            </Link>
            <span className="mt-2 block">
              <ActionLink
                ariaLabel={`Mais detalhes de ${item.deceasedName}`}
                href={`/deceased/${item.deceasedId}`}
              >
                Mais detalhes
              </ActionLink>
            </span>
          </th>
          <td className="px-4 py-3 font-mono text-xs text-zinc-700">
            {item.deceasedDocumentMasked ?? "Não informado"}
          </td>
          <td className="px-4 py-3 text-zinc-700">
            <Link
              className="font-medium text-zinc-950 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
              href={`/burial-spaces/${item.burialSpaceId}`}
            >
              {item.burialSpaceIdentifier}
            </Link>
            <span className="mt-2 block">
              <ActionLink
                ariaLabel={`Mais detalhes de ${item.burialSpaceIdentifier}`}
                href={`/burial-spaces/${item.burialSpaceId}`}
              >
                Mais detalhes
              </ActionLink>
            </span>
            <span className="mt-2 block text-xs text-zinc-500">
              {SPACE_TYPE_LABELS[item.burialSpaceType]}
            </span>
          </td>
          <td className="max-w-sm px-4 py-3 text-zinc-700">
            {item.locationDescription}
          </td>
          <td className="px-4 py-3">
            <span
              className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${linkStatusClassName(
                item.linkStatus,
              )}`}
            >
              {LINK_STATUS_LABELS[item.linkStatus]}
            </span>
          </td>
          <td className="px-4 py-3">
            <span
              className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${spaceStatusClassName(
                item.burialSpaceStatus,
              )}`}
            >
              {SPACE_STATUS_LABELS[item.burialSpaceStatus]}
            </span>
          </td>
        </tr>
      ))}
    </tbody>
  )
}

export async function BurialsPeriodReportTable(
  props: BurialsPeriodReportTableProps,
) {
  const report = await generateBurialsByPeriodReport({
    page: props.page,
    pageSize: props.pageSize,
    startDate: props.startDate,
    endDate: props.endDate,
  })

  if (report.data.length === 0) {
    return (
      <EmptyState
        title="Nenhum sepultamento encontrado"
        description={
          report.emptyMessage ??
          "Não ha sepultamentos para o período selecionado."
        }
      />
    )
  }

  return (
    <section aria-labelledby="burials-period-report-results" className="space-y-4">
      <h2 className="sr-only" id="burials-period-report-results">
        Resultados do relatório de sepultamentos por período
      </h2>
      <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <caption className="sr-only">{report.title}</caption>
          <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase text-zinc-600">
            <tr>
              <th className="px-4 py-3" scope="col">
                Sepultamento
              </th>
              <th className="px-4 py-3" scope="col">
                Código
              </th>
              <th className="px-4 py-3" scope="col">
                Falecido
              </th>
              <th className="px-4 py-3" scope="col">
                Documento
              </th>
              <th className="px-4 py-3" scope="col">
                Espaço
              </th>
              <th className="px-4 py-3" scope="col">
                Localização
              </th>
              <th className="px-4 py-3" scope="col">
                Vínculo
              </th>
              <th className="px-4 py-3" scope="col">
                Status
              </th>
            </tr>
          </thead>
          <BurialsPeriodReportRows records={report.data} />
        </table>
      </div>

      <Pagination
        ariaLabel="Paginação do relatório de sepultamentos por período"
        basePath="/reports"
        page={report.page}
        pageSize={report.pageSize}
        searchParams={buildPaginationParams(props)}
        totalRecords={report.totalRecords}
      />
    </section>
  )
}
