"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { EndResponsibleLinkDialog } from "@/components/responsibles/end-responsible-link-dialog"
import { ResponsibleLinkForm } from "@/components/responsibles/responsible-link-form"
import { EmptyState } from "@/components/ui/empty-state"
import type {
  ResponsibleLinkDto,
  ResponsibleLinkType,
} from "@/types/responsible"

type ResponsibleLinkManagementProps = Readonly<{
  links: readonly ResponsibleLinkDto[]
  responsibleId?: string
  deceasedId?: string
  burialSpaceId?: string
  title: string
  description: string
}>

const LINK_TYPE_LABELS = {
  DECEASED: "Falecido",
  BURIAL_SPACE: "Sepultura ou jazigo",
} as const satisfies Record<ResponsibleLinkType, string>

const LINK_STATUS_LABELS = {
  ACTIVE: "Ativo",
  ENDED: "Encerrado",
} as const

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

function linkTargetId(link: ResponsibleLinkDto) {
  return link.linkType === "DECEASED" ? link.deceasedId : link.burialSpaceId
}

function statusClassName(status: ResponsibleLinkDto["status"]) {
  if (status === "ACTIVE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800"
  }

  return "border-zinc-200 bg-zinc-100 text-zinc-700"
}

export function ResponsibleLinkManagement({
  links,
  responsibleId,
  deceasedId,
  burialSpaceId,
  title,
  description,
}: ResponsibleLinkManagementProps) {
  const router = useRouter()
  const [rows, setRows] = useState<readonly ResponsibleLinkDto[]>(links)
  const [selectedEndLinkId, setSelectedEndLinkId] = useState("")

  function handleCreateSuccess(link: ResponsibleLinkDto) {
    setRows((currentRows) => [link, ...currentRows])
    router.refresh()
  }

  return (
    <section aria-labelledby="responsible-link-management-heading" className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-zinc-950" id="responsible-link-management-heading">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-zinc-600">{description}</p>
      </div>

      <ResponsibleLinkForm
        burialSpaceId={burialSpaceId}
        deceasedId={deceasedId}
        onSuccess={handleCreateSuccess}
        responsibleId={responsibleId}
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Nenhum vínculo administrativo"
          description="Crie o primeiro vínculo usando o formulário acima."
        />
      ) : (
        <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <caption className="sr-only">Gerenciamento de vínculos administrativos</caption>
            <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase text-zinc-600">
              <tr>
                <th className="px-4 py-3" scope="col">Status</th>
                <th className="px-4 py-3" scope="col">Tipo</th>
                <th className="px-4 py-3" scope="col">Alvo</th>
                <th className="px-4 py-3" scope="col">Criado em</th>
                <th className="px-4 py-3" scope="col">Encerramento</th>
                <th className="px-4 py-3" scope="col">Motivo</th>
                <th className="px-4 py-3" scope="col">Ações</th>
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
                  <td className="px-4 py-3 text-zinc-700">{LINK_TYPE_LABELS[link.linkType]}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-700">{linkTargetId(link)}</td>
                  <td className="px-4 py-3 text-zinc-700">{formatDateTime(link.createdAt)}</td>
                  <td className="px-4 py-3 text-zinc-700">
                    {link.status === "ENDED" ? formatDateTime(link.endedAt) : "Vínculo ativo"}
                  </td>
                  <td className="max-w-sm px-4 py-3 text-zinc-700">
                    {link.status === "ENDED" ? link.endReason : "Não se aplica"}
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
                        Encerrar vínculo
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-500">Histórico</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EndResponsibleLinkDialog
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
        responsibleLinkId={selectedEndLinkId}
      />
    </section>
  )
}
