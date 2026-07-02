"use client"

import { useId, useState, type FormEvent } from "react"

import { ErrorMessage } from "@/components/ui/error-message"
import { DOMAIN_ERROR_CODE, type ApiEnvelope } from "@/types/api"
import {
  RESPONSIBLE_LINK_TYPE,
  type CreateResponsibleLinkCommand,
  type ResponsibleLinkDto,
  type ResponsibleLinkType,
} from "@/types/responsible"

type ResponsibleLinkFormProps = Readonly<{
  responsibleId?: string
  deceasedId?: string
  burialSpaceId?: string
  onSuccess?: (link: ResponsibleLinkDto) => void
  className?: string
}>

const LINK_TYPE_OPTIONS = [
  { label: "Falecido", value: RESPONSIBLE_LINK_TYPE.DECEASED },
  { label: "Sepultura ou jazigo", value: RESPONSIBLE_LINK_TYPE.BURIAL_SPACE },
] as const satisfies ReadonlyArray<{
  label: string
  value: ResponsibleLinkType
}>

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function fieldValue(formData: FormData, field: string) {
  const value = formData.get(field)

  return typeof value === "string" ? value.trim() : ""
}

function buildPayload(
  responsibleId: string,
  linkType: ResponsibleLinkType,
  targetId: string,
): CreateResponsibleLinkCommand {
  if (linkType === RESPONSIBLE_LINK_TYPE.DECEASED) {
    return {
      responsibleId,
      linkType,
      deceasedId: targetId,
    }
  }

  return {
    responsibleId,
    linkType,
    burialSpaceId: targetId,
  }
}

function errorMessageForResponse(
  body: ApiEnvelope<ResponsibleLinkDto> | null,
  fallback: string,
) {
  if (body?.success === false) {
    if (body.error.code === DOMAIN_ERROR_CODE.NOT_FOUND) {
      return "Responsável ou alvo informado não foi encontrado."
    }

    if (body.error.code === DOMAIN_ERROR_CODE.CONFLICT) {
      return "Este vínculo ativo já existe para o responsável informado."
    }

    if (body.error.code === DOMAIN_ERROR_CODE.VALIDATION_ERROR) {
      return "Revise os identificadores e o tipo de alvo antes de tentar novamente."
    }
  }

  return fallback
}

export function ResponsibleLinkForm({
  responsibleId,
  deceasedId,
  burialSpaceId,
  onSuccess,
  className,
}: ResponsibleLinkFormProps) {
  const formId = useId()
  const errorId = useId()
  const successId = useId()
  const fixedTargetId = deceasedId ?? burialSpaceId
  const fixedLinkType = deceasedId
    ? RESPONSIBLE_LINK_TYPE.DECEASED
    : burialSpaceId
      ? RESPONSIBLE_LINK_TYPE.BURIAL_SPACE
      : undefined
  const [linkType, setLinkType] = useState<ResponsibleLinkType>(
    fixedLinkType ?? RESPONSIBLE_LINK_TYPE.DECEASED,
  )
  const [pending, setPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const describedBy = [
    errorMessage ? errorId : undefined,
    successMessage ? successId : undefined,
  ]
    .filter(Boolean)
    .join(" ")
  const effectiveLinkType = fixedLinkType ?? linkType
  const targetLabel =
    effectiveLinkType === RESPONSIBLE_LINK_TYPE.DECEASED
      ? "ID do falecido"
      : "ID da sepultura ou jazigo"

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)
    const selectedResponsibleId = responsibleId ?? fieldValue(formData, "responsibleId")
    const targetId = fixedTargetId ?? fieldValue(formData, "targetId")

    if (selectedResponsibleId.length === 0 || targetId.length === 0) {
      setSuccessMessage(null)
      setErrorMessage("Informe o responsável e o alvo do vínculo.")
      return
    }

    const payload = buildPayload(selectedResponsibleId, effectiveLinkType, targetId)

    setPending(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const response = await fetch("/api/v1/responsibles/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      })
      const body = (await response.json().catch(() => null)) as
        | ApiEnvelope<ResponsibleLinkDto>
        | null

      if (!response.ok || !body?.success) {
        setErrorMessage(
          errorMessageForResponse(
            body,
            "Não foi possível criar o vínculo. Revise os dados e tente novamente.",
          ),
        )
        return
      }

      setSuccessMessage("Vínculo criado com sucesso.")
      onSuccess?.(body.data)
      form.reset()

      if (!fixedLinkType) {
        setLinkType(RESPONSIBLE_LINK_TYPE.DECEASED)
      }
    } catch {
      setErrorMessage(
        "Não foi possível criar o vínculo. Revise os dados e tente novamente.",
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
        <h2 className="text-base font-semibold text-zinc-950">
          Vincular responsável
        </h2>
        <p className="text-sm leading-6 text-zinc-600">
          Associe o responsável a um falecido ou a uma sepultura ou jazigo existente.
        </p>
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
        {responsibleId ? null : (
          <div className="sm:col-span-2">
            <label
              className="mb-2 block text-sm font-medium text-zinc-800"
              htmlFor={`${formId}-responsibleId`}
            >
              ID do responsável
            </label>
            <input
              autoComplete="off"
              className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 font-mono text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
              id={`${formId}-responsibleId`}
              name="responsibleId"
              required
              type="text"
            />
          </div>
        )}

        {fixedLinkType ? null : (
          <div>
            <label
              className="mb-2 block text-sm font-medium text-zinc-800"
              htmlFor={`${formId}-linkType`}
            >
              Tipo de alvo
            </label>
            <select
              className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
              id={`${formId}-linkType`}
              name="linkType"
              onChange={(event) => {
                setLinkType(event.currentTarget.value as ResponsibleLinkType)
              }}
              required
              value={linkType}
            >
              {LINK_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {fixedTargetId ? null : (
          <div>
            <label
              className="mb-2 block text-sm font-medium text-zinc-800"
              htmlFor={`${formId}-targetId`}
            >
              {targetLabel}
            </label>
            <input
              autoComplete="off"
              className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 font-mono text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
              id={`${formId}-targetId`}
              name="targetId"
              required
              type="text"
            />
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          aria-busy={pending}
          className="inline-flex min-h-10 w-full items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-400 sm:w-auto"
          disabled={pending}
          type="submit"
        >
          {pending ? "Vinculando..." : "Criar vínculo"}
        </button>
      </div>
    </form>
  )
}