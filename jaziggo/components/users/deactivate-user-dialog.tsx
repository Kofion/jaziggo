"use client"

import { useState } from "react"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ErrorMessage } from "@/components/ui/error-message"
import type { ApiEnvelope } from "@/types/api"
import { USER_STATUS, type UserDto } from "@/types/user"

type DeactivateUserDialogProps = Readonly<{
  open: boolean
  user: Pick<UserDto, "id" | "name" | "email" | "status">
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}>

type DeactivateUserResponse = {
  acknowledged: true
}

export function DeactivateUserDialog({
  open,
  user,
  onOpenChange,
  onSuccess,
}: DeactivateUserDialogProps) {
  const [pending, setPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setErrorMessage(null)
      setSuccessMessage(null)
    }

    onOpenChange(nextOpen)
  }

  async function handleConfirm() {
    if (user.status === USER_STATUS.INACTIVE) {
      setErrorMessage(null)
      setSuccessMessage("Usuário já está inativo.")
      return
    }

    setPending(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(
        `/api/v1/users/${encodeURIComponent(user.id)}/deactivate`,
        {
          method: "PATCH",
          credentials: "same-origin",
        },
      )
      const body = (await response.json().catch(() => null)) as
        | ApiEnvelope<DeactivateUserResponse>
        | null

      if (!response.ok || !body?.success) {
        setErrorMessage("Não foi possível desativar o usuário. Tente novamente.")
        return
      }

      setSuccessMessage("Usuário desativado com sucesso.")
      onSuccess?.()
    } catch {
      setErrorMessage("Não foi possível desativar o usuário. Tente novamente.")
    } finally {
      setPending(false)
    }
  }

  return (
    <ConfirmDialog
      cancelLabel="Fechar"
      confirmLabel="Desativar usuário"
      description="A conta deixará de acessar o Jaziggo, mas o histórico administrativo será preservado."
      intent="danger"
      onConfirm={handleConfirm}
      onOpenChange={handleOpenChange}
      open={open}
      pending={pending}
      title="Desativar usuário"
    >
      <div className="space-y-3">
        <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
          <p className="font-medium text-zinc-950">{user.name}</p>
          <p className="mt-1 text-sm text-zinc-600">{user.email}</p>
        </div>

        {errorMessage ? (
          <ErrorMessage
            message={errorMessage}
            title="Desativacao não concluída"
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
