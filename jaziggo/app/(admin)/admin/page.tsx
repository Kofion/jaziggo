import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { getCurrentActiveUser } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { USER_ROLE } from "@/types/user"

export const metadata: Metadata = {
  title: "Administração | Jaziggo",
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
        <p className="text-sm font-medium text-zinc-500">Administração</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
          Painel administrativo
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-zinc-600">
          Acompanhe o volume cadastrado no sistema e acesse as rotinas de gestão interna.
        </p>
      </header>

      <section aria-labelledby="admin-summary-heading" className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-950" id="admin-summary-heading">
              Informações cadastradas
            </h2>
            <p className="text-sm text-zinc-600">
              Totais gerais para acompanhamento administrativo.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            helper={`${summary.activeUsers.toLocaleString("pt-BR")} contas ativas`}
            label="Usuários internos"
            value={summary.totalUsers}
          />
          <StatCard
            helper="Registros de pessoas falecidas no sistema"
            label="Falecidos"
            value={summary.totalDeceased}
          />
          <StatCard
            helper={`${summary.availableSpaces.toLocaleString("pt-BR")} disponíveis, ${summary.occupiedSpaces.toLocaleString("pt-BR")} ocupados`}
            label="Sepulturas e jazigos"
            value={summary.totalSpaces}
          />
          <StatCard
            helper={`${summary.activeBurialLinks.toLocaleString("pt-BR")} vínculos ativos de sepultamento`}
            label="Responsáveis"
            value={summary.totalResponsibles}
          />
        </div>
      </section>

      <section aria-labelledby="admin-actions-heading" className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-950" id="admin-actions-heading">
            Atalhos do administrador
          </h2>
          <p className="text-sm text-zinc-600">
            O administrador acessa todas as rotinas operacionais do funcionário e também gerencia usuários, relatórios e a vis?o administrativa.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ActionCard
            description="Gerencie contas internas de administradores e funcionários."
            href="/users"
            title="Cadastrar e gerenciar usuários"
          />
          <ActionCard
            description="Consulte visões administrativas sobre cadastros, ocupação e sepultamentos."
            href="/reports"
            title="Relatórios"
          />
          <ActionCard
            description="Abra a busca de localização para apoiar atendimentos internos."
            href="/location-search"
            title="Busca e localização"
          />
          <ActionCard
            description="Cadastre, consulte e atualize registros de falecidos e dados históricos."
            href="/deceased"
            title="Cadastrar falecidos"
          />
          <ActionCard
            description="Cadastre, consulte e atualize sepulturas, jazigos, capacidade e status de ocupação."
            href="/burial-spaces"
            title="Cadastrar sepulturas e jazigos"
          />
          <ActionCard
            description="Cadastre, consulte e atualize responsáveis administrativos e seus vínculos."
            href="/responsibles"
            title="Cadastrar responsáveis"
          />
        </div>
      </section>
    </div>
  )
}
