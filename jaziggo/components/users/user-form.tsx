"use client"

import { useId, useState, type FormEvent } from "react"

import { ErrorMessage } from "@/components/ui/error-message"
import type { ApiEnvelope } from "@/types/api"
import {
  USER_ROLE,
  type CreateUserInput,
  type UpdateUserInput,
  type UserDto,
  type UserRole,
} from "@/types/user"

type UserFormMode = "create" | "edit"

type UserFormProps = Readonly<{
  mode: UserFormMode
  user?: UserDto
  onSuccess?: (user: UserDto) => void
  className?: string
}>

const ROLE_OPTIONS = [
  { label: "Administrador", value: USER_ROLE.ADMIN },
  { label: "Funcionario", value: USER_ROLE.EMPLOYEE },
] as const satisfies ReadonlyArray<{ label: string; value: UserRole }>

const FORM_COPY = {
  create: {
    title: "Novo usuario",
    description: "Cadastre uma conta interna autorizada a acessar o Jaziggo.",
    submitLabel: "Criar usuario",
    pendingLabel: "Criando...",
    successMessage: "Usuario criado com sucesso.",
    errorMessage: "Nao foi possivel criar o usuario. Revise os dados e tente novamente.",
  },
  edit: {
    title: "Editar usuario",
    description: "Atualize os dados administrativos da conta interna.",
    submitLabel: "Salvar alteracoes",
    pendingLabel: "Salvando...",
    successMessage: "Usuario atualizado com sucesso.",
    errorMessage: "Nao foi possivel atualizar o usuario. Revise os dados e tente novamente.",
  },
} as const satisfies Record<
  UserFormMode,
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

function userEndpoint(mode: UserFormMode, user?: UserDto) {
  if (mode === "create") {
    return "/api/v1/users"
  }

  if (!user) {
    return null
  }

  return `/api/v1/users/${encodeURIComponent(user.id)}`
}

export function UserForm({ mode, user, onSuccess, className }: UserFormProps) {
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

    const endpoint = userEndpoint(mode, user)

    if (!endpoint) {
      setSuccessMessage(null)
      setErrorMessage("Selecione um usuario valido antes de editar.")
      return
    }

    const form = event.currentTarget
    const formData = new FormData(form)
    const role = fieldValue(formData, "role") as UserRole
    const payload =
      mode === "create"
        ? ({
            name: fieldValue(formData, "name"),
            email: fieldValue(formData, "email"),
            password: fieldValue(formData, "password"),
            role,
          } satisfies CreateUserInput)
        : ({
            name: fieldValue(formData, "name"),
            email: fieldValue(formData, "email"),
            role,
          } satisfies UpdateUserInput)

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
      const body = (await response.json().catch(() => null)) as ApiEnvelope<UserDto> | null

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
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-800" htmlFor={`${formId}-name`}>
            Nome
          </label>
          <input
            autoComplete="name"
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            defaultValue={user?.name ?? ""}
            id={`${formId}-name`}
            maxLength={120}
            name="name"
            required
            type="text"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-800" htmlFor={`${formId}-email`}>
            E-mail
          </label>
          <input
            autoComplete="email"
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            defaultValue={user?.email ?? ""}
            id={`${formId}-email`}
            maxLength={254}
            name="email"
            required
            type="email"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-800" htmlFor={`${formId}-role`}>
            Perfil
          </label>
          <select
            className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            defaultValue={user?.role ?? USER_ROLE.EMPLOYEE}
            id={`${formId}-role`}
            name="role"
            required
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {mode === "create" ? (
          <div>
            <label
              className="mb-2 block text-sm font-medium text-zinc-800"
              htmlFor={`${formId}-password`}
            >
              Senha inicial
            </label>
            <input
              autoComplete="new-password"
              className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
              id={`${formId}-password`}
              minLength={8}
              name="password"
              required
              type="password"
            />
          </div>
        ) : null}
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
