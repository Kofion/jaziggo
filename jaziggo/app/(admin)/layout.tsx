import type { ReactNode } from "react"
import { redirect } from "next/navigation"

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
    <div className="min-h-full bg-zinc-50 text-zinc-950">
      <main className="mx-auto flex min-h-full w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
