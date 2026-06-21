import "server-only"

import type {
  UserDto,
  UserRole,
  UserStatus,
} from "../../types/user"

interface UserDtoSource {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
}

export function toUserDto(user: UserDtoSource): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  }
}
