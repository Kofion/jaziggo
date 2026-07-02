"use client"

import { useState } from "react"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ErrorMessage } from "@/components/ui/error-message"
import type { ApiEnvelope } from "@/types/api"
import {
  BURIAL_SPACE_STATUS,
  type BurialSpaceListItemDto,
  type BurialSpaceStatus,
  type BurialSpaceType,
} from "@/types/burial-space"

type ChangeableBurialSpaceStatus = Exclude<BurialSpaceStatus, "OCCUPIED">

type ChangeStatusDialogProps = Readonly<{
  open: boolean
  space: Pick<
    BurialSpaceListItemDto,
    "id" | "identifier" | "type" | "status" | "capacity" | "activeLinkCount"
  >
  targetStatus: ChangeableBurialSpaceStatus
  onOpenChange: (open: boolean) => void
  onSuccess?: (space: BurialSpaceListItemDto) => void
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

const TARGET_STATUS_DESCRIPTIONS = {
  AVAILABLE: "O espaço ficará liberado para novos vínculos, respeitando capacidade e regras de ocupação.",
  RESERVED: "O espaço ficará reservado e não aceitará novos vínculos enquanto permanecer assim.",
  INACTIVE: "O espaço ficará inativo e não aceitará novos vínculos enquanto permanecer assim.",
} as const satisfies Record<ChangeableBurialSpaceStatus, string>

function conflictMessage(targetStatus: ChangeableBurialSpaceStatus) {
  if (targetStatus === BURIAL_SPACE_STATUS.RESERVED) {
    return "Não é possível reservar um espaço com vínculo ativo. Encerre os vínculos ativos antes de alterar para RESERVED."
  }

  if (targetStatus === BURIAL_SPACE_STATUS.INACTIVE) {
    return "Não é possível inativar um espaço com vínculo ativo. Encerre os vínculos ativos antes de alterar para INACTIVE."
  }

  return "Não é possível marcar como disponível enquanto houver vínculo ativo. Encerre os vínculos ativos antes da alteração."
}

function statusSummary(status: BurialSpaceStatus) {
  return STATUS_LABELS[status]
}

export function ChangeStatusDialog({
  open,
  space,
  targetStatus,
  onOpenChange,
  onSuccess,
}: ChangeStatusDialogProps) {
  const [pending, setPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const hasActiveLinks = space.activeLinkCount > 0
  const targetStatusLabel = statusSummary(targetStatus)
  const intent = targetStatus === BURIAL_SPACE_STATUS.INACTIVE ? "danger" : "default"

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setErrorMessage(null)
      setSuccessMessage(null)
    }

    onOpenChange(nextOpen)
  }

  async function handleConfirm() {
    if (space.status === targetStatus) {
      setErrorMessage(null)
      setSuccessMessage(`O espaço já está com status ${targetStatusLabel}.`)
      return
    }

    if (hasActiveLinks) {
      setSuccessMessage(null)
      setErrorMessage(conflictMessage(targetStatus))
      return
    }

    setPending(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(
        `/api/v1/burial-spaces/${encodeURIComponent(space.id)}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            status: targetStatus,
            confirmation: true,
          }),
        },
      )
      const body = (await response.json().catch(() => null)) as
        | ApiEnvelope<BurialSpaceListItemDto>
        | null

      if (!response.ok || !body?.success) {
        setErrorMessage(
          body?.success === false && body.error.code === "CONFLICT"
            ? conflictMessage(targetStatus)
            : "Não foi possível alterar o status do espaço. Tente novamente.",
        )
        return
      }

      setSuccessMessage(`Status alterado para ${targetStatusLabel}.`)
      onSuccess?.(body.data)
    } catch {
      setErrorMessage("Não foi possível alterar o status do espaço. Tente novamente.")
    } finally {
      setPending(false)
    }
  }

  return (
    <ConfirmDialog
      cancelLabel="Fechar"
      confirmLabel={`Alterar para ${targetStatusLabel}`}
      description={TARGET_STATUS_DESCRIPTIONS[targetStatus]}
      intent={intent}
      onConfirm={handleConfirm}
      onOpenChange={handleOpenChange}
      open={open}
      pending={pending}
      title="Alterar status do espaço"
    >
      <div className="space-y-3">
        <dl className="grid gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase text-zinc-500">Identificação</dt>
            <dd className="mt-1 font-medium text-zinc-950">{space.identifier}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-zinc-500">Tipo</dt>
            <dd className="mt-1 font-medium text-zinc-950">{TYPE_LABELS[space.type]}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-zinc-500">Status atual</dt>
            <dd className="mt-1 font-medium text-zinc-950">{statusSummary(space.status)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-zinc-500">Ocupação</dt>
            <dd className="mt-1 font-medium text-zinc-950">
              {space.activeLinkCount}/{space.capacity}
            </dd>
          </div>
        </dl>

        {hasActiveLinks ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            RESERVED e INACTIVE bloqueiam novos vínculos e exigem zero vínculos ativos.
            Encerre os vínculos ativos antes de mudar para esse status.
          </p>
        ) : null}

        {errorMessage ? (
          <ErrorMessage
            message={errorMessage}
            title="Alteração de status não concluída"
          />
        ) : null}

        {successMessage ? (
          <div
            aria-atomic="true"
            aria-live="polite"
            className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
            role="status"
          >
            {successMessage}
          </div>
        ) : null}
      </div>
    </ConfirmDialog>
  )
}
