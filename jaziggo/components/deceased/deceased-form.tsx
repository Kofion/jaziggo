"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useId, useState, type FormEvent } from "react"

import { DuplicateReview } from "@/components/deceased/duplicate-review"
import {
  DocumentInputFields,
  isDocumentLengthValid,
  onlyDocumentDigits,
  type DocumentType,
} from "@/components/ui/document-input-fields"
import { ErrorMessage } from "@/components/ui/error-message"
import { RequiredMark } from "@/components/ui/required-mark"
import type { ApiEnvelope, PaginationMeta } from "@/types/api"
import type {
  CreateDeceasedInput,
  DeceasedDetailDto,
  DeceasedDuplicateCandidateDto,
} from "@/types/deceased"

type DeceasedFormMode = "create" | "edit"

type DeceasedFormProps = Readonly<{
  mode: DeceasedFormMode
  deceased?: DeceasedDetailDto
  onSuccess?: (deceased: DeceasedDetailDto) => void
  cancelHref?: string
  className?: string
}>

type DeceasedFormPayload = {
  fullName: string
  documentType?: DocumentType
  document?: string
  birthDate?: string
  deathDate?: string
  burialDate?: string
  datesUnknown?: true
  notes?: string
}

type DuplicatePageResponse = PaginationMeta & {
  data: DeceasedDuplicateCandidateDto[]
}

const FORM_COPY = {
  create: {
    title: "Novo falecido",
    description:
      "Cadastre o falecido com nome, datas disponíveis e indicação explícita quando as datas forem desconhecidas.",
    submitLabel: "Cadastrar falecido",
    pendingLabel: "Criando...",
    successMessage: "Falecido criado com sucesso.",
    errorMessage:
      "Não foi possível criar o falecido. Revise os dados e tente novamente.",
  },
  edit: {
    title: "Editar falecido",
    description:
      "Atualize os dados administrativos do falecido preservando a indicação histórica quando aplicável.",
    submitLabel: "Salvar alterações",
    pendingLabel: "Salvando...",
    successMessage: "Falecido atualizado com sucesso.",
    errorMessage:
      "Não foi possível atualizar o falecido. Revise os dados e tente novamente.",
  },
} as const satisfies Record<
  DeceasedFormMode,
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

function checkboxValue(formData: FormData, field: string) {
  return formData.get(field) === "on"
}

function deceasedEndpoint(mode: DeceasedFormMode, deceased?: DeceasedDetailDto) {
  if (mode === "create") {
    return "/api/v1/deceased"
  }

  if (!deceased) {
    return null
  }

  return `/api/v1/deceased/${encodeURIComponent(deceased.id)}`
}

function selectedDocumentType(formData: FormData): DocumentType | undefined {
  const value = fieldValue(formData, "documentType")

  return value === "CPF" || value === "RG" ? value : undefined
}

function buildPayload(formData: FormData): DeceasedFormPayload {
  const datesUnknown = checkboxValue(formData, "datesUnknown")
  const document = optionalFieldValue(formData, "document")
  const documentType = document ? selectedDocumentType(formData) : undefined
  const payload: DeceasedFormPayload = {
    fullName: fieldValue(formData, "fullName"),
    ...(document ? { document: onlyDocumentDigits(document), documentType } : {}),
    birthDate: optionalFieldValue(formData, "birthDate"),
    notes: optionalFieldValue(formData, "notes"),
  }

  if (datesUnknown) {
    return {
      ...payload,
      datesUnknown: true,
    }
  }

  return {
    ...payload,
    deathDate: optionalFieldValue(formData, "deathDate"),
    burialDate: optionalFieldValue(formData, "burialDate"),
  }
}

function validatePayload(payload: DeceasedFormPayload) {
  if (payload.fullName.length === 0) {
    return "Informe o nome completo do falecido."
  }

  if (payload.document && (!payload.documentType || !isDocumentLengthValid(payload.documentType, payload.document))) {
    return payload.documentType === "CPF"
      ? "Informe um CPF válido com 11 números."
      : "Informe um RG válido usando apenas números."
  }

  if (payload.datesUnknown === true) {
    return null
  }

  if (!payload.deathDate && !payload.burialDate) {
    return "Informe uma data de falecimento, uma data de sepultamento ou marque datas desconhecidas."
  }

  if (payload.birthDate && payload.deathDate && payload.birthDate > payload.deathDate) {
    return "A data de nascimento não pode ser posterior ao falecimento."
  }

  if (payload.birthDate && payload.burialDate && payload.birthDate > payload.burialDate) {
    return "A data de nascimento não pode ser posterior ao sepultamento."
  }

  if (payload.deathDate && payload.burialDate && payload.burialDate < payload.deathDate) {
    return "A data de sepultamento não pode ser anterior ao falecimento."
  }

  return null
}

async function readJsonEnvelope<TData>(response: Response) {
  return (await response.json().catch(() => null)) as ApiEnvelope<TData> | null
}

