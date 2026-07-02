"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useId, useState, type FormEvent } from "react"

import {
  DocumentInputFields,
  isDocumentLengthValid,
  onlyDocumentDigits,
  type DocumentType,
} from "@/components/ui/document-input-fields"
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
  cancelHref?: string
  className?: string
}>

type ResponsibleFormPayload = {
  fullName?: string
  documentType?: DocumentType
  document?: string
  phone?: string
  email?: string
  address?: string
}

const FORM_COPY = {
  create: {
    title: "Novo responsável",
    description:
      "Cadastre uma pessoa de contato administrativo, sem criar acesso ao sistema.",
    submitLabel: "Cadastrar responsável",
    pendingLabel: "Criando...",
    successMessage: "Responsável criado com sucesso.",
    errorMessage:
      "Não foi possível criar o responsável. Revise os dados e tente novamente.",
  },
  edit: {
    title: "Editar responsável",
    description:
      "Atualize dados administrativos necessários para manutenção do cadastro.",
    submitLabel: "Salvar alterações",
    pendingLabel: "Salvando...",
    successMessage: "Responsável atualizado com sucesso.",
    errorMessage:
      "Não foi possível atualizar o responsável. Revise os dados e tente novamente.",
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

function selectedDocumentType(formData: FormData): DocumentType | undefined {
  const value = fieldValue(formData, "documentType")

  return value === "CPF" || value === "RG" ? value : undefined
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
  cancelHref,
  className,
}: ResponsibleFormProps) {
  const router = useRouter()
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
      setErrorMessage("Selecione um responsável válido antes de editar.")
      return
    }

    const form = event.currentTarget
    const formData = new FormData(form)
    const fullName = fieldValue(formData, "fullName")
    const document = optionalFieldValue(formData, "document")
    const documentType = document ? selectedDocumentType(formData) : undefined
    const payload: ResponsibleFormPayload = {
      fullName,
      ...(document ? { document: onlyDocumentDigits(document), documentType } : {}),
      phone: optionalFieldValue(formData, "phone"),
      email: optionalFieldValue(formData, "email"),
      address: optionalFieldValue(formData, "address"),
    }

    if (fullName.length === 0) {
      setSuccessMessage(null)
      setErrorMessage("Informe o nome completo do responsável.")
      return
    }

    if (payload.document && (!payload.documentType || !isDocumentLengthValid(payload.documentType, payload.document))) {
      setSuccessMessage(null)
      setErrorMessage(
        payload.documentType === "CPF"
          ? "Informe um CPF válido com 11 números."
          : "Informe um RG válido usando apenas números.",
      )
      return
    }

    if (mode === "create" && !hasContactOrIdentifier(payload)) {
      setSuccessMessage(null)
      setErrorMessage("Informe ao menos um documento, telefone, e-mail ou endereço.")
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
        setErrorMessage(
          response.status === 409
            ? "Já existe um cadastro com esse tipo e número de documento."
            : copy.errorMessage,
        )
        return
      }

      setSuccessMessage(copy.successMessage)
      onSuccess?.(body.data)

      if (mode === "create") {
        form.reset()
      }

      if (mode === "edit" && cancelHref) {
        router.push(cancelHref)
      }

      router.refresh()
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
        <ErrorMessage id={errorId} message={errorMessage} title="Ação não concluída" />
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

        <div className="sm:col-span-2">
          <DocumentInputFields
            baseId={formId}
            currentDocumentMasked={responsible?.documentMasked}
            currentDocumentType={responsible?.documentType}
            editMode={mode === "edit"}
          />
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
            Endereço
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

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        {mode === "edit" && cancelHref ? (
          <Link
            className="inline-flex min-h-10 w-full items-center justify-center rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 sm:w-auto"
            href={cancelHref}
          >
            Cancelar alterações
          </Link>
        ) : null}
        <button
          aria-busy={pending}
          className="inline-flex min-h-10 w-full items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:bg-zinc-400 sm:w-auto"
          disabled={pending}
          type="submit"
        >
          {pending ? copy.pendingLabel : copy.submitLabel}
        </button>
      </div>
    </form>
  )
}
