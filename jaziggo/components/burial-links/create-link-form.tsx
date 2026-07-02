"use client"

import { useId, useState, type FormEvent } from "react"

import { ErrorMessage } from "@/components/ui/error-message"
import { RequiredMark } from "@/components/ui/required-mark"
import {
  DOMAIN_ERROR_CODE,
  type ApiEnvelope,
} from "@/types/api"
import type {
  ActiveBurialLink,
  CreateActiveBurialLinkCommand,
} from "@/types/burial-link"
import type { BurialSpaceStatus } from "@/types/burial-space"

type BurialLinkBlockReason =
  | "SPACE_RESERVED"
  | "SPACE_INACTIVE"
  | "SEPULTURA_OCCUPIED"
  | "JAZIGO_CAPACITY_REACHED"
  | "SPACE_CAPACITY_REACHED"
  | "DECEASED_ALREADY_LINKED"

type SpaceAvailability = Readonly<{
  canLink: boolean
  status: BurialSpaceStatus
  capacity: number
  activeLinkCount: number
  reasonCode?: BurialLinkBlockReason
}>

type CreateLinkFormProps = Readonly<{
  deceasedId?: string
  burialSpaceId?: string
  responsibleId?: string
  onSuccess?: (link: ActiveBurialLink) => void
  className?: string
}>

const STATUS_LABELS = {
  AVAILABLE: "Disponível",
  OCCUPIED: "Ocupado",
  RESERVED: "Reservado",
  INACTIVE: "Inativo",
} as const satisfies Record<BurialSpaceStatus, string>

const BLOCK_REASON_MESSAGES = {
  SPACE_RESERVED:
    "A sepultura ou jazigo está reservado e não aceita novos vínculos.",
  SPACE_INACTIVE:
    "A sepultura ou jazigo está inativo e não aceita novos vínculos.",
  SEPULTURA_OCCUPIED:
    "Sepulturas aceitam somente um vínculo ativo.",
  JAZIGO_CAPACITY_REACHED:
    "A capacidade do jazigo foi atingida.",
  SPACE_CAPACITY_REACHED:
    "A capacidade do espaço foi atingida.",
  DECEASED_ALREADY_LINKED:
    "O falecido informado já possui vínculo ativo.",
} as const satisfies Record<BurialLinkBlockReason, string>

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function optionalValue(value: string) {
  const trimmedValue = value.trim()

  return trimmedValue.length > 0 ? trimmedValue : undefined
}

function errorMessageForCreateResponse(
  body: ApiEnvelope<ActiveBurialLink> | null,
) {
  if (body?.success === false) {
    if (body.error.code === DOMAIN_ERROR_CODE.CONFLICT) {
      return "Não foi possível criar o vínculo por conflito de ocupação. Verifique a capacidade atual antes de continuar."
    }

    if (body.error.code === DOMAIN_ERROR_CODE.NOT_FOUND) {
      return "Falecido, sepultura/jazigo ou responsável informado não foi encontrado."
    }

    if (body.error.code === DOMAIN_ERROR_CODE.VALIDATION_ERROR) {
      return "Revise os identificadores e a data de sepultamento antes de tentar novamente."
    }
  }

  return "Não foi possível criar o vínculo. Revise os dados e tente novamente."
}

function availabilityMessage(availability: SpaceAvailability) {
  if (availability.canLink) {
    return "Capacidade disponível para criar o vínculo."
  }

  if (availability.reasonCode) {
    return BLOCK_REASON_MESSAGES[availability.reasonCode]
  }

  return "A sepultura ou jazigo não está disponível para este vínculo."
}

async function readJsonEnvelope<TData>(response: Response) {
  return (await response.json().catch(() => null)) as ApiEnvelope<TData> | null
}