export function DeceasedForm({
  mode,
  deceased,
  onSuccess,
  cancelHref,
  className,
}: DeceasedFormProps) {
  const router = useRouter()
  const copy = FORM_COPY[mode]
  const formId = useId()
  const errorId = useId()
  const successId = useId()
  const [datesUnknown, setDatesUnknown] = useState(deceased?.datesUnknown ?? false)
  const [pending, setPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [pendingPayload, setPendingPayload] = useState<CreateDeceasedInput | null>(null)
  const [duplicateCandidates, setDuplicateCandidates] = useState<
    DeceasedDuplicateCandidateDto[]
  >([])
  const describedBy = [
    errorMessage ? errorId : undefined,
    successMessage ? successId : undefined,
  ]
    .filter(Boolean)
    .join(" ")

  function resetDuplicateReview() {
    setPendingPayload(null)
    setDuplicateCandidates([])
  }

  function resetCreateState(form: HTMLFormElement) {
    form.reset()
    setDatesUnknown(false)
    resetDuplicateReview()
  }

  async function submitPayload(payload: CreateDeceasedInput, form?: HTMLFormElement) {
    const endpoint = deceasedEndpoint(mode, deceased)

    if (!endpoint) {
      setSuccessMessage(null)
      setErrorMessage("Selecione um falecido válido antes de editar.")
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
        body: JSON.stringify(payload),
      })
      const body = await readJsonEnvelope<DeceasedDetailDto>(response)

      if (!response.ok || !body?.success) {
        setErrorMessage(
          response.status === 409
            ? "Já existe um cadastro com esse tipo e número de documento."
            : copy.errorMessage,
        )
        return
      }

      setSuccessMessage(copy.successMessage)
      resetDuplicateReview()
      onSuccess?.(body.data)

      if (mode === "create" && form) {
        resetCreateState(form)
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

  async function checkDuplicates(payload: CreateDeceasedInput) {
    const response = await fetch("/api/v1/deceased/check-duplicates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    })
    const body = await readJsonEnvelope<DuplicatePageResponse>(response)

    if (!response.ok || !body?.success) {
      throw new Error(
        response.status === 422
          ? "Revise os dados do falecido antes de verificar duplicidades."
          : "Não foi possível revisar duplicidades. Tente novamente.",
      )
    }

    const candidates = body.data.data.filter((candidate) => candidate.id !== deceased?.id)

    return candidates
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = event.currentTarget
    const payload = buildPayload(new FormData(form))
    const validationMessage = validatePayload(payload)

    if (validationMessage) {
      setSuccessMessage(null)
      setErrorMessage(validationMessage)
      resetDuplicateReview()
      return
    }

    setPending(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    resetDuplicateReview()

    try {
      const candidates = await checkDuplicates(payload as CreateDeceasedInput)

      if (candidates.length > 0) {
        setPendingPayload(payload as CreateDeceasedInput)
        setDuplicateCandidates(candidates)
        return
      }

      await submitPayload(payload as CreateDeceasedInput, form)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível revisar duplicidades. Tente novamente.",
      )
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
            Nome completo<RequiredMark />
          </label>
          <input
            autoComplete="off"
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            defaultValue={deceased?.fullName ?? ""}
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
            currentDocumentMasked={deceased?.documentMasked}
            currentDocumentType={deceased?.documentType}
            editMode={mode === "edit"}
          />
        </div>
        <div>
          <label
            className="mb-2 block text-sm font-medium text-zinc-800"
            htmlFor={`${formId}-birthDate`}
          >
            Nascimento
          </label>
          <input
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            defaultValue={deceased?.birthDate ?? ""}
            id={`${formId}-birthDate`}
            name="birthDate"
            type="date"
          />
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium text-zinc-800"
            htmlFor={`${formId}-deathDate`}
          >
            Falecimento<RequiredMark />
          </label>
          <input
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20 disabled:bg-zinc-100 disabled:text-zinc-500"
            defaultValue={deceased?.deathDate ?? ""}
            disabled={datesUnknown}
            id={`${formId}-deathDate`}
            name="deathDate"
            type="date"
          />
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium text-zinc-800"
            htmlFor={`${formId}-burialDate`}
          >
            Sepultamento<RequiredMark />
          </label>
          <input
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20 disabled:bg-zinc-100 disabled:text-zinc-500"
            defaultValue={deceased?.burialDate ?? ""}
            disabled={datesUnknown}
            id={`${formId}-burialDate`}
            name="burialDate"
            type="date"
          />
        </div>
      </div>

      <label className="flex gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-800">
        <input
          checked={datesUnknown}
          className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950"
          name="datesUnknown"
          onChange={(event) => {
            setDatesUnknown(event.currentTarget.checked)
          }}
          type="checkbox"
        />
        <span>
          Datas de falecimento e sepultamento desconhecidas para registro histórico.<RequiredMark />
        </span>
      </label>

      <div>
        <label
          className="mb-2 block text-sm font-medium text-zinc-800"
          htmlFor={`${formId}-notes`}
        >
          Observações
        </label>
        <textarea
          className="min-h-28 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
          defaultValue={deceased?.notes ?? ""}
          id={`${formId}-notes`}
          maxLength={2000}
          name="notes"
        />
      </div>

      <DuplicateReview
        candidates={duplicateCandidates}
        onCancel={resetDuplicateReview}
        onProceed={() => {
          if (pendingPayload) {
            void submitPayload(pendingPayload)
          }
        }}
        pending={pending}
      />

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
          disabled={pending || duplicateCandidates.length > 0}
          type="submit"
        >
          {pending ? copy.pendingLabel : copy.submitLabel}
        </button>
      </div>
    </form>
  )
}
