"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useId, useState, type FormEvent } from "react"

import { ErrorMessage } from "@/components/ui/error-message"
import type { ApiEnvelope } from "@/types/api"
import {
  BURIAL_SPACE_STATUS,
  BURIAL_SPACE_TYPE,
  type BurialSpaceListItemDto,
  type BurialSpaceLocation,
  type BurialSpaceType,
  type CreateBurialSpaceInput,
  type InitialBurialSpaceStatus,
  type UpdateBurialSpaceInput,
} from "@/types/burial-space"

type BurialSpaceFormMode = "create" | "edit"

type BurialSpaceFormProps = Readonly<{
  mode: BurialSpaceFormMode
  space?: BurialSpaceListItemDto
  onSuccess?: (space: BurialSpaceListItemDto) => void
  cancelHref?: string
  className?: string
}>

type LocationField = keyof BurialSpaceLocation

const TYPE_OPTIONS = [
  { label: "Sepultura", value: BURIAL_SPACE_TYPE.SEPULTURA },
  { label: "Jazigo", value: BURIAL_SPACE_TYPE.JAZIGO },
] as const satisfies ReadonlyArray<{ label: string; value: BurialSpaceType }>

const INITIAL_STATUS_OPTIONS = [
  { label: "Disponível", value: BURIAL_SPACE_STATUS.AVAILABLE },
  { label: "Reservado", value: BURIAL_SPACE_STATUS.RESERVED },
  { label: "Inativo", value: BURIAL_SPACE_STATUS.INACTIVE },
] as const satisfies ReadonlyArray<{
  label: string
  value: InitialBurialSpaceStatus
}>

const LOCATION_FIELDS = [
  { label: "Setor", name: "sector" },
  { label: "Bloco", name: "block" },
  { label: "Rua", name: "street" },
  { label: "Quadra/Fila", name: "row" },
  { label: "Numero", name: "number" },
  { label: "Complemento", name: "complement" },
] as const satisfies ReadonlyArray<{ label: string; name: LocationField }>

const FORM_COPY = {
  create: {
    title: "Novo espaço",
    description: "Cadastre uma sepultura ou jazigo com identificação, localização e capacidade.",
    submitLabel: "Cadastrar espaço",
    pendingLabel: "Criando...",
    successMessage: "Espaço criado com sucesso.",
    errorMessage: "Não foi possível criar o espaço. Revise os dados e tente novamente.",
  },
  edit: {
    title: "Editar espaço",
    description: "Atualize dados cadastrais, localização e capacidade configurada.",
    submitLabel: "Salvar alterações",
    pendingLabel: "Salvando...",
    successMessage: "Espaço atualizado com sucesso.",
    errorMessage: "Não foi possível atualizar o espaço. Revise os dados e tente novamente.",
  },
} as const satisfies Record<
  BurialSpaceFormMode,
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

function getLocationFields(formData: FormData): BurialSpaceLocation {
  return {
    sector: optionalFieldValue(formData, "sector"),
    block: optionalFieldValue(formData, "block"),
    street: optionalFieldValue(formData, "street"),
    row: optionalFieldValue(formData, "row"),
    number: optionalFieldValue(formData, "number"),
    complement: optionalFieldValue(formData, "complement"),
  }
}

function hasLocation(location: BurialSpaceLocation) {
  return Object.values(location).some((value) => value !== undefined)
}

function burialSpaceEndpoint(mode: BurialSpaceFormMode, space?: BurialSpaceListItemDto) {
  if (mode === "create") {
    return "/api/v1/burial-spaces"
  }

  if (!space) {
    return null
  }

  return `/api/v1/burial-spaces/${encodeURIComponent(space.id)}`
}

