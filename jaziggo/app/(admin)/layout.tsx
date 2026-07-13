import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { AdminThemeShell } from "@/components/admin/admin-theme-shell"
import { getCurrentActiveUser } from "@/lib/auth/session"

type AdminLayoutProps = Readonly<{
  children: ReactNode
}>

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const user = await getCurrentActiveUser()

  if (!user) {
    redirect("/login")
  }

  if (user.mustChangePassword) {
    redirect("/change-password")
  }

  return (
    <AdminThemeShell role={user.role} userName={user.name}>
      {children}
    </AdminThemeShell>
  )
}
