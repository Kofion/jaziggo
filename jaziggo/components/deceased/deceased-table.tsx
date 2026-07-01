import Link from "next/link"

import type { DeceasedListItemDto } from "@/types/deceased"

type DeceasedTableProps = Readonly<{
  deceasedRecords: readonly DeceasedListItemDto[]
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

function historyClassName(historicalDataIncomplete: boolean) {
  if (historicalDataIncomplete) {
    return "border-amber-200 bg-amber-50 text-amber-800"
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800"
}

function historyLabel(historicalDataIncomplete: boolean) {
  return historicalDataIncomplete ? "Histórico incompleto" : "Registro completo"
}

export function DeceasedTable({ deceasedRecords }: DeceasedTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
      <table className="min-w-full divide-y divide-zinc-200 text-sm">
        <caption className="sr-only">Falecidos cadastrados</caption>
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
              Histórico
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {deceasedRecords.map((deceased) => (
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
      </table>
    </div>
  )
}
