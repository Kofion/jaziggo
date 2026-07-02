"use client"

import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"

import { RequiredMark } from "@/components/ui/required-mark"
import { getHomePathForRole } from "@/lib/auth/routes"
import type { ApiEnvelope } from "@/types/api"
import type { UserDto } from "@/types/user"

const GENERIC_ERROR =
  "Não foi possível definir a nova senha. Revise os campos e tente novamente."

export function ChangePasswordForm() {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (pending) return

    const form = event.currentTarget
    const formData = new FormData(form)
    const password = formData.get("password")
    const passwordConfirmation = formData.get("passwordConfirmation")

    if (
      typeof password !== "string" ||
      typeof passwordConfirmation !== "string" ||
      password !== passwordConfirmation
    ) {
      setErrorMessage(GENERIC_ERROR)
      return
    }

    setPending(true)
    setErrorMessage(null)

    try {
      const response = await fetch("/api/v1/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ password, passwordConfirmation }),
      })
      const body = (await response.json().catch(() => null)) as ApiEnvelope<UserDto> | null

      if (!response.ok || !body?.success) {
        setErrorMessage(GENERIC_ERROR)
        return
      }

      router.replace(getHomePathForRole(body.data.role))
      router.refresh()
    } catch {
      setErrorMessage(GENERIC_ERROR)
    } finally {
      setPending(false)
    }
  }

  return (
    <form aria-busy={pending} className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <label
          className="mb-2 block text-sm font-medium text-slate-100"
          htmlFor="password"
        >
          Nova senha<RequiredMark />
        </label>
        <input
          autoComplete="new-password"
          className="block min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 disabled:cursor-not-allowed disabled:bg-slate-800"
          disabled={pending}
          id="password"
          minLength={8}
          name="password"
          required
          type="password"
        />
      </div>

      <div>
        <label
          className="mb-2 block text-sm font-medium text-slate-100"
          htmlFor="passwordConfirmation"
        >
          Confirmar senha<RequiredMark />
        </label>
        <input
          autoComplete="new-password"
          className="block min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 disabled:cursor-not-allowed disabled:bg-slate-800"
          disabled={pending}
          id="passwordConfirmation"
          minLength={8}
          name="passwordConfirmation"
          required
          type="password"
        />
      </div>

      <div
        aria-atomic="true"
        aria-live="assertive"
        className={
          errorMessage
            ? "rounded-lg border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-200"
            : "sr-only"
        }
        id="change-password-error"
        role="alert"
      >
        {errorMessage ?? ""}
      </div>

      <button
        className="flex min-h-11 w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700"
        disabled={pending}
        type="submit"
      >
        {pending ? "Salvando..." : "Definir senha"}
      </button>
    </form>
  )
}
