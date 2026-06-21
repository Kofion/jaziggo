import type { UserRole, UserStatus } from "./user"

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthSession {
  userId: string
  role: UserRole
  status: UserStatus
}

export const PERMISSION = {
  MANAGE_USERS: "MANAGE_USERS",
  VIEW_REPORTS: "VIEW_REPORTS",
  MANAGE_OPERATIONAL_RECORDS: "MANAGE_OPERATIONAL_RECORDS",
  SEARCH_RECORDS: "SEARCH_RECORDS",
  VIEW_LOCATIONS: "VIEW_LOCATIONS",
} as const

export type Permission = (typeof PERMISSION)[keyof typeof PERMISSION]

export const ROLE_PERMISSIONS = {
  ADMIN: [
    PERMISSION.MANAGE_USERS,
    PERMISSION.VIEW_REPORTS,
    PERMISSION.MANAGE_OPERATIONAL_RECORDS,
    PERMISSION.SEARCH_RECORDS,
    PERMISSION.VIEW_LOCATIONS,
  ],
  EMPLOYEE: [
    PERMISSION.MANAGE_OPERATIONAL_RECORDS,
    PERMISSION.SEARCH_RECORDS,
    PERMISSION.VIEW_LOCATIONS,
  ],
} as const satisfies Record<UserRole, readonly Permission[]>
