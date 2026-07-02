"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { EndLinkDialog } from "@/components/burial-links/end-link-dialog"
import { CreateLinkForm } from "@/components/burial-links/create-link-form"
import { EmptyState } from "@/components/ui/empty-state"
import type {
  ActiveBurialLink,
  EndedBurialLink,
} from "@/types/burial-link"

type ManagedBurialLink =
  | Omit<ActiveBurialLink, "updatedAt">
  | Omit<EndedBurialLink, "updatedAt">

type BurialLinkManagementProps = Readonly<{
  links: readonly ManagedBurialLink[]
  deceasedId?: string
  burialSpaceId?: string
  responsibleId?: string
  title: string
  description: string
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
    return "NÃ£o informada"
  }

  return DATE_FORMATTER.format(new Date(`${value}T00:00:00.000Z`))
}

function formatDateTime(value: string | undefined) {
  if (!value) {
    return "NÃ£o informado"
  }

  return DATE_TIME_FORMATTER.format(new Date(value))
}

function statusClassName(status: ManagedBurialLink["status"]) {
  if (status === "ACTIVE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800"
  }

  return "border-zinc-200 bg-zinc-100 text-zinc-700"
}

export function BurialLinkManagement({
  links,
  deceasedId,
  burialSpaceId,
  responsibleId,
  title,
  description,
}: BurialLinkManagementProps) {
  const router = useRouter()
  const [rows, setRows] = useState<readonly ManagedBurialLink[]>(links)
  const [selectedEndLinkId, setSelectedEndLinkId] = useState("")
  const showDeceasedColumn = !deceasedId
  const showSpaceColumn = !burialSpaceId

  function handleCreateSuccess(link: ActiveBurialLink) {
    setRows((currentRows) => [link, ...currentRows])
    router.refresh()
  }

  return (
    <section aria-labelledby="burial-link-management-heading" className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-zinc-950" id="burial-link-management-heading">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-zinc-600">{description}</p>
      </div>

      <CreateLinkForm
        burialSpaceId={burialSpaceId}
        deceasedId={deceasedId}
        onSuccess={handleCreateSuccess}
        responsibleId={responsibleId}
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Nenhum vÃ­nculo de sepultamento"
          description="Crie o primeiro vÃ­nculo usando o formulÃ¡rio acima."
        />
      ) : (
        <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <caption className="sr-only">Gerenciamento de vÃ­nculos de sepultamento</caption>
            <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase text-zinc-600">
              <tr>
                <th className="px-4 py-3" scope="col">Status</th>
                {showDeceasedColumn ? <th className="px-4 py-3" scope="col">Falecido</th> : null}
                {showSpaceColumn ? <th className="px-4 py-3" scope="col">EspaÃ§o</th> : null}
                <th className="px-4 py-3" scope="col">ResponsÃ¡vel</th>
                <th className="px-4 py-3" scope="col">Data de sepultamento</th>
                <th className="px-4 py-3" scope="col">Criado em</th>
                <th className="px-4 py-3" scope="col">Encerramento</th>
                <th className="px-4 py-3" scope="col">Motivo</th>
                <th className="px-4 py-3" scope="col">AÃ§Ãµes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((link) => (
                <tr className="hover:bg-zinc-50" key={link.id}>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${statusClassName(link.status)}`}
                    >
                      {LINK_STATUS_LABELS[link.status]}
                    </span>
                  </td>
                  {showDeceasedColumn ? (
                    <td className="px-4 py-3 font-mono text-xs text-zinc-700">{link.deceasedId}</td>
                  ) : null}
                  {showSpaceColumn ? (
                    <td className="px-4 py-3 font-mono text-xs text-zinc-700">{link.burialSpaceId}</td>
                  ) : null}
                  <td className="px-4 py-3 font-mono text-xs text-zinc-700">
                    {link.responsibleId ?? "NÃ£o informado"}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{formatDate(link.burialDate)}</td>
                  <td className="px-4 py-3 text-zinc-700">{formatDateTime(link.createdAt)}</td>
                  <td className="px-4 py-3 text-zinc-700">
                    {link.status === "ENDED" ? formatDateTime(link.endedAt) : "VÃ­nculo ativo"}
                  </td>
                  <td className="max-w-sm px-4 py-3 text-zinc-700">
                    {link.status === "ENDED" ? link.endReason : "NÃ£o se aplica"}
                  </td>
                  <td className="px-4 py-3">
                    {link.status === "ACTIVE" ? (
                      <button
                        className="inline-flex min-h-9 items-center justify-center rounded-md border border-red-300 px-3 text-xs font-semibold text-red-700 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
                        onClick={() => {
                          setSelectedEndLinkId(link.id)
                        }}
                        type="button"
                      >
                        Encerrar vÃ­nculo
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-500">HistÃ³rico</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EndLinkDialog
        burialLinkId={selectedEndLinkId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEndLinkId("")
          }
        }}
        onSuccess={(updatedLink) => {
          setRows((currentRows) =>
            currentRows.map((link) => (link.id === updatedLink.id ? updatedLink : link)),
          )
          router.refresh()
        }}
        open={selectedEndLinkId.length > 0}
      />
    </section>
  )
}




