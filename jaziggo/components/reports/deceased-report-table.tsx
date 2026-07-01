import Link from "next/link"

import { EmptyState } from "@/components/ui/empty-state"
import { Pagination } from "@/components/ui/pagination"
import { generateDeceasedReport } from "@/services/report-service"
import type { DeceasedReportItemDto } from "@/types/report"

type DeceasedReportTableProps = Readonly<{
  page: number
  pageSize: number
  startDate?: string
  endDate?: string
}>

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
})

function formatDate(value: string | undefined) {
  if (!value) {
    return "Não informada"
  }

  return DATE_FORMATTER.format(new Date(`${value}T00:00:00.000Z`))
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value))
}

function historyClassName(historicalDataIncomplete: boolean) {
  if (historicalDataIncomplete) {
    return "border-amber-200 bg-amber-50 text-amber-800"
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800"
}

function historyLabel(historicalDataIncomplete: boolean) {
  return historicalDataIncomplete ? "Histórico incompleto" : "Registro completo"
}

function buildPaginationParams(props: DeceasedReportTableProps) {
  return {
    reportType: "deceased",
    startDate: props.startDate,
    endDate: props.endDate,
  }
}

function DeceasedReportRows({
  records,
}: Readonly<{ records: readonly DeceasedReportItemDto[] }>) {
  return (
    <tbody className="divide-y divide-zinc-100">
      {records.map((deceased) => (
        <tr className="hover:bg-zinc-50" key={deceased.id}>
          <td className="px-4 py-3 font-mono text-xs font-semibold text-zinc-700">
            {deceased.internalCode}
          </td>
          <th className="px-4 py-3 text-left font-medium text-zinc-950" scope="row">
            <Link
              className="underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
              href={`/deceased/${deceased.id}`}
            >
              {deceased.fullName}
            </Link>
          </th>
          <td className="px-4 py-3 font-mono text-xs text-zinc-700">
            {deceased.documentMasked ?? "Não informado"}
          </td>
          <td className="px-4 py-3 text-zinc-700">{formatDate(deceased.deathDate)}</td>
          <td className="px-4 py-3 text-zinc-700">{formatDate(deceased.burialDate)}</td>
          <td className="px-4 py-3 text-zinc-700">{formatDateTime(deceased.createdAt)}</td>
          <td className="px-4 py-3">
            <span
              className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${historyClassName(
                deceased.historicalDataIncomplete,
              )}`}
            >
              {historyLabel(deceased.historicalDataIncomplete)}
            </span>
          </td>
        </tr>
      ))}
    </tbody>
  )
}

export async function DeceasedReportTable(props: DeceasedReportTableProps) {
  const report = await generateDeceasedReport({
    page: props.page,
    pageSize: props.pageSize,
    startDate: props.startDate,
    endDate: props.endDate,
  })

  if (report.data.length === 0) {
    return (
      <EmptyState
        title="Nenhum falecido encontrado"
        description={
          report.emptyMessage ??
          "Não ha falecidos cadastrados para o período selecionado."
        }
      />
    )
  }

  return (
    <section aria-labelledby="deceased-report-results" className="space-y-4">
      <h2 className="sr-only" id="deceased-report-results">
        Resultados do relatório de falecidos
      </h2>
      <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <caption className="sr-only">{report.title}</caption>
          <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase text-zinc-600">
            <tr>
              <th className="px-4 py-3" scope="col">
                Código
              </th>
              <th className="px-4 py-3" scope="col">
                Nome
              </th>
              <th className="px-4 py-3" scope="col">
                Documento
              </th>
              <th className="px-4 py-3" scope="col">
                Falecimento
              </th>
              <th className="px-4 py-3" scope="col">
                Sepultamento
              </th>
              <th className="px-4 py-3" scope="col">
                Cadastro
              </th>
              <th className="px-4 py-3" scope="col">
                Histórico
              </th>
            </tr>
          </thead>
          <DeceasedReportRows records={report.data} />
        </table>
      </div>

      <Pagination
        ariaLabel="Paginação do relatório de falecidos"
        basePath="/reports"
        page={report.page}
        pageSize={report.pageSize}
        searchParams={buildPaginationParams(props)}
        totalRecords={report.totalRecords}
      />
    </section>
  )
}
