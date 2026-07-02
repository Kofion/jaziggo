"use client"

import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"

import { getHomePathForRole } from "@/lib/auth/routes"
import { USER_ROLE, type UserRole } from "@/types/user"

const GENERIC_LOGIN_ERROR =
  "Não foi possível entrar. Verifique os dados informados e tente novamente."

type LoginResponse = Readonly<{
  success: boolean
  data?: {
    role?: UserRole
    mustChangePassword?: boolean
  }
}>

export function LoginForm() {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (pending) return

    const form = event.currentTarget
    const formData = new FormData(form)
    const email = formData.get("email")
    const password = formData.get("password")

    if (typeof email !== "string" || typeof password !== "string") {
      setErrorMessage(GENERIC_LOGIN_ERROR)
      return
    }

    setErrorMessage(null)
    setPending(true)

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        setErrorMessage(GENERIC_LOGIN_ERROR)
        return
      }

      const payload = (await response.json()) as LoginResponse
      const role = payload.data?.role
      const mustChangePassword = payload.data?.mustChangePassword === true

      if (mustChangePassword) {
        router.replace("/change-password")
        return
      }

      router.replace(
        role === USER_ROLE.ADMIN || role === USER_ROLE.EMPLOYEE
          ? getHomePathForRole(role)
          : "/dashboard",
      )
    } catch {
      setErrorMessage(GENERIC_LOGIN_ERROR)
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      className="space-y-5"
      onSubmit={handleSubmit}
      aria-busy={pending}
    >
      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-medium text-slate-100"
        >
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          disabled={pending}
          aria-describedby={errorMessage ? "login-error" : undefined}
          className="block min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base text-white outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 disabled:cursor-not-allowed disabled:bg-slate-800"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-medium text-slate-100"
        >
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={8}
          required
          disabled={pending}
          aria-describedby={errorMessage ? "login-error" : undefined}
          className="block min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base text-white outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 disabled:cursor-not-allowed disabled:bg-slate-800"
        />
      </div>

      <div
        id="login-error"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className={
          errorMessage
            ? "rounded-lg border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-200"
            : "sr-only"
        }
      >
        {errorMessage ?? ""}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex min-h-11 w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  )
}
