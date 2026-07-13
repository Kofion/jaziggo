"use client"

import { useEffect, useState, type ReactNode } from "react"

import { AdminNav } from "@/components/admin/admin-nav"
import { type UserRole } from "@/types/user"

type AdminThemeShellProps = Readonly<{
  children: ReactNode
  role: UserRole
  userName: string
}>

const THEME_STORAGE_KEY = "jaziggo-admin-theme"

export function AdminThemeShell({ children, role, userName }: AdminThemeShellProps) {
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    window.queueMicrotask(() => {
      setIsDarkMode(window.localStorage.getItem(THEME_STORAGE_KEY) === "dark")
    })
  }, [])

  function toggleDarkMode() {
    setIsDarkMode((current) => {
      const next = !current
      window.localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light")
      return next
    })
  }

  return (
    <div
      className={
        isDarkMode
          ? "jaziggo-admin-shell jaziggo-admin-theme min-h-screen bg-slate-950 text-slate-100"
          : "jaziggo-admin-shell min-h-screen bg-white text-black"
      }
    >
      <AdminNav
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        role={role}
        userName={userName}
      />
      <main className="mx-auto flex w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
