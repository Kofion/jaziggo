import Link from "next/link"

import { hasPermission } from "@/lib/auth/permissions"
import { PERMISSION, type Permission } from "@/types/auth"
import type { UserRole } from "@/types/user"

type AdminNavItem = Readonly<{
  href: string
  label: string
  description: string
  permissions?: readonly Permission[]
}>

const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  {
    href: "/deceased",
    label: "Falecidos",
    description: "Registros",
    permissions: [PERMISSION.MANAGE_OPERATIONAL_RECORDS],
  },
  {
    href: "/responsibles",
    label: "Responsáveis",
    description: "Cadastros",
    permissions: [PERMISSION.MANAGE_OPERATIONAL_RECORDS],
  },
  {
    href: "/burial-spaces",
    label: "Sepulturas e jazigos",
    description: "Espaços",
    permissions: [PERMISSION.MANAGE_OPERATIONAL_RECORDS],
  },
  {
    href: "/location-search",
    label: "Busca e localização",
    description: "Atendimento",
    permissions: [PERMISSION.SEARCH_RECORDS, PERMISSION.VIEW_LOCATIONS],
  },
  {
    href: "/users",
    label: "Usuários",
    description: "Contas internas",
    permissions: [PERMISSION.MANAGE_USERS],
  },
  {
    href: "/reports",
    label: "Relatórios",
    description: "Administração",
    permissions: [PERMISSION.VIEW_REPORTS],
  },
]

type AdminNavProps = Readonly<{
  role: UserRole
  currentPath?: string
  className?: string
}>

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function canViewItem(role: UserRole, item: AdminNavItem) {
  return item.permissions?.every((permission) => hasPermission(role, permission)) ?? true
}

function isCurrentPath(itemHref: string, currentPath?: string) {
  return currentPath === itemHref || currentPath?.startsWith(`${itemHref}/`)
}

export function getAdminNavItems(role: UserRole) {
  return ADMIN_NAV_ITEMS.filter((item) => canViewItem(role, item))
}

export function AdminNav({ role, currentPath, className }: AdminNavProps) {
  const items = getAdminNavItems(role)

  return (
    <nav
      aria-label="Navegação administrativa"
      className={cx(
        "border-b border-zinc-200 bg-white/90 px-4 py-3 shadow-sm sm:px-6 lg:px-8",
        className,
      )}
    >
      <ul className="mx-auto flex max-w-7xl gap-2 overflow-x-auto">
        {items.map((item) => {
          const active = isCurrentPath(item.href, currentPath)

          return (
            <li key={item.href} className="shrink-0">
              <Link
                aria-current={active ? "page" : undefined}
                className={cx(
                  "block min-w-32 rounded-md border px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950",
                  active
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : "border-transparent text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-950",
                )}
                href={item.href}
              >
                <span className="block whitespace-nowrap font-medium leading-5">{item.label}</span>
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
  )
}
