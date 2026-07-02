import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { ChangePasswordForm } from "@/components/forms/change-password-form"
import { getHomePathForRole } from "@/lib/auth/routes"
import { getCurrentActiveUser } from "@/lib/auth/session"

export const metadata: Metadata = {
  title: "Definir senha | Jaziggo",
}

export default async function ChangePasswordPage() {
  const user = await getCurrentActiveUser()

  if (!user) {
    redirect("/login")
  }

  if (!user.mustChangePassword) {
    redirect(getHomePathForRole(user.role))
  }

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-slate-950 px-4 py-12">
      <section
        aria-labelledby="change-password-title"
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm sm:p-8"
      >
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-400">
            Jaziggo
          </p>
          <h1
            className="text-2xl font-semibold tracking-tight text-white"
            id="change-password-title"
          >
            Defina sua senha
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Escolha uma senha própria para concluir o primeiro acesso ou a redefinição administrativa.
          </p>
        </div>

        <ChangePasswordForm />
      </section>
    </main>
  )
}
