import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { AdminNav } from "@/components/admin/admin-nav"
import { getCurrentActiveUser } from "@/lib/auth/session"

type AdminLayoutProps = Readonly<{
  children: ReactNode
}>

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const user = await getCurrentActiveUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="jaziggo-admin-theme min-h-screen bg-slate-950 text-slate-100">
      <AdminNav role={user.role} userName={user.name} />
      <main className="mx-auto flex w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
