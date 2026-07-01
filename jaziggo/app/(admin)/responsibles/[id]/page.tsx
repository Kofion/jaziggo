import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { EmptyState } from "@/components/ui/empty-state"
import { ErrorMessage } from "@/components/ui/error-message"
import { getCurrentActiveUser } from "@/lib/auth/session"
import {
  getResponsibleById,
  ResponsibleServiceError,
} from "@/services/responsible-service"
import type {
  LinkStatus,
  ResponsibleDetailDto,
  ResponsibleLinkDto,
  ResponsibleLinkType,
} from "@/types/responsible"

export const metadata: Metadata = {
  title: "Detalhe do responsável | Jaziggo",
}

type ResponsibleDetailPageProps = Readonly<{
  params: Promise<{ id: string }>
}>

const LINK_TYPE_LABELS = {
  DECEASED: "Falecido",
  BURIAL_SPACE: "Sepultura ou jázigo",
} as const satisfies Record<ResponsibleLinkType, string>

const LINK_STATUS_LABELS = {
  ACTIVE: "Ativo",
  ENDED: "Encerrado",
} as const satisfies Record<LinkStatus, string>

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
})

function formatDateTime(value: string | undefined) {
  if (!value) {
    return "Não informado"
  }

  return DATE_TIME_FORMATTER.format(new Date(value))
}

function statusClassName(status: LinkStatus) {
  if (status === "ACTIVE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800"
  }

  return "border-zinc-200 bg-zinc-100 text-zinc-700"
}

function linkTargetId(link: ResponsibleLinkDto) {
  return link.linkType === "DECEASED" ? link.deceasedId : link.burialSpaceId
}

function DetailItem({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white px-4 py-3">
      <dt className="text-xs font-semibold uppercase text-zinc-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-zinc-950">{value}</dd>
    </div>
  )
}

function ResponsibleSummary({
  responsible,
}: Readonly<{ responsible: ResponsibleDetailDto }>) {
  return (
    <section aria-labelledby="responsible-summary-heading" className="space-y-4">
      <div className="rounded-md border border-zinc-200 bg-white p-4">
        <h2 className="text-base font-semibold text-zinc-950" id="responsible-summary-heading">
          {responsible.fullName}
        </h2>
        <p className="mt-1 font-mono text-xs text-zinc-600">
          Documento: {responsible.documentMasked ?? "Não informado"}
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DetailItem label="Telefone" value={responsible.phone ?? "Não informado"} />
        <DetailItem label="E-mail" value={responsible.email ?? "Não informado"} />
        <DetailItem label="Endereço" value={responsible.address ?? "Não informado"} />
        <DetailItem label="Vínculos" value={String(responsible.links.length)} />
      </dl>
    </section>
  )
}

function ResponsibleLinkTable({
  links,
}: Readonly<{ links: readonly ResponsibleLinkDto[] }>) {
  if (links.length === 0) {
    return (
      <EmptyState
        title="Nenhum vínculo administrativo"
        description="Este responsável ainda não possui vínculos cadastrados."
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
      <table className="min-w-full divide-y divide-zinc-200 text-sm">
        <caption className="sr-only">Vínculos administrativos do responsável</caption>
        <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase text-zinc-600">
          <tr>
            <th className="px-4 py-3" scope="col">
              Status
            </th>
            <th className="px-4 py-3" scope="col">
              Tipo
            </th>
            <th className="px-4 py-3" scope="col">
              Alvo
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
              <td className="px-4 py-3 text-zinc-700">{LINK_TYPE_LABELS[link.linkType]}</td>
              <td className="px-4 py-3 font-mono text-xs text-zinc-700">
                {linkTargetId(link)}
              </td>
              <td className="px-4 py-3 text-zinc-700">{formatDateTime(link.createdAt)}</td>
              <td className="px-4 py-3 text-zinc-700">
                {link.status === "ENDED" ? formatDateTime(link.endedAt) : "Vínculo ativo"}
              </td>
              <td className="max-w-sm px-4 py-3 text-zinc-700">
                {link.status === "ENDED" ? link.endReason : "Não se aplica"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

async function ResponsibleDetail({ id }: Readonly<{ id: string }>) {
  let responsible: ResponsibleDetailDto

  try {
    responsible = await getResponsibleById(id)
  } catch (error) {
    if (error instanceof ResponsibleServiceError) {
      return (
        <ErrorMessage
          message="Não foi possível carregar este responsável. Verifique o identificador ou tente novamente."
          title="Detalhe indisponível"
        />
      )
    }

    return (
      <ErrorMessage
        message="Tente novamente em instantes. Se o problema persistir, informe o suporte interno."
        title="Erro ao carregar responsável"
      />
    )
  }

  return (
    <div className="space-y-6">
      <ResponsibleSummary responsible={responsible} />

      <section aria-labelledby="responsible-links-heading" className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-950" id="responsible-links-heading">
            Vínculos administrativos
          </h2>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            Vínculos ativos e encerrados permanecem visíveis por identificadores internos.
          </p>
        </div>

        <ResponsibleLinkTable links={responsible.links} />
      </section>
    </div>
  )
}

export default async function ResponsibleDetailPage({
  params,
}: ResponsibleDetailPageProps) {
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
          href="/responsibles"
        >
          Voltar para responsáveis
        </Link>
        <div>
          <p className="text-sm font-medium text-zinc-500">Operação cemiterial</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
            Detalhe do responsável
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
            Consulte dados administrativos necessários e vínculos sem expor documento completo.
          </p>
        </div>
      </header>

      <ResponsibleDetail id={id} />
    </div>
  )
}
