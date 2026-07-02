import {
  USER_ROLE,
  USER_STATUS,
  type UserDto,
} from "../../types/user"

export interface UserFixture extends UserDto {
  password: string
}

export const TEST_USER_PASSWORD = "test-only-not-a-secret" as const

export const adminUserFixture = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Test Administrator",
  email: "admin@jaziggo.test",
  password: TEST_USER_PASSWORD,
  role: USER_ROLE.ADMIN,
  status: USER_STATUS.ACTIVE,
  mustChangePassword: false,
} as const satisfies UserFixture

export const activeEmployeeUserFixture = {
  id: "00000000-0000-4000-8000-000000000002",
  name: "Test Active Employee",
  email: "active.employee@jaziggo.test",
  password: TEST_USER_PASSWORD,
  role: USER_ROLE.EMPLOYEE,
  status: USER_STATUS.ACTIVE,
  mustChangePassword: false,
} as const satisfies UserFixture

export const inactiveEmployeeUserFixture = {
  id: "00000000-0000-4000-8000-000000000003",
  name: "Test Inactive Employee",
  email: "inactive.employee@jaziggo.test",
  password: TEST_USER_PASSWORD,
  role: USER_ROLE.EMPLOYEE,
  status: USER_STATUS.INACTIVE,
  mustChangePassword: false,
} as const satisfies UserFixture
