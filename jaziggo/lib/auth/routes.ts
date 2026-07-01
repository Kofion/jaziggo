import { USER_ROLE, type UserRole } from "@/types/user"

export function getHomePathForRole(role: UserRole) {
  return role === USER_ROLE.ADMIN ? "/admin" : "/dashboard"
}
