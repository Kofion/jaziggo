import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { BurialSpaceForm } from "@/components/burial-spaces/burial-space-form"

import { ActionLink } from "@/components/ui/action-link"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorMessage } from "@/components/ui/error-message"
import { RecordDangerActions } from "@/components/ui/record-danger-actions"
import { getCurrentActiveUser } from "@/lib/auth/session"
import {
  BurialSpaceServiceError,
  countBurialSpaceLinks,
  getBurialSpaceById,
} from "@/services/burial-space-service"
import {
  BurialLinkServiceError,
  listBurialLinksBySpace,
} from "@/services/burial-link-service"
import type { BurialLink } from "@/types/burial-link"
import type {
  BurialSpaceListItemDto,
  BurialSpaceStatus,
  BurialSpaceType,
} from "@/types/burial-space"

export const metadata: Metadata = {
  title: "Detalhe do espaço | Jaziggo",
}

type BurialSpaceDetailPageProps = Readonly<{
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}>

const TYPE_LABELS = {
  SEPULTURA: "Sepultura",
  JAZIGO: "Jazigo",
} as const satisfies Record<BurialSpaceType, string>

const STATUS_LABELS = {
  AVAILABLE: "Disponível",
  OCCUPIED: "Ocupado",
  RESERVED: "Reservado",
  INACTIVE: "Inativo",
} as const satisfies Record<BurialSpaceStatus, string>

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

function formatLocation(space: BurialSpaceListItemDto) {
  const rows = [
    ["Setor", space.sector],
    ["Bloco", space.block],
    ["Rua", space.street],
    ["Quadra/Fila", space.row],
    ["Numero", space.number],
    ["Complemento", space.complement],
  ].filter((row): row is [string, string] => typeof row[1] === "string" && row[1].length > 0)

  return rows
}

function formatDate(value: string | undefined) {
  if (!value) {
    return "Não informado"
  }

  return DATE_FORMATTER.format(new Date(`${value}T00:00:00.000Z`))
}

function formatDateTime(value: string | undefined) {
  if (!value) {
    return "Não informado"
  }

  return DATE_TIME_FORMATTER.format(new Date(value))
}

function DetailItem({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white px-4 py-3">
      <dt className="text-xs font-semibold uppercase text-zinc-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-zinc-950">{value}</dd>
    </div>
  )
}

function SpaceSummary({ space }: Readonly<{ space: BurialSpaceListItemDto }>) {
  const availableSlots = Math.max(space.capacity - space.activeLinkCount, 0)

  return (
    <section aria-labelledby="space-summary-heading" className="space-y-4">
      <div className="flex flex-col gap-3 rounded-md border border-zinc-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-950" id="space-summary-heading">
            {space.identifier}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">{TYPE_LABELS[space.type]}</p>
        </div>
        <span
          className={`inline-flex w-fit rounded-md border px-2 py-1 text-xs font-semibold ${statusClassName(
            space.status,
          )}`}
        >
          {STATUS_LABELS[space.status]}
        </span>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DetailItem label="Capacidade" value={String(space.capacity)} />
        <DetailItem label="Vínculos ativos" value={String(space.activeLinkCount)} />
        <DetailItem label="Vagas livres" value={String(availableSlots)} />
        <DetailItem label="Ocupação" value={`${space.activeLinkCount}/${space.capacity}`} />
      </dl>
    </section>
  )
}

function LocationDetails({ space }: Readonly<{ space: BurialSpaceListItemDto }>) {
  const locationRows = formatLocation(space)

  return (
    <section aria-labelledby="space-location-heading" className="rounded-md border border-zinc-200 bg-white p-4">
      <h2 className="text-base font-semibold text-zinc-950" id="space-location-heading">
        Localização
      </h2>

      {locationRows.length > 0 ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {locationRows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold uppercase text-zinc-500">{label}</dt>
              <dd className="mt-1 text-sm text-zinc-950">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-2 text-sm text-zinc-600">Localização não informada.</p>
      )}
    </section>
  )
}

function LinkHistoryTable({ links }: Readonly<{ links: readonly BurialLink[] }>) {
  if (links.length === 0) {
    return (
      <EmptyState
        title="Nenhum vínculo histórico"
        description="Este espaço ainda não possui vínculos de sepultamento registrados."
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
      <table className="min-w-full divide-y divide-zinc-200 text-sm">
        <caption className="sr-only">Histórico de vínculos do espaço</caption>
        <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase text-zinc-600">
          <tr>
            <th className="px-4 py-3" scope="col">
              Status
            </th>
            <th className="px-4 py-3" scope="col">
              Falecido
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
              <td className="px-4 py-3 text-zinc-700">{LINK_STATUS_LABELS[link.status]}</td>
              <td className="px-4 py-3 font-mono text-xs text-zinc-700">{link.deceasedId}</td>
              <td className="px-4 py-3 text-zinc-700">{formatDate(link.burialDate)}</td>
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

async function BurialSpaceDetail({
  id,
  isEditing,
}: Readonly<{ id: string; isEditing: boolean }>) {
  let space: BurialSpaceListItemDto
  let links: BurialLink[]

  try {
    ;[space, links] = await Promise.all([
      getBurialSpaceById(id),
      listBurialLinksBySpace(id),
    ])
  } catch (error) {
    if (
      error instanceof BurialSpaceServiceError ||
      error instanceof BurialLinkServiceError
    ) {
      return (
        <ErrorMessage
          message="Não foi possível carregar este espaço. Verifique o identificador ou tente novamente."
          title="Detalhe indisponível"
        />
      )
    }

    return (
      <ErrorMessage
        message="Tente novamente em instantes. Se o problema persistir, informe o suporte interno."
        title="Erro ao carregar espaço"
      />
    )
  }

  if (isEditing) {
    const linkCount = await countBurialSpaceLinks(id)

    return (
      <div className="space-y-6">
        <BurialSpaceForm
          cancelHref={`/burial-spaces/${id}`}
          mode="edit"
          space={space}
        />
        <RecordDangerActions
          afterDeleteHref="/burial-spaces"
          deleteEndpoint={`/api/v1/burial-spaces/${id}`}
          entityLabel="sepultura ou jazigo"
          entityName={space.identifier}
          hasLinks={linkCount > 0}
          unlinkEndpoint={`/api/v1/burial-spaces/${id}/links`}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SpaceSummary space={space} />
      <LocationDetails space={space} />

      <section aria-labelledby="space-history-heading" className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-950" id="space-history-heading">
            Histórico de vínculos
          </h2>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            Vínculos ativos e encerrados permanecem visíveis para preservar o histórico do espaço.
          </p>
        </div>

        <LinkHistoryTable links={links} />
      </section>
    </div>
  )
}

export default async function BurialSpaceDetailPage({
  params,
  searchParams,
}: BurialSpaceDetailPageProps) {
  const currentUser = await getCurrentActiveUser()

  if (!currentUser) {
    redirect("/login")
  }

  const { id } = await params
  const query = await searchParams
  const isEditing = query.edit === "1"
  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ActionLink href="/burial-spaces" variant="back">Voltar para sepulturas e jazigos</ActionLink>
          {!isEditing ? (
            <ActionLink href={`/burial-spaces/${id}?edit=1`}>Editar informações</ActionLink>
          ) : null}
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-500">Operação cemiterial</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
            Detalhe do espaço
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
            Acompanhe status, capacidade, localização e histórico administrativo de vínculos.
          </p>
        </div>
      </header>

      <BurialSpaceDetail id={id} isEditing={isEditing} />
    </div>
  )
}