export function BurialSpaceForm({
  mode,
  space,
  onSuccess,
  cancelHref,
  className,
}: BurialSpaceFormProps) {
  const router = useRouter()
  const copy = FORM_COPY[mode]
  const formId = useId()
  const errorId = useId()
  const successId = useId()
  const initialType = space?.type ?? BURIAL_SPACE_TYPE.SEPULTURA
  const [spaceType, setSpaceType] = useState<BurialSpaceType>(initialType)
  const [capacity, setCapacity] = useState(String(space?.capacity ?? 1))
  const [pending, setPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const describedBy = [
    errorMessage ? errorId : undefined,
    successMessage ? successId : undefined,
  ]
    .filter(Boolean)
    .join(" ")
  const capacityValue = spaceType === BURIAL_SPACE_TYPE.SEPULTURA ? "1" : capacity

  function resetCreateState(form: HTMLFormElement) {
    form.reset()
    setSpaceType(BURIAL_SPACE_TYPE.SEPULTURA)
    setCapacity("1")
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const endpoint = burialSpaceEndpoint(mode, space)

    if (!endpoint) {
      setSuccessMessage(null)
      setErrorMessage("Selecione um espaço valido antes de editar.")
      return
    }

    const form = event.currentTarget
    const formData = new FormData(form)
    const identifier = fieldValue(formData, "identifier")
    const location = getLocationFields(formData)

    if (!hasLocation(location)) {
      setSuccessMessage(null)
      setErrorMessage("Informe pelo menos um componente de localização.")
      return
    }

    const parsedCapacity =
      spaceType === BURIAL_SPACE_TYPE.SEPULTURA ? 1 : Number(capacity)

    if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1) {
      setSuccessMessage(null)
      setErrorMessage("Informe uma capacidade positiva para jazigos.")
      return
    }

    const basePayload = {
      identifier,
      ...location,
      type: spaceType,
      capacity: parsedCapacity,
    }
    const payload =
      mode === "create"
        ? ({
            ...basePayload,
            status: fieldValue(formData, "status") as InitialBurialSpaceStatus,
          } as CreateBurialSpaceInput)
        : (basePayload as UpdateBurialSpaceInput)

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
      const body = (await response.json().catch(() => null)) as ApiEnvelope<BurialSpaceListItemDto> | null

      if (!response.ok || !body?.success) {
        setErrorMessage(copy.errorMessage)
        return
      }

      setSuccessMessage(copy.successMessage)
      onSuccess?.(body.data)

      if (mode === "create") {
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
        <div>
          <label
            className="mb-2 block text-sm font-medium text-zinc-800"
            htmlFor={`${formId}-identifier`}
          >
            Identificação
          </label>
          <input
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            defaultValue={space?.identifier ?? ""}
            id={`${formId}-identifier`}
            maxLength={120}
            name="identifier"
            required
            type="text"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-800" htmlFor={`${formId}-type`}>
            Tipo
          </label>
          <select
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            id={`${formId}-type`}
            name="type"
            onChange={(event) => {
              const nextType = event.currentTarget.value as BurialSpaceType
              setSpaceType(nextType)

              if (nextType === BURIAL_SPACE_TYPE.SEPULTURA) {
                setCapacity("1")
              }
            }}
            required
            value={spaceType}
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium text-zinc-800"
            htmlFor={`${formId}-capacity`}
          >
            Capacidade
          </label>
          <input
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20 read-only:bg-zinc-100 read-only:text-zinc-600"
            id={`${formId}-capacity`}
            inputMode="numeric"
            min={1}
            name="capacity"
            onChange={(event) => {
              setCapacity(event.currentTarget.value)
            }}
            readOnly={spaceType === BURIAL_SPACE_TYPE.SEPULTURA}
            required
            type="number"
            value={capacityValue}
          />
        </div>

        {mode === "create" ? (
          <div>
            <label
              className="mb-2 block text-sm font-medium text-zinc-800"
              htmlFor={`${formId}-status`}
            >
              Status inicial
            </label>
            <select
              className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
              defaultValue={BURIAL_SPACE_STATUS.AVAILABLE}
              id={`${formId}-status`}
              name="status"
              required
            >
              {INITIAL_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-zinc-950">Localização</legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LOCATION_FIELDS.map((field) => (
            <div key={field.name}>
              <label
                className="mb-2 block text-sm font-medium text-zinc-800"
                htmlFor={`${formId}-${field.name}`}
              >
                {field.label}
              </label>
              <input
                className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
                defaultValue={space?.[field.name] ?? ""}
                id={`${formId}-${field.name}`}
                maxLength={120}
                name={field.name}
                type="text"
              />
            </div>
          ))}
        </div>
      </fieldset>

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
