export const USER_ROLE = {
  ADMIN: "ADMIN",
  EMPLOYEE: "EMPLOYEE",
} as const

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE]

export const USER_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS]

export interface UserDto {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  mustChangePassword: boolean
}

export interface CreateUserInput {
  name: string
  email: string
  role: UserRole
}

export interface UpdateUserInput {
  name?: string
  email?: string
  role?: UserRole
}

export interface ChangeOwnPasswordInput {
  password: string
  passwordConfirmation: string
}
