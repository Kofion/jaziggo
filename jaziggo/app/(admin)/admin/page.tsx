import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { getCurrentActiveUser } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { USER_ROLE } from "@/types/user"

export const metadata: Metadata = {
  title: "Administracao | Jaziggo",
}

type StatCardProps = Readonly<{
  label: string
  value: number
  helper: string
}>

type ActionCardProps = Readonly<{
  href: string
  title: string
  description: string
}>

function StatCard({ label, value, helper }: StatCardProps) {
  return (
    <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
        {value.toLocaleString("pt-BR")}
      </p>
      <p className="mt-2 text-sm leading-5 text-zinc-600">{helper}</p>
    </article>
  )
}

function ActionCard({ href, title, description }: ActionCardProps) {
  return (
    <Link
      className="block rounded-md border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
      href={href}
    >
      <h2 className="text-base font-semibold text-zinc-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>
    </Link>
  )
}

async function getAdminSummary() {
  const [
    totalUsers,
    activeUsers,
    totalDeceased,
    totalSpaces,
    availableSpaces,
    occupiedSpaces,
    totalResponsibles,
    activeBurialLinks,
  ] = await prisma.$transaction([
    prisma.user.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.deceased.count(),
    prisma.burialSpace.count(),
    prisma.burialSpace.count({ where: { status: "AVAILABLE" } }),
    prisma.burialSpace.count({ where: { status: "OCCUPIED" } }),
    prisma.responsible.count(),
    prisma.burialLink.count({ where: { status: "ACTIVE" } }),
  ])

  return {
    totalUsers,
    activeUsers,
    totalDeceased,
    totalSpaces,
    availableSpaces,
    occupiedSpaces,
    totalResponsibles,
    activeBurialLinks,
  }
}

export default async function AdminHomePage() {
  const currentUser = await getCurrentActiveUser()

  if (!currentUser) {
    redirect("/login")
  }

  if (currentUser.role !== USER_ROLE.ADMIN) {
    redirect("/dashboard")
  }

  const summary = await getAdminSummary()

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-medium text-zinc-500">Administracao</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
          Painel administrativo
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-zinc-600">
          Acompanhe o volume cadastrado no sistema e acesse as rotinas de gestao interna.
        </p>
      </header>

      <section aria-labelledby="admin-summary-heading" className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-950" id="admin-summary-heading">
              Informacoes cadastradas
            </h2>
            <p className="text-sm text-zinc-600">
              Totais gerais para acompanhamento administrativo.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            helper={`${summary.activeUsers.toLocaleString("pt-BR")} contas ativas`}
            label="Usuarios internos"
            value={summary.totalUsers}
          />
          <StatCard
            helper="Registros de pessoas falecidas no sistema"
            label="Falecidos"
            value={summary.totalDeceased}
          />
          <StatCard
            helper={`${summary.availableSpaces.toLocaleString("pt-BR")} disponiveis, ${summary.occupiedSpaces.toLocaleString("pt-BR")} ocupados`}
            label="Sepulturas e jazigos"
            value={summary.totalSpaces}
          />
          <StatCard
            helper={`${summary.activeBurialLinks.toLocaleString("pt-BR")} vinculos ativos de sepultamento`}
            label="Responsaveis"
            value={summary.totalResponsibles}
          />
        </div>
      </section>

      <section aria-labelledby="admin-actions-heading" className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-950" id="admin-actions-heading">
            Atalhos de gestao
          </h2>
          <p className="text-sm text-zinc-600">
            Acesse cadastros, usuarios e relatorios com a mesma margem e organizacao das demais telas.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ActionCard
            description="Gerencie contas internas de administradores e funcionarios."
            href="/users"
            title="Usuarios"
          />
          <ActionCard
            description="Consulte visoes administrativas sobre cadastros, ocupacao e sepultamentos."
            href="/reports"
            title="Relatorios"
          />
          <ActionCard
            description="Abra a busca de localizacao para apoiar atendimentos internos."
            href="/location-search"
            title="Busca e localizacao"
          />
          <ActionCard
            description="Acompanhe registros de falecidos e dados historicos cadastrados."
            href="/deceased"
            title="Falecidos"
          />
          <ActionCard
            description="Consulte sepulturas, jazigos, capacidade e status de ocupacao."
            href="/burial-spaces"
            title="Sepulturas e jazigos"
          />
          <ActionCard
            description="Consulte responsaveis administrativos e seus vinculos."
            href="/responsibles"
            title="Responsaveis"
          />
        </div>
      </section>
    </div>
  )
}
