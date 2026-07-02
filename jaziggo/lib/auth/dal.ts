import "server-only"

import { prisma } from "../db/prisma"
import type { LoginCredentials } from "../../types/auth"
import {
  USER_ROLE,
  USER_STATUS,
  type UserRole,
} from "../../types/user"
import { verifyPassword } from "./password"

export interface ActiveAuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  status: typeof USER_STATUS.ACTIVE
  mustChangePassword: boolean
}

function isAllowedRole(value: unknown): value is UserRole {
  return value === USER_ROLE.ADMIN || value === USER_ROLE.EMPLOYEE
}

export async function authenticateCredentials(
  credentials: LoginCredentials,
): Promise<ActiveAuthUser | null> {
  const email = credentials.email.trim().toLowerCase()

  if (!email || email.length > 254 || !credentials.password) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      mustChangePassword: true,
      role: true,
      status: true,
    },
  })

  if (
    !user ||
    user.status !== USER_STATUS.ACTIVE ||
    !isAllowedRole(user.role)
  ) {
    return null
  }

  const passwordMatches = await verifyPassword(
    credentials.password,
    user.passwordHash,
  )

  if (!passwordMatches) return null

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: USER_STATUS.ACTIVE,
    mustChangePassword: user.mustChangePassword,
  }
}

export async function getActiveUserById(
  userId: string,
): Promise<ActiveAuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      mustChangePassword: true,
      role: true,
      status: true,
    },
  })

  if (
    !user ||
    user.status !== USER_STATUS.ACTIVE ||
    !isAllowedRole(user.role)
  ) {
    return null
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: USER_STATUS.ACTIVE,
    mustChangePassword: user.mustChangePassword,
  }
}
