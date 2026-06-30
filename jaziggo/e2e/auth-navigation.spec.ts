import { argon2id, hash } from "argon2"
import { expect, test, type Page } from "@playwright/test"
import type { PrismaClient } from "@prisma/client"

import { assertTestDatabaseUrl } from "../tests/helpers/assert-test-database"
import {
  activeEmployeeUserFixture,
  adminUserFixture,
  TEST_USER_PASSWORD,
} from "../tests/fixtures/users"
import { USER_ROLE, USER_STATUS } from "../types/user"

const DEFAULT_E2E_DATABASE_URL =
  "postgresql://jaziggo_test:jaziggo_test@127.0.0.1:5432/jaziggo_test?schema=public"

let prisma: PrismaClient
let passwordHash: string

async function getPrismaClient() {
  const testDatabaseUrl = assertTestDatabaseUrl({
    testDatabaseUrl: process.env.TEST_DATABASE_URL ?? DEFAULT_E2E_DATABASE_URL,
  })

  process.env.TEST_DATABASE_URL = testDatabaseUrl
  process.env.DATABASE_URL = testDatabaseUrl

  const { PrismaClient } = await import("@prisma/client")

  return new PrismaClient()
}

async function seedAuthUsers() {
  passwordHash ??= await hash(TEST_USER_PASSWORD, {
    type: argon2id,
    memoryCost: 65_536,
    timeCost: 3,
    parallelism: 1,
  })

  const fixtureIds = [adminUserFixture.id, activeEmployeeUserFixture.id]
  const fixtureEmails = [adminUserFixture.email, activeEmployeeUserFixture.email]

  await prisma.user.deleteMany({
    where: {
      OR: [{ id: { in: fixtureIds } }, { email: { in: fixtureEmails } }],
    },
  })

  await prisma.user.createMany({
    data: [
      {
        id: adminUserFixture.id,
        name: adminUserFixture.name,
        email: adminUserFixture.email,
        passwordHash,
        role: USER_ROLE.ADMIN,
        status: USER_STATUS.ACTIVE,
      },
      {
        id: activeEmployeeUserFixture.id,
        name: activeEmployeeUserFixture.name,
        email: activeEmployeeUserFixture.email,
        passwordHash,
        role: USER_ROLE.EMPLOYEE,
        status: USER_STATUS.ACTIVE,
      },
    ],
  })
}

async function login(page: Page, email: string) {
  await page.goto("/login")
  await page.getByLabel("E-mail").fill(email)
  await page.getByLabel("Senha").fill(TEST_USER_PASSWORD)
  const loginResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/v1/auth/login") &&
    response.request().method() === "POST",
  )

  await page.getByRole("button", { name: "Entrar" }).click()

  const loginResponse = await loginResponsePromise
  expect(loginResponse.status()).toBe(200)
  await expect(page).toHaveURL(/\/location-search$/)
}

test.beforeAll(async () => {
  prisma = await getPrismaClient()
  await seedAuthUsers()
})

test.afterAll(async () => {
  await prisma?.$disconnect()
})

test.beforeEach(async () => {
  await seedAuthUsers()
})

test("ADMIN can log in and reach administrative navigation targets", async ({ page }) => {
  await login(page, adminUserFixture.email)

  await page.goto("/users")
  await expect(page.getByRole("heading", { name: /Usu.rio?s/ })).toBeVisible()

  await page.goto("/reports")
  await expect(page.getByRole("heading", { name: "Relatorios" })).toBeVisible()

  await page.goto("/location-search")
  await expect(
    page.getByRole("heading", { name: "Busca e localizacao" }),
  ).toBeVisible()
})

test("EMPLOYEE can use operational navigation but not ADMIN-only areas", async ({ page }) => {
  await login(page, activeEmployeeUserFixture.email)

  await page.goto("/location-search")
  await expect(
    page.getByRole("heading", { name: "Busca e localizacao" }),
  ).toBeVisible()

  await page.goto("/users")
  await expect(page).not.toHaveURL(/\/users(?:\?|$)/)
  await expect(page.getByRole("heading", { name: /Usu.rio?s/ })).toHaveCount(0)

  await page.goto("/reports")
  await expect(page).not.toHaveURL(/\/reports(?:\?|$)/)
  await expect(page.getByRole("heading", { name: "Relatorios" })).toHaveCount(0)
})

test("visitors have no public access to protected internal pages", async ({ page }) => {
  for (const path of ["/", "/location-search", "/users", "/reports"]) {
    await page.context().clearCookies()
    await page.goto(path)

    await expect(page).toHaveURL(/\/login$/)
    await expect(
      page.getByRole("heading", { name: "Acesso ao sistema" }),
    ).toBeVisible()
  }
})
