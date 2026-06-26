import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { EmptyState } from "@/components/ui/empty-state"
import { ErrorMessage } from "@/components/ui/error-message"
import { getCurrentActiveUser } from "@/lib/auth/session"
import {
  DeceasedServiceError,
  getDeceasedById,
  type DeceasedDetailWithBurialLinksDto,
} from "@/services/deceased-service"
import type { BurialLinkDto } from "@/lib/dto/burial-link"

export const metadata: Metadata = {
  title: "Detalhe do falecido | Jaziggo",
}

type DeceasedDetailPageProps = Readonly<{
  params: Promise<{ id: string }>
}>

const LINK_STATUS_LABELS = {
  ACTIVE: "Ativo",
  ENDED: "Encerrado",
} as const

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
})

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
})

function formatDate(value: string | undefined) {
  if (!value) {
    return "Nao informada"
  }

  return DATE_FORMATTER.format(new Date(`${value}T00:00:00.000Z`))
}

function formatDateTime(value: string | undefined) {
  if (!value) {
    return "Nao informado"
  }

  return DATE_TIME_FORMATTER.format(new Date(value))
}

function historyClassName(historicalDataIncomplete: boolean) {
  if (historicalDataIncomplete) {
    return "border-amber-200 bg-amber-50 text-amber-800"
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800"
}

function historyLabel(historicalDataIncomplete: boolean) {
  return historicalDataIncomplete ? "Historico incompleto" : "Registro completo"
}

function DetailItem({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white px-4 py-3">
      <dt className="text-xs font-semibold uppercase text-zinc-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-zinc-950">{value}</dd>
    </div>
  )
}

function DeceasedSummary({
  deceased,
}: Readonly<{ deceased: DeceasedDetailWithBurialLinksDto }>) {
  return (
    <section aria-labelledby="deceased-summary-heading" className="space-y-4">
      <div className="flex flex-col gap-3 rounded-md border border-zinc-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs font-semibold text-zinc-600">
            {deceased.internalCode}
          </p>
          <h2 className="mt-1 text-base font-semibold text-zinc-950" id="deceased-summary-heading">
            {deceased.fullName}
          </h2>
          <p className="mt-1 font-mono text-xs text-zinc-600">
            Documento: {deceased.documentMasked ?? "Nao informado"}
          </p>
        </div>
        <span
          className={`inline-flex w-fit rounded-md border px-2 py-1 text-xs font-semibold ${historyClassName(
            deceased.historicalDataIncomplete,
          )}`}
        >
          {historyLabel(deceased.historicalDataIncomplete)}
        </span>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DetailItem label="Nascimento" value={formatDate(deceased.birthDate)} />
        <DetailItem label="Falecimento" value={formatDate(deceased.deathDate)} />
        <DetailItem label="Sepultamento" value={formatDate(deceased.burialDate)} />
        <DetailItem
          label="Datas desconhecidas"
          value={deceased.datesUnknown ? "Sim" : "Nao"}
        />
      </dl>
    </section>
  )
}

function NotesSection({
  notes,
}: Readonly<{ notes: string | undefined }>) {
  return (
    <section
      aria-labelledby="deceased-notes-heading"
      className="rounded-md border border-zinc-200 bg-white p-4"
    >
      <h2 className="text-base font-semibold text-zinc-950" id="deceased-notes-heading">
        Observacoes
      </h2>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
        {notes ?? "Nenhuma observacao administrativa registrada."}
      </p>
    </section>
  )
}

function statusClassName(status: BurialLinkDto["status"]) {
  if (status === "ACTIVE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800"
  }

  return "border-zinc-200 bg-zinc-100 text-zinc-700"
}

function BurialLinkHistoryTable({
  links,
}: Readonly<{ links: readonly BurialLinkDto[] }>) {
  if (links.length === 0) {
    return (
      <EmptyState
        title="Nenhum vinculo de sepultamento"
        description="Este falecido ainda nao possui vinculos ativos ou historicos cadastrados."
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
      <table className="min-w-full divide-y divide-zinc-200 text-sm">
        <caption className="sr-only">Historico de vinculos do falecido</caption>
        <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase text-zinc-600">
          <tr>
            <th className="px-4 py-3" scope="col">
              Status
            </th>
            <th className="px-4 py-3" scope="col">
              Espaco
            </th>
            <th className="px-4 py-3" scope="col">
              Responsavel
            </th>
            <th className="px-4 py-3" scope="col">
              Data de sepultamento
            </th>
            <th className="px-4 py-3" scope="col">
              Criado em
            </th>
            <th className="px-4 py-3" scope="col">
              Encerramento
            </th>
            <th className="px-4 py-3" scope="col">
              Motivo
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {links.map((link) => (
            <tr className="hover:bg-zinc-50" key={link.id}>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${statusClassName(
                    link.status,
                  )}`}
                >
                  {LINK_STATUS_LABELS[link.status]}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-zinc-700">
                <Link
                  className="underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
                  href={`/burial-spaces/${link.burialSpaceId}`}
                >
                  {link.burialSpaceId}
                </Link>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-zinc-700">
                {link.responsibleId ?? "Nao informado"}
              </td>
              <td className="px-4 py-3 text-zinc-700">{formatDate(link.burialDate)}</td>
              <td className="px-4 py-3 text-zinc-700">{formatDateTime(link.createdAt)}</td>
              <td className="px-4 py-3 text-zinc-700">
                {link.status === "ENDED" ? formatDateTime(link.endedAt) : "Vinculo ativo"}
              </td>
              <td className="max-w-sm px-4 py-3 text-zinc-700">
                {link.status === "ENDED" ? link.endReason : "Nao se aplica"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

async function DeceasedDetail({ id }: Readonly<{ id: string }>) {
  let deceased: DeceasedDetailWithBurialLinksDto

  try {
    deceased = await getDeceasedById(id)
  } catch (error) {
    if (error instanceof DeceasedServiceError) {
      return (
        <ErrorMessage
          message="Nao foi possivel carregar este falecido. Verifique o identificador ou tente novamente."
          title="Detalhe indisponivel"
        />
      )
    }

    return (
      <ErrorMessage
        message="Tente novamente em instantes. Se o problema persistir, informe o suporte interno."
        title="Erro ao carregar falecido"
      />
    )
  }

  return (
    <div className="space-y-6">
      <DeceasedSummary deceased={deceased} />
      <NotesSection notes={deceased.notes} />

      <section aria-labelledby="deceased-links-heading" className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-950" id="deceased-links-heading">
            Historico de sepultamento
          </h2>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            Vinculos ativos e encerrados permanecem visiveis por identificadores internos.
          </p>
        </div>

        <BurialLinkHistoryTable links={deceased.links} />
      </section>
    </div>
  )
}

export default async function DeceasedDetailPage({
  params,
}: DeceasedDetailPageProps) {
  const currentUser = await getCurrentActiveUser()

  if (!currentUser) {
    redirect("/login")
  }

  const { id } = await params

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Link
          className="inline-flex text-sm font-medium text-zinc-700 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
          href="/deceased"
        >
          Voltar para falecidos
        </Link>
        <div>
          <p className="text-sm font-medium text-zinc-500">Operacao cemiterial</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
            Detalhe do falecido
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
            Consulte codigo interno, datas, indicador historico e vinculos sem expor documento completo.
          </p>
        </div>
      </header>

      <DeceasedDetail id={id} />
    </div>
  )
}
