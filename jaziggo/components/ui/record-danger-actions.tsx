"use client"

import { useId, useState } from "react"
import { useRouter } from "next/navigation"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ErrorMessage } from "@/components/ui/error-message"
import { RequiredMark } from "@/components/ui/required-mark"

type RecordDangerActionsProps = Readonly<{
  entityLabel: string
  entityName: string
  hasLinks: boolean
  unlinkEndpoint: string
  deleteEndpoint: string
  afterDeleteHref: string
}>

type PendingAction = "unlink" | "delete" | null

async function readErrorMessage(response: Response) {
  const body = (await response.json().catch(() => null)) as
    | { success?: false; error?: { message?: string } }
    | null

  return body?.error?.message ?? "Não foi possível concluir a ação."
}

export function RecordDangerActions({
  entityLabel,
  entityName,
  hasLinks,
  unlinkEndpoint,
  deleteEndpoint,
  afterDeleteHref,
}: RecordDangerActionsProps) {
  const router = useRouter()
  const confirmId = useId()
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [confirmationText, setConfirmationText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const confirmationMatches = confirmationText.trim().toLowerCase() === "confirmo"
  const isUnlink = pendingAction === "unlink"
  const title = isUnlink ? `Desvincular ${entityLabel}` : `Excluir ${entityLabel}`
  const actionLabel = isUnlink ? "Desvincular" : "Excluir"

  function openDialog(action: Exclude<PendingAction, null>) {
    setPendingAction(action)
    setConfirmationText("")
    setErrorMessage(null)
  }

  function closeDialog() {
    if (!submitting) {
      setPendingAction(null)
      setConfirmationText("")
      setErrorMessage(null)
    }
  }

  async function handleConfirm() {
    if (!pendingAction || !confirmationMatches) {
      setErrorMessage('Digite "confirmo" para confirmar a ação.')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const response = await fetch(isUnlink ? unlinkEndpoint : deleteEndpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ confirmationText: "confirmo" }),
      })

      if (!response.ok) {
        setErrorMessage(await readErrorMessage(response))
        return
      }

      if (isUnlink) {
        closeDialog()
        router.refresh()
        return
      }

      router.push(afterDeleteHref)
      router.refresh()
    } catch {
      setErrorMessage("Não foi possível concluir a ação. Tente novamente.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="rounded-md border border-zinc-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-950">Ações sensíveis</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            {hasLinks
              ? "Existem vínculos associados. Desvincule antes de excluir este cadastro."
              : "Não há vínculos associados. A exclusão definitiva está disponível."}
          </p>
        </div>
        {hasLinks ? (
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-amber-500 px-4 text-sm font-semibold text-white hover:bg-amber-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
            onClick={() => openDialog("unlink")}
            type="button"
          >
            Desvincular
          </button>
        ) : (
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            onClick={() => openDialog("delete")}
            type="button"
          >
            Excluir
          </button>
        )}
      </div>

      <ConfirmDialog
        cancelLabel="Cancelar"
        confirmLabel={actionLabel}
        description={
          isUnlink
            ? `Esta ação removerá todos os vínculos associados a ${entityName}.`
            : `Esta ação excluirá definitivamente ${entityName}.`
        }
        intent={isUnlink ? "warning" : "danger"}
        onConfirm={handleConfirm}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
        open={pendingAction !== null}
        pending={submitting}
        title={title}
      >
        <div className="space-y-4">
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            Digite <strong>confirmo</strong> para confirmar a ação.
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-800" htmlFor={confirmId}>
              Confirmação<RequiredMark />
            </label>
            <input
              autoComplete="off"
              className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
              id={confirmId}
              onChange={(event) => setConfirmationText(event.currentTarget.value)}
              value={confirmationText}
            />
          </div>
          {errorMessage ? (
            <ErrorMessage message={errorMessage} title="Ação não concluída" />
          ) : null}
        </div>
      </ConfirmDialog>
    </section>
  )
}