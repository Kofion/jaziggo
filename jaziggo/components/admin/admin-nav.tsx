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
    href: "/dashboard",
    label: "Principal",
    description: "Início",
    permissions: [PERMISSION.MANAGE_OPERATIONAL_RECORDS],
  },
  {
    href: "/location-search",
    label: "Busca",
    description: "Localização",
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
    label: "Responsáveis",
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
    href: "/reports",
    label: "Relatórios",
    description: "Gestão",
    permissions: [PERMISSION.VIEW_REPORTS],
  },
  {
    href: "/admin",
    label: "Gerenciamento",
    description: "Admin",
    permissions: [PERMISSION.VIEW_REPORTS],
  },
  {
    href: "/users",
    label: "Usuários",
    description: "Admin",
    permissions: [PERMISSION.MANAGE_USERS],
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
  const roleLabel = role === USER_ROLE.ADMIN ? "Admin" : "Funcionário"

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
        "sticky top-0 z-30 border-b border-slate-800 bg-slate-900/95 shadow-sm backdrop-blur",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            className="min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
            href={role === USER_ROLE.ADMIN ? "/admin" : "/dashboard"}
          >
            <span className="block text-lg font-semibold leading-6 text-emerald-400">
              Jaziggo
            </span>
            <span className="block truncate text-xs leading-5 text-slate-400">
              {roleLabel} - {userName}
            </span>
          </Link>

          <button
            aria-label={isLoggingOut ? "Saindo do sistema" : "Sair do sistema"}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm font-medium text-slate-100 transition hover:border-emerald-500 hover:bg-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoggingOut}
            onClick={handleLogout}
            type="button"
          >
            {isLoggingOut ? "Saindo..." : "Sair"}
          </button>
        </div>

        <nav aria-label="Navegação principal">
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {items.map((item) => {
              const active = isCurrentPath(item.href, pathname)

              return (
                <li key={item.href} className="shrink-0">
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "admin-nav-link group block min-w-32 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400",
                      active
                        ? "admin-nav-link-active !border-emerald-500 !bg-emerald-600 !text-white"
                        : "border-slate-700 bg-slate-950 text-slate-200 hover:!border-emerald-500 hover:!bg-emerald-600 hover:!text-white",
                    )}
                    href={item.href}
                  >
                    <span className="block whitespace-nowrap font-medium leading-5">
                      {item.label}
                    </span>
                    <span
                      className={cx(
                        "block whitespace-nowrap text-xs leading-4",
                        active ? "!text-emerald-100" : "text-slate-400 group-hover:!text-emerald-100",
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
