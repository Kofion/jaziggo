import { redirect } from "next/navigation"

import { getHomePathForRole } from "@/lib/auth/routes"
import { getCurrentActiveUser } from "@/lib/auth/session"

export default async function Home() {
  const user = await getCurrentActiveUser()

  if (!user) {
    redirect("/login")
  }

  if (user.mustChangePassword) {
    redirect("/change-password")
  }

  redirect(getHomePathForRole(user.role))
}
