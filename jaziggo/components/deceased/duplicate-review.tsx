"use client"

import type { DeceasedDuplicateCandidateDto } from "@/types/deceased"

type DuplicateReviewProps = Readonly<{
  candidates: readonly DeceasedDuplicateCandidateDto[]
  pending?: boolean
  onProceed: () => void
  onCancel: () => void
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

function historyLabel(historicalDataIncomplete: boolean) {
  return historicalDataIncomplete ? "Histórico incompleto" : "Registro completo"
}

function historyClassName(historicalDataIncomplete: boolean) {
  if (historicalDataIncomplete) {
    return "border-amber-200 bg-amber-50 text-amber-800"
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800"
}

export function DuplicateReview({
  candidates,
  pending = false,
  onProceed,
  onCancel,
}: DuplicateReviewProps) {
  if (candidates.length === 0) {
    return null
  }

  return (
    <section
      aria-labelledby="duplicate-review-heading"
      className="space-y-4 rounded-md border border-amber-200 bg-amber-50 p-4"
    >
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-amber-950" id="duplicate-review-heading">
          Possiveis duplicidades encontradas
        </h3>
        <p className="text-sm leading-6 text-amber-900">
          Revise os registros semelhantes antes de confirmar. Homonimos legitimos podem ser
          cadastrados normalmente.
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border border-amber-200 bg-white">
        <table className="min-w-full divide-y divide-amber-100 text-sm">
          <caption className="sr-only">Possiveis duplicidades de falecidos</caption>
          <thead className="bg-amber-100/70 text-left text-xs font-semibold uppercase text-amber-950">
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
                Nascimento
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
          <tbody className="divide-y divide-amber-100">
            {candidates.map((candidate) => (
              <tr key={candidate.id}>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-zinc-700">
                  {candidate.internalCode}
                </td>
                <th className="px-4 py-3 text-left font-medium text-zinc-950" scope="row">
                  {candidate.fullName}
                </th>
                <td className="px-4 py-3 font-mono text-xs text-zinc-700">
                  {candidate.documentMasked ?? "Não informado"}
                </td>
                <td className="px-4 py-3 text-zinc-700">
                  {formatDate(candidate.birthDate)}
                </td>
                <td className="px-4 py-3 text-zinc-700">
                  {formatDate(candidate.deathDate)}
                </td>
                <td className="px-4 py-3 text-zinc-700">
                  {formatDate(candidate.burialDate)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${historyClassName(
                      candidate.historicalDataIncomplete,
                    )}`}
                  >
                    {historyLabel(candidate.historicalDataIncomplete)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-950 hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          onClick={onCancel}
          type="button"
        >
          Revisar cadastro
        </button>
        <button
          aria-busy={pending}
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-400"
          disabled={pending}
          onClick={onProceed}
          type="button"
        >
          {pending ? "Confirmando..." : "Confirmar mesmo assim"}
        </button>
      </div>
    </section>
  )
}
