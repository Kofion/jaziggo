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
      className="block rounded-md border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
      href={href}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{detail}</p>
      <h2 className="mt-2 text-lg font-semibold text-zinc-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>
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
        <p className="text-sm font-medium text-zinc-500">Operacao interna</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
          Tela principal
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-zinc-600">
          Acesse as funcoes de cadastro e busca usadas na rotina de atendimento e manutencao dos registros.
        </p>
      </header>

      <section aria-labelledby="priority-workflows-heading" className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-950" id="priority-workflows-heading">
            Funcoes principais
          </h2>
          <p className="text-sm text-zinc-600">
            Os atalhos abaixo concentram as acoes operacionais disponiveis para funcionarios.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <WorkflowCard
            description="Pesquise por nome, filtros operacionais e dados complementares para orientar familiares e visitantes."
            detail="Atendimento"
            href="/location-search"
            title="Buscar localizacao"
          />
          <WorkflowCard
            description="Cadastre, consulte e atualize registros de falecidos preservando dados historicos."
            detail="Cadastro"
            href="/deceased"
            title="Falecidos"
          />
          <WorkflowCard
            description="Mantenha sepulturas e jazigos com identificacao, localizacao, capacidade e status."
            detail="Cadastro"
            href="/burial-spaces"
            title="Sepulturas e jazigos"
          />
          <WorkflowCard
            description="Consulte responsaveis administrativos e mantenha vinculos com registros existentes."
            detail="Cadastro"
            href="/responsibles"
            title="Responsaveis"
          />
        </div>
      </section>
    </div>
  )
}
