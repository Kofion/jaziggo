import type { Metadata } from "next"

import { LoginForm } from "../../../components/forms/login-form"

export const metadata: Metadata = {
  title: "Entrar | Jaziggo",
  description: "Acesso interno ao sistema Jaziggo",
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-slate-950 px-4 py-12">
      <section
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm sm:p-8"
        aria-labelledby="login-title"
      >
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold tracking-wide text-emerald-400 uppercase">
            Jaziggo
          </p>
          <h1
            id="login-title"
            className="text-2xl font-semibold tracking-tight text-white"
          >
            Acesso ao sistema
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Entre com as credenciais fornecidas pela administração do
            cemitério.
          </p>
        </div>

        <LoginForm />

        <p className="mt-6 border-t border-slate-800 pt-5 text-xs leading-5 text-slate-400">
          Acesso exclusivo para administradores e funcionários autorizados.
        </p>
      </section>
    </main>
  )
}