export function CreateLinkForm({
  deceasedId: initialDeceasedId,
  burialSpaceId: initialBurialSpaceId,
  responsibleId: initialResponsibleId,
  onSuccess,
  className,
}: CreateLinkFormProps) {
  const formId = useId()
  const errorId = useId()
  const successId = useId()
  const [deceasedId, setDeceasedId] = useState(initialDeceasedId ?? "")
  const [burialSpaceId, setBurialSpaceId] = useState(initialBurialSpaceId ?? "")
  const [responsibleId, setResponsibleId] = useState(initialResponsibleId ?? "")
  const [burialDate, setBurialDate] = useState("")
  const [availability, setAvailability] = useState<SpaceAvailability | null>(null)
  const [pending, setPending] = useState(false)
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const describedBy = [
    errorMessage ? errorId : undefined,
    successMessage ? successId : undefined,
  ]
    .filter(Boolean)
    .join(" ")

  function clearAvailability() {
    setAvailability(null)
  }

  async function checkAvailability() {
    const selectedDeceasedId = deceasedId.trim()
    const selectedBurialSpaceId = burialSpaceId.trim()

    if (selectedDeceasedId.length === 0 || selectedBurialSpaceId.length === 0) {
      setSuccessMessage(null)
      setErrorMessage("Informe o falecido e a sepultura ou jazigo para verificar a capacidade.")
      setAvailability(null)
      return null
    }

    setCheckingAvailability(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(
        `/api/v1/burial-links/validate-space/${encodeURIComponent(
          selectedBurialSpaceId,
        )}?deceasedId=${encodeURIComponent(selectedDeceasedId)}`,
        {
          credentials: "same-origin",
        },
      )
      const body = await readJsonEnvelope<SpaceAvailability>(response)

      if (!response.ok || !body?.success) {
        setAvailability(null)
        setErrorMessage(
          "Não foi possível verificar a capacidade. Revise os IDs informados.",
        )
        return null
      }

      setAvailability(body.data)
      return body.data
    } catch {
      setAvailability(null)
      setErrorMessage("Não foi possível verificar a capacidade. Tente novamente.")
      return null
    } finally {
      setCheckingAvailability(false)
    }
  }

  function buildPayload(): CreateActiveBurialLinkCommand {
    return {
      deceasedId: deceasedId.trim(),
      burialSpaceId: burialSpaceId.trim(),
      responsibleId: optionalValue(responsibleId),
      burialDate: optionalValue(burialDate),
      confirmation: true,
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const payload = buildPayload()

    if (payload.deceasedId.length === 0 || payload.burialSpaceId.length === 0) {
      setSuccessMessage(null)
      setErrorMessage("Informe o falecido e a sepultura ou jazigo do vínculo.")
      setAvailability(null)
      return
    }

    setPending(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const currentAvailability = await checkAvailability()

      if (!currentAvailability) {
        return
      }

      if (!currentAvailability.canLink) {
        setErrorMessage(availabilityMessage(currentAvailability))
        return
      }

      const response = await fetch("/api/v1/burial-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      })
      const body = await readJsonEnvelope<ActiveBurialLink>(response)

      if (!response.ok || !body?.success) {
        setErrorMessage(errorMessageForCreateResponse(body))
        return
      }

      setSuccessMessage("Vínculo criado com sucesso.")
      setAvailability({
        ...currentAvailability,
        activeLinkCount: currentAvailability.activeLinkCount + 1,
      })
      onSuccess?.(body.data)
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
      aria-busy={pending || checkingAvailability}
      aria-describedby={describedBy || undefined}
      className={cx("space-y-5 rounded-md border border-zinc-200 bg-white p-4", className)}
      onSubmit={handleSubmit}
    >
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-zinc-950">Novo vínculo de sepultamento</h2>
        <p className="text-sm leading-6 text-zinc-600">
          Informe os IDs internos para vincular um falecido a uma sepultura ou jazigo existente.
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
        {initialDeceasedId ? null : (
          <div>
            <label
              className="mb-2 block text-sm font-medium text-zinc-800"
              htmlFor={`${formId}-deceasedId`}
            >
              ID do falecido<RequiredMark />
            </label>
            <input
              autoComplete="off"
              className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 font-mono text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
              id={`${formId}-deceasedId`}
              name="deceasedId"
              onChange={(event) => {
                setDeceasedId(event.currentTarget.value)
                clearAvailability()
              }}
              required
              type="text"
              value={deceasedId}
            />
          </div>
        )}

        {initialBurialSpaceId ? null : (
          <div>
            <label
              className="mb-2 block text-sm font-medium text-zinc-800"
              htmlFor={`${formId}-burialSpaceId`}
            >
              ID da sepultura ou jazigo<RequiredMark />
            </label>
            <input
              autoComplete="off"
              className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 font-mono text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
              id={`${formId}-burialSpaceId`}
              name="burialSpaceId"
              onChange={(event) => {
                setBurialSpaceId(event.currentTarget.value)
                clearAvailability()
              }}
              required
              type="text"
              value={burialSpaceId}
            />
          </div>
        )}

        {initialResponsibleId ? null : (
          <div>
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
              onChange={(event) => {
                setResponsibleId(event.currentTarget.value)
              }}
              type="text"
              value={responsibleId}
            />
          </div>
        )}

        <div>
          <label
            className="mb-2 block text-sm font-medium text-zinc-800"
            htmlFor={`${formId}-burialDate`}
          >
            Data de sepultamento
          </label>
          <input
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            id={`${formId}-burialDate`}
            name="burialDate"
            onChange={(event) => {
              setBurialDate(event.currentTarget.value)
            }}
            type="date"
            value={burialDate}
          />
        </div>
      </div>

      <div className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-950">Capacidade</h3>
            {availability ? (
              <dl className="mt-2 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-semibold uppercase text-zinc-500">Status</dt>
                  <dd className="mt-1 text-zinc-950">{STATUS_LABELS[availability.status]}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-zinc-500">Ocupação</dt>
                  <dd className="mt-1 text-zinc-950">
                    {availability.activeLinkCount}/{availability.capacity}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-zinc-500">Resultado</dt>
                  <dd
                    className={cx(
                      "mt-1 font-medium",
                      availability.canLink ? "text-emerald-800" : "text-amber-900",
                    )}
                  >
                    {availability.canLink ? "Permitido" : "Bloqueado"}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-1 text-sm leading-6 text-zinc-600">
                Verifique a sepultura ou jazigo antes de criar o vínculo.
              </p>
            )}
          </div>
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-zinc-300 px-4 text-sm font-semibold text-zinc-700 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
            disabled={pending || checkingAvailability}
            onClick={() => {
              void checkAvailability()
            }}
            type="button"
          >
            {checkingAvailability ? "Verificando..." : "Verificar capacidade"}
          </button>
        </div>

        {availability ? (
          <p className="mt-3 text-sm leading-6 text-zinc-700">
            {availabilityMessage(availability)}
          </p>
        ) : null}
      </div>

      <div className="flex justify-end">
        <button
          aria-busy={pending}
          className="inline-flex min-h-10 w-full items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-400 sm:w-auto"
          disabled={pending || checkingAvailability}
          type="submit"
        >
          {pending ? "Criando..." : "Criar vínculo"}
        </button>
      </div>
    </form>
  )
}
