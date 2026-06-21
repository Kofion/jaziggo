"use client"

import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"

const GENERIC_LOGIN_ERROR =
  "Não foi possível entrar. Verifique os dados informados e tente novamente."

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

      router.replace("/")
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
          className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-100"
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
          className="block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/30 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-400 dark:focus:ring-emerald-400/30 dark:disabled:bg-slate-800"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-100"
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
          className="block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/30 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-400 dark:focus:ring-emerald-400/30 dark:disabled:bg-slate-800"
        />
      </div>

      <div
        id="login-error"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className={
          errorMessage
            ? "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
            : "sr-only"
        }
      >
        {errorMessage ?? ""}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex min-h-11 w-full items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:focus-visible:outline-emerald-400"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  )
}
