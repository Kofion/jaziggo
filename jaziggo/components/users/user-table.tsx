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

export function UserTable({ users }: UserTableProps) {
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
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {users.map((user) => (
            <tr className="hover:bg-zinc-50" key={user.id}>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
