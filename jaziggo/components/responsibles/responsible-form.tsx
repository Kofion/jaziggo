"use client"

import { useId, useState, type FormEvent } from "react"

import { ErrorMessage } from "@/components/ui/error-message"
import type { ApiEnvelope } from "@/types/api"
import type {
  CreateResponsibleInput,
  ResponsibleDetailDto,
  ResponsibleListItemDto,
} from "@/types/responsible"

type ResponsibleFormMode = "create" | "edit"

type ResponsibleFormProps = Readonly<{
  mode: ResponsibleFormMode
  responsible?: ResponsibleDetailDto
  onSuccess?: (responsible: ResponsibleDetailDto | ResponsibleListItemDto) => void
  className?: string
}>

type ResponsibleFormPayload = {
  fullName?: string
  document?: string
  phone?: string
  email?: string
  address?: string
}

const FORM_COPY = {
  create: {
    title: "Novo responsavel",
    description:
      "Cadastre uma pessoa de contato administrativo, sem criar acesso ao sistema.",
    submitLabel: "Criar responsavel",
    pendingLabel: "Criando...",
    successMessage: "Responsavel criado com sucesso.",
    errorMessage:
      "Nao foi possivel criar o responsavel. Revise os dados e tente novamente.",
  },
  edit: {
    title: "Editar responsavel",
    description:
      "Atualize dados administrativos necessarios para manutencao do cadastro.",
    submitLabel: "Salvar alteracoes",
    pendingLabel: "Salvando...",
    successMessage: "Responsavel atualizado com sucesso.",
    errorMessage:
      "Nao foi possivel atualizar o responsavel. Revise os dados e tente novamente.",
  },
} as const satisfies Record<
  ResponsibleFormMode,
  {
    title: string
    description: string
    submitLabel: string
    pendingLabel: string
    successMessage: string
    errorMessage: string
  }
>

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function fieldValue(formData: FormData, field: string) {
  const value = formData.get(field)

  return typeof value === "string" ? value.trim() : ""
}

function optionalFieldValue(formData: FormData, field: string) {
  const value = fieldValue(formData, field)

  return value.length > 0 ? value : undefined
}

function hasContactOrIdentifier(payload: ResponsibleFormPayload) {
  return Boolean(payload.document || payload.phone || payload.email || payload.address)
}

function responsibleEndpoint(mode: ResponsibleFormMode, responsible?: ResponsibleDetailDto) {
  if (mode === "create") {
    return "/api/v1/responsibles"
  }

  if (!responsible) {
    return null
  }

  return `/api/v1/responsibles/${encodeURIComponent(responsible.id)}`
}

export function ResponsibleForm({
  mode,
  responsible,
  onSuccess,
  className,
}: ResponsibleFormProps) {
  const copy = FORM_COPY[mode]
  const formId = useId()
  const errorId = useId()
  const successId = useId()
  const [pending, setPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const describedBy = [
    errorMessage ? errorId : undefined,
    successMessage ? successId : undefined,
  ]
    .filter(Boolean)
    .join(" ")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const endpoint = responsibleEndpoint(mode, responsible)

    if (!endpoint) {
      setSuccessMessage(null)
      setErrorMessage("Selecione um responsavel valido antes de editar.")
      return
    }

    const form = event.currentTarget
    const formData = new FormData(form)
    const fullName = fieldValue(formData, "fullName")
    const payload: ResponsibleFormPayload = {
      fullName,
      document: optionalFieldValue(formData, "document"),
      phone: optionalFieldValue(formData, "phone"),
      email: optionalFieldValue(formData, "email"),
      address: optionalFieldValue(formData, "address"),
    }

    if (fullName.length === 0) {
      setSuccessMessage(null)
      setErrorMessage("Informe o nome completo do responsavel.")
      return
    }

    if (mode === "create" && !hasContactOrIdentifier(payload)) {
      setSuccessMessage(null)
      setErrorMessage("Informe ao menos um documento, telefone, e-mail ou endereco.")
      return
    }

    setPending(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(endpoint, {
        method: mode === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(
          mode === "create" ? (payload as CreateResponsibleInput) : payload,
        ),
      })
      const body = (await response.json().catch(() => null)) as
        | ApiEnvelope<ResponsibleDetailDto | ResponsibleListItemDto>
        | null

      if (!response.ok || !body?.success) {
        setErrorMessage(copy.errorMessage)
        return
      }

      setSuccessMessage(copy.successMessage)
      onSuccess?.(body.data)

      if (mode === "create") {
        form.reset()
      }
    } catch {
      setErrorMessage(copy.errorMessage)
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      aria-busy={pending}
      aria-describedby={describedBy || undefined}
      className={cx("space-y-5 rounded-md border border-zinc-200 bg-white p-4", className)}
      onSubmit={handleSubmit}
    >
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-zinc-950">{copy.title}</h2>
        <p className="text-sm leading-6 text-zinc-600">{copy.description}</p>
      </div>

      {errorMessage ? (
        <ErrorMessage id={errorId} message={errorMessage} title="Acao nao concluida" />
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label
            className="mb-2 block text-sm font-medium text-zinc-800"
            htmlFor={`${formId}-fullName`}
          >
            Nome completo
          </label>
          <input
            autoComplete="name"
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            defaultValue={responsible?.fullName ?? ""}
            id={`${formId}-fullName`}
            maxLength={160}
            name="fullName"
            required
            type="text"
          />
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium text-zinc-800"
            htmlFor={`${formId}-document`}
          >
            Documento
          </label>
          <input
            autoComplete="off"
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            id={`${formId}-document`}
            maxLength={40}
            name="document"
            placeholder={mode === "edit" ? "Informar novo documento" : undefined}
            type="text"
          />
          {mode === "edit" ? (
            <p className="mt-1 text-xs text-zinc-600">
              Documento atual: {responsible?.documentMasked ?? "Nao informado"}
            </p>
          ) : null}
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium text-zinc-800"
            htmlFor={`${formId}-phone`}
          >
            Telefone
          </label>
          <input
            autoComplete="tel"
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            defaultValue={responsible?.phone ?? ""}
            id={`${formId}-phone`}
            maxLength={40}
            name="phone"
            type="tel"
          />
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium text-zinc-800"
            htmlFor={`${formId}-email`}
          >
            E-mail
          </label>
          <input
            autoComplete="email"
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            defaultValue={responsible?.email ?? ""}
            id={`${formId}-email`}
            maxLength={254}
            name="email"
            type="email"
          />
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium text-zinc-800"
            htmlFor={`${formId}-address`}
          >
            Endereco
          </label>
          <input
            autoComplete="street-address"
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            defaultValue={responsible?.address ?? ""}
            id={`${formId}-address`}
            maxLength={240}
            name="address"
            type="text"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          aria-busy={pending}
          className="inline-flex min-h-10 w-full items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-400 sm:w-auto"
          disabled={pending}
          type="submit"
        >
          {pending ? copy.pendingLabel : copy.submitLabel}
        </button>
      </div>
    </form>
  )
}
