"use client"

import { useId, useState } from "react"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ErrorMessage } from "@/components/ui/error-message"
import { RequiredMark } from "@/components/ui/required-mark"
import {
  DOMAIN_ERROR_CODE,
  type ApiEnvelope,
} from "@/types/api"
import type { EndedBurialLink } from "@/types/burial-link"

type EndLinkDialogProps = Readonly<{
  open: boolean
  burialLinkId: string
  onOpenChange: (open: boolean) => void
  onSuccess?: (link: EndedBurialLink) => void
}>

function errorMessageForResponse(body: ApiEnvelope<EndedBurialLink> | null) {
  if (body?.success === false) {
    if (body.error.code === DOMAIN_ERROR_CODE.CONFLICT) {
      return "Este vínculo já foi encerrado."
    }

    if (body.error.code === DOMAIN_ERROR_CODE.NOT_FOUND) {
      return "Vínculo de sepultamento não encontrado."
    }

    if (body.error.code === DOMAIN_ERROR_CODE.VALIDATION_ERROR) {
      return "Informe data, motivo e confirmação para encerrar o vínculo."
    }
  }

  return "Não foi possível encerrar o vínculo. Revise os dados e tente novamente."
}

async function readJsonEnvelope<TData>(response: Response) {
  return (await response.json().catch(() => null)) as ApiEnvelope<TData> | null
}

export function EndLinkDialog({
  open,
  burialLinkId,
  onOpenChange,
  onSuccess,
}: EndLinkDialogProps) {
  const formId = useId()
  const errorId = useId()
  const successId = useId()
  const [endedAt, setEndedAt] = useState("")
  const [endReason, setEndReason] = useState("")
  const [confirmation, setConfirmation] = useState(false)
  const [pending, setPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  function resetState() {
    setEndedAt("")
    setEndReason("")
    setConfirmation(false)
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetState()
    }

    onOpenChange(nextOpen)
  }

  async function handleConfirm() {
    const trimmedReason = endReason.trim()

    if (burialLinkId.trim().length === 0) {
      setSuccessMessage(null)
      setErrorMessage("Selecione um vínculo válido antes de encerrar.")
      return
    }

    if (!endedAt || trimmedReason.length === 0 || !confirmation) {
      setSuccessMessage(null)
      setErrorMessage("Informe data, motivo e marque a confirmação do encerramento.")
      return
    }

    const endedAtDate = new Date(endedAt)

    if (Number.isNaN(endedAtDate.getTime())) {
      setSuccessMessage(null)
      setErrorMessage("Informe uma data de encerramento válida.")
      return
    }

    setPending(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(
        `/api/v1/burial-links/${encodeURIComponent(burialLinkId)}/end`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            endedAt: endedAtDate.toISOString(),
            endReason: trimmedReason,
            confirmation: true,
          }),
        },
      )
      const body = await readJsonEnvelope<EndedBurialLink>(response)

      if (!response.ok || !body?.success) {
        setErrorMessage(errorMessageForResponse(body))
        return
      }

      setSuccessMessage("Vínculo encerrado e mantido no histórico.")
      onSuccess?.(body.data)
    } catch {
      setErrorMessage(
        "Não foi possível encerrar o vínculo. Revise os dados e tente novamente.",
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <ConfirmDialog
      cancelLabel="Fechar"
      confirmLabel="Encerrar vínculo"
      description="Registre o encerramento histórico do vínculo ativo sem apagar o histórico de sepultamento."
      intent="danger"
      onConfirm={handleConfirm}
      onOpenChange={handleOpenChange}
      open={open}
      pending={pending}
      title="Encerrar vínculo"
    >
      <div className="space-y-4">
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          O encerramento altera o status do vínculo para histórico e pode liberar a
          sepultura ou jazigo quando não houver outros vínculos ativos.
        </div>

        <div className="grid gap-4">
          <div>
            <label
              className="mb-2 block text-sm font-medium text-zinc-800"
              htmlFor={`${formId}-endedAt`}
            >
              Data e hora do encerramento<RequiredMark />
            </label>
            <input
              className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
              id={`${formId}-endedAt`}
              name="endedAt"
              onChange={(event) => {
                setEndedAt(event.currentTarget.value)
              }}
              required
              type="datetime-local"
              value={endedAt}
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium text-zinc-800"
              htmlFor={`${formId}-endReason`}
            >
              Motivo<RequiredMark />
            </label>
            <textarea
              className="min-h-24 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
              id={`${formId}-endReason`}
              maxLength={1000}
              name="endReason"
              onChange={(event) => {
                setEndReason(event.currentTarget.value)
              }}
              required
              value={endReason}
            />
          </div>

          <label className="flex gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-800">
            <input
              checked={confirmation}
              className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950"
              name="confirmation"
              onChange={(event) => {
                setConfirmation(event.currentTarget.checked)
              }}
              required
              type="checkbox"
            />
            <span>Confirmo que o vínculo ativo deve ser encerrado e preservado no histórico.<RequiredMark /></span>
          </label>
        </div>

        {errorMessage ? (
          <ErrorMessage id={errorId} message={errorMessage} title="Encerramento não concluído" />
        ) : null}

        {successMessage ? (
          <div
            aria-atomic="true"
            aria-live="polite"
            className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
            id={successId}
            role="status"
          >
            {successMessage}
          </div>
        ) : null}
      </div>
    </ConfirmDialog>
  )
}
