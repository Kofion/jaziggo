import "server-only"

import { getServerSession, type Session } from "next-auth"

import { authOptions } from "./config"
import { getActiveUserById, type ActiveAuthUser } from "./dal"

export async function getAuthSession(): Promise<Session | null> {
  return getServerSession(authOptions)
}

export async function getCurrentActiveUser(): Promise<ActiveAuthUser | null> {
  const session = await getAuthSession()

  if (!session?.user.id) return null

  return getActiveUserById(session.user.id)
}

export const verifySession = getCurrentActiveUser
