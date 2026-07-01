"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"

import { PERMISSION, ROLE_PERMISSIONS, type Permission } from "@/types/auth"
import { USER_ROLE, type UserRole } from "@/types/user"

type AdminNavItem = Readonly<{
  href: string
  label: string
  description: string
  permissions?: readonly Permission[]
}>

const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  {
    href: "/admin",
    label: "Administracao",
    description: "Resumo",
    permissions: [PERMISSION.VIEW_REPORTS],
  },
  {
    href: "/dashboard",
    label: "Principal",
    description: "Operacao",
    permissions: [PERMISSION.MANAGE_OPERATIONAL_RECORDS],
  },
  {
    href: "/location-search",
    label: "Busca",
    description: "Localizacao",
    permissions: [PERMISSION.SEARCH_RECORDS, PERMISSION.VIEW_LOCATIONS],
  },
  {
    href: "/deceased",
    label: "Falecidos",
    description: "Cadastro",
    permissions: [PERMISSION.MANAGE_OPERATIONAL_RECORDS],
  },
  {
    href: "/responsibles",
    label: "Responsaveis",
    description: "Cadastro",
    permissions: [PERMISSION.MANAGE_OPERATIONAL_RECORDS],
  },
  {
    href: "/burial-spaces",
    label: "Sepulturas e jazigos",
    description: "Cadastro",
    permissions: [PERMISSION.MANAGE_OPERATIONAL_RECORDS],
  },
  {
    href: "/users",
    label: "Usuarios",
    description: "Contas",
    permissions: [PERMISSION.MANAGE_USERS],
  },
  {
    href: "/reports",
    label: "Relatorios",
    description: "Gestao",
    permissions: [PERMISSION.VIEW_REPORTS],
  },
]

type AdminNavProps = Readonly<{
  role: UserRole
  userName: string
  className?: string
}>

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function hasClientPermission(role: UserRole, permission: Permission) {
  const permissions: readonly Permission[] = ROLE_PERMISSIONS[role]

  return permissions.includes(permission)
}

function canViewItem(role: UserRole, item: AdminNavItem) {
  return item.permissions?.every((permission) => hasClientPermission(role, permission)) ?? true
}

function isCurrentPath(itemHref: string, currentPath: string) {
  return currentPath === itemHref || currentPath.startsWith(`${itemHref}/`)
}

export function getAdminNavItems(role: UserRole) {
  return ADMIN_NAV_ITEMS.filter((item) => canViewItem(role, item))
}

export function AdminNav({ role, userName, className }: AdminNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const items = getAdminNavItems(role)
  const roleLabel = role === USER_ROLE.ADMIN ? "Admin" : "Funcionario"

  async function handleLogout() {
    if (isLoggingOut) return

    setIsLoggingOut(true)

    try {
      await fetch("/api/v1/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      })
    } finally {
      router.replace("/login")
      router.refresh()
    }
  }

  return (
    <header
      className={cx(
        "sticky top-0 z-30 border-b border-zinc-200 bg-white/95 shadow-sm backdrop-blur",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            className="min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
            href={role === USER_ROLE.ADMIN ? "/admin" : "/dashboard"}
          >
            <span className="block text-lg font-semibold leading-6 text-zinc-950">
              Jaziggo
            </span>
            <span className="block truncate text-xs leading-5 text-zinc-500">
              {roleLabel} - {userName}
            </span>
          </Link>

          <button
            aria-label={isLoggingOut ? "Saindo do sistema" : "Sair do sistema"}
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoggingOut}
            onClick={handleLogout}
            type="button"
          >
            {isLoggingOut ? "Saindo..." : "Sair"}
          </button>
        </div>

        <nav aria-label="Navegacao principal">
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {items.map((item) => {
              const active = isCurrentPath(item.href, pathname)

              return (
                <li key={item.href} className="shrink-0">
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "block min-w-32 rounded-md border px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950",
                      active
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-950",
                    )}
                    href={item.href}
                  >
                    <span className="block whitespace-nowrap font-medium leading-5">
                      {item.label}
                    </span>
                    <span
                      className={cx(
                        "block whitespace-nowrap text-xs leading-4",
                        active ? "text-zinc-200" : "text-zinc-500",
                      )}
                    >
                      {item.description}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </header>
  )
}
