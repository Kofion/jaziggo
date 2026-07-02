"use client"

import { Fragment, useState } from "react"
import { useRouter } from "next/navigation"

import { UserForm } from "@/components/users/user-form"
import type { UserDto, UserRole, UserStatus } from "@/types/user"

type UserTableProps = Readonly<{
  users: readonly UserDto[]
}>

const ROLE_LABELS = {
  ADMIN: "Administrador",
  EMPLOYEE: "Funcionário",
} as const satisfies Record<UserRole, string>

const STATUS_LABELS = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
} as const satisfies Record<UserStatus, string>

function statusClassName(status: UserStatus) {
  if (status === "ACTIVE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800"
  }

  return "border-zinc-200 bg-zinc-100 text-zinc-700"
}

function passwordStatusClassName(mustChangePassword: boolean) {
  if (mustChangePassword) {
    return "border-amber-200 bg-amber-50 text-amber-800"
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800"
}

export function UserTable({ users }: UserTableProps) {
  const router = useRouter()
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)

  async function resetPassword(user: UserDto) {
    if (pendingUserId) return

    const confirmed = window.confirm(
      `Redefinir a senha de ${user.name} para a senha padrão de primeiro acesso?`,
    )

    if (!confirmed) return

    setPendingUserId(user.id)

    try {
      const response = await fetch(
        `/api/v1/users/${encodeURIComponent(user.id)}/reset-password`,
        {
          method: "PATCH",
          credentials: "same-origin",
        },
      )

      if (response.ok) {
        router.refresh()
      }
    } finally {
      setPendingUserId(null)
    }
  }

  return (
    <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
      <table className="min-w-full divide-y divide-zinc-200 text-sm">
        <caption className="sr-only">Usuários internos cadastrados</caption>
        <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase text-zinc-600">
          <tr>
            <th className="px-4 py-3" scope="col">
              Nome
            </th>
            <th className="px-4 py-3" scope="col">
              E-mail
            </th>
            <th className="px-4 py-3" scope="col">
              Perfil
            </th>
            <th className="px-4 py-3" scope="col">
              Status
            </th>
            <th className="px-4 py-3" scope="col">
              Senha
            </th>
            <th className="px-4 py-3" scope="col">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {users.map((user) => {
            const isEditing = editingUserId === user.id

            return (
              <Fragment key={user.id}>
                <tr className="hover:bg-zinc-50">
                  <th className="px-4 py-3 text-left font-medium text-zinc-950" scope="row">
                    {user.name}
                  </th>
                  <td className="px-4 py-3 text-zinc-700">{user.email}</td>
                  <td className="px-4 py-3 text-zinc-700">{ROLE_LABELS[user.role]}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${statusClassName(
                        user.status,
                      )}`}
                    >
                      {STATUS_LABELS[user.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${passwordStatusClassName(
                        user.mustChangePassword,
                      )}`}
                    >
                      {user.mustChangePassword ? "Troca obrigatória" : "Definida"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="inline-flex min-h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-900 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
                        onClick={() => setEditingUserId(isEditing ? null : user.id)}
                        type="button"
                      >
                        {isEditing ? "Fechar" : "Editar"}
                      </button>
                      <button
                        className="inline-flex min-h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-900 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
                        disabled={pendingUserId === user.id || user.status !== "ACTIVE"}
                        onClick={() => void resetPassword(user)}
                        type="button"
                      >
                        {pendingUserId === user.id ? "Redefinindo..." : "Redefinir senha"}
                      </button>
                    </div>
                  </td>
                </tr>
                {isEditing ? (
                  <tr>
                    <td className="bg-zinc-50 px-4 py-4" colSpan={6}>
                      <UserForm
                        mode="edit"
                        onSuccess={() => setEditingUserId(null)}
                        user={user}
                      />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
