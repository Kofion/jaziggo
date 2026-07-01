import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { getCurrentActiveUser } from "@/lib/auth/session"

export const metadata: Metadata = {
  title: "Principal | Jaziggo",
}

type WorkflowCardProps = Readonly<{
  href: string
  title: string
  description: string
  detail: string
}>

function WorkflowCard({ href, title, description, detail }: WorkflowCardProps) {
  return (
    <Link
      className="group block rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:!border-emerald-500 hover:!bg-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
      href={href}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 group-hover:!text-emerald-100">{detail}</p>
      <h2 className="mt-2 text-lg font-semibold text-zinc-950 group-hover:!text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-600 group-hover:!text-emerald-50">{description}</p>
    </Link>
  )
}

export default async function DashboardPage() {
  const currentUser = await getCurrentActiveUser()

  if (!currentUser) {
    redirect("/login")
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-medium text-zinc-500">Operação interna</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
          Tela principal
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-zinc-600">
          Acesse as funções de cadastro e busca usadas na rotina de atendimento e manutenção dos registros.
        </p>
      </header>

      <section aria-labelledby="priority-workflows-heading" className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-950" id="priority-workflows-heading">
            Funções principais
          </h2>
          <p className="text-sm text-zinc-600">
            Os atalhos abaixo concentram as ações operacionais disponíveis para funcionários.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <WorkflowCard
            description="Pesquise por nome, filtros operacionais e dados complementares para orientar familiares e visitantes."
            detail="Atendimento"
            href="/location-search"
            title="Buscar localização"
          />
          <WorkflowCard
            description="Cadastre, consulte e atualize registros de falecidos preservando dados históricos."
            detail="Cadastro"
            href="/deceased"
            title="Falecidos"
          />
          <WorkflowCard
            description="Mantenha sepulturas e jazigos com identificação, localização, capacidade e status."
            detail="Cadastro"
            href="/burial-spaces"
            title="Sepulturas e jazigos"
          />
          <WorkflowCard
            description="Consulte responsáveis administrativos e mantenha vínculos com registros existentes."
            detail="Cadastro"
            href="/responsibles"
            title="Responsáveis"
          />
        </div>
      </section>
    </div>
  )
}
