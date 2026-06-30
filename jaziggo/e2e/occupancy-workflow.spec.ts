import { argon2id, hash } from "argon2"
import { expect, test, type Page } from "@playwright/test"
import type { PrismaClient } from "@prisma/client"

import {
  generateLocationKey,
  normalizeSearchName,
} from "../lib/validation/normalize"
import { assertTestDatabaseUrl } from "../tests/helpers/assert-test-database"
import {
  activeEmployeeUserFixture,
  TEST_USER_PASSWORD,
} from "../tests/fixtures/users"
import {
  BURIAL_SPACE_STATUS,
  BURIAL_SPACE_TYPE,
} from "../types/burial-space"
import { USER_ROLE, USER_STATUS } from "../types/user"

const DEFAULT_E2E_DATABASE_URL =
  "postgresql://jaziggo_test:jaziggo_test@127.0.0.1:5432/jaziggo_test?schema=public"

const DECEASED_ID = "10000000-0000-4000-8000-000000000260"
const SPACE_ID = "20000000-0000-4000-8000-000000000260"
const LINK_ID = "30000000-0000-4000-8000-000000000260"

const SPACE_IDENTIFIER = "E2E-OCC-160"
const END_REASON = "Encerramento operacional E2E T160"

let prisma: PrismaClient
let passwordHash: string

type BrowserJsonResponse = Readonly<{
  status: number
  body: unknown
}>

async function getPrismaClient() {
  const testDatabaseUrl = assertTestDatabaseUrl({
    testDatabaseUrl: process.env.TEST_DATABASE_URL ?? DEFAULT_E2E_DATABASE_URL,
  })

  process.env.TEST_DATABASE_URL = testDatabaseUrl
  process.env.DATABASE_URL = testDatabaseUrl

  const { PrismaClient } = await import("@prisma/client")

  return new PrismaClient()
}

async function seedEmployee() {
  passwordHash ??= await hash(TEST_USER_PASSWORD, {
    type: argon2id,
    memoryCost: 65_536,
    timeCost: 3,
    parallelism: 1,
  })

  await prisma.user.deleteMany({
    where: {
      OR: [
        { id: activeEmployeeUserFixture.id },
        { email: activeEmployeeUserFixture.email },
      ],
    },
  })

  await prisma.user.create({
    data: {
      id: activeEmployeeUserFixture.id,
      name: activeEmployeeUserFixture.name,
      email: activeEmployeeUserFixture.email,
      passwordHash,
      role: USER_ROLE.EMPLOYEE,
      status: USER_STATUS.ACTIVE,
    },
  })
}

async function deleteWorkflowData() {
  await prisma.burialLink.deleteMany({
    where: {
      OR: [
        { id: LINK_ID },
        { deceasedId: DECEASED_ID },
        { burialSpaceId: SPACE_ID },
      ],
    },
  })
  await prisma.deceased.deleteMany({ where: { id: DECEASED_ID } })
  await prisma.burialSpace.deleteMany({ where: { id: SPACE_ID } })
}

async function seedOccupancyWorkflow() {
  await deleteWorkflowData()

  const deceasedName = "E2E Ocupacao Historica"

  await prisma.deceased.create({
    data: {
      id: DECEASED_ID,
      internalCode: "E2E-OCC-160-D",
      fullName: deceasedName,
      searchName: normalizeSearchName(deceasedName),
      document: null,
      deathDate: new Date("2024-03-01T00:00:00.000Z"),
      burialDate: new Date("2024-03-03T00:00:00.000Z"),
      datesUnknown: false,
      historicalDataIncomplete: true,
    },
  })

  await prisma.burialSpace.create({
    data: {
      id: SPACE_ID,
      type: BURIAL_SPACE_TYPE.SEPULTURA,
      identifier: SPACE_IDENTIFIER,
      sector: "Setor E2E Ocupacao",
      row: "Quadra 160",
      number: "160",
      locationKey: generateLocationKey({
        sector: "Setor E2E Ocupacao",
        row: "Quadra 160",
        number: "160",
      }),
      status: BURIAL_SPACE_STATUS.OCCUPIED,
      capacity: 1,
    },
  })

  await prisma.burialLink.create({
    data: {
      id: LINK_ID,
      deceasedId: DECEASED_ID,
      burialSpaceId: SPACE_ID,
      burialDate: new Date("2024-03-03T00:00:00.000Z"),
    },
  })
}

async function loginAsEmployee(page: Page) {
  await page.goto("/login")
  await page.getByLabel("E-mail").fill(activeEmployeeUserFixture.email)
  await page.getByLabel("Senha").fill(TEST_USER_PASSWORD)
  const loginResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/v1/auth/login") &&
    response.request().method() === "POST",
  )

  await page.getByRole("button", { name: "Entrar" }).click()

  const loginResponse = await loginResponsePromise
  expect(loginResponse.status()).toBe(200)
  await expect(page).toHaveURL(/\/login$/)
}

async function patchJson(
  page: Page,
  path: string,
  body: Record<string, unknown>,
): Promise<BrowserJsonResponse> {
  return page.evaluate(
    async ({ requestPath, requestBody }) => {
      const response = await fetch(requestPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(requestBody),
      })
      const responseBody = await response.json().catch(() => null)

      return { status: response.status, body: responseBody }
    },
    { requestPath: path, requestBody: body },
  )
}

async function expectSpaceDetailStatus(page: Page, statusLabel: string) {
  await page.goto(`/burial-spaces/${SPACE_ID}`)
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Detalhe do espaco",
      exact: true,
    }),
  ).toBeVisible()
  await expect(page.getByRole("heading", { name: SPACE_IDENTIFIER })).toBeVisible()
  await expect(page.getByText(statusLabel, { exact: true })).toBeVisible()
}

function linkHistoryTable(page: Page) {
  return page.getByRole("table", {
    name: "Historico de vinculos do espaco",
  })
}

test.beforeAll(async () => {
  prisma = await getPrismaClient()
  await seedEmployee()
})

test.afterAll(async () => {
  await prisma?.$disconnect()
})

test.beforeEach(async () => {
  await seedEmployee()
  await seedOccupancyWorkflow()
})

test("EMPLOYEE closes an active occupancy link before reserving the space and keeps history", async ({
  page,
}) => {
  await loginAsEmployee(page)

  await expectSpaceDetailStatus(page, "Ocupado")
  await expect(page.getByText("1/1", { exact: true })).toBeVisible()

  const historyBeforeClosure = linkHistoryTable(page)
  const activeRow = historyBeforeClosure
    .getByRole("row")
    .filter({ hasText: DECEASED_ID })
  await expect(activeRow.getByText("Ativo", { exact: true })).toBeVisible()
  await expect(activeRow.getByText("Vinculo ativo", { exact: true })).toBeVisible()

  const blockedStatusChange = await patchJson(
    page,
    `/api/v1/burial-spaces/${SPACE_ID}/status`,
    {
      status: BURIAL_SPACE_STATUS.RESERVED,
      confirmation: true,
    },
  )

  expect(blockedStatusChange).toMatchObject({
    status: 409,
    body: {
      success: false,
      error: { code: "CONFLICT" },
    },
  })

  await expectSpaceDetailStatus(page, "Ocupado")
  await expect(page.getByText("1/1", { exact: true })).toBeVisible()

  const blockedInactiveChange = await patchJson(
    page,
    `/api/v1/burial-spaces/${SPACE_ID}/status`,
    {
      status: BURIAL_SPACE_STATUS.INACTIVE,
      confirmation: true,
    },
  )

  expect(blockedInactiveChange).toMatchObject({
    status: 409,
    body: {
      success: false,
      error: { code: "CONFLICT" },
    },
  })

  await expectSpaceDetailStatus(page, "Ocupado")
  await expect(page.getByText("1/1", { exact: true })).toBeVisible()

  const endedLink = await patchJson(page, `/api/v1/burial-links/${LINK_ID}/end`, {
    endedAt: "2024-04-01T12:00:00.000Z",
    endReason: END_REASON,
    confirmation: true,
  })

  expect(endedLink).toMatchObject({
    status: 200,
    body: {
      success: true,
      data: {
        id: LINK_ID,
        status: "ENDED",
        endReason: END_REASON,
      },
    },
  })

  await expectSpaceDetailStatus(page, "Disponivel")
  await expect(page.getByText("0/1", { exact: true })).toBeVisible()

  const historyAfterClosure = linkHistoryTable(page)
  const endedRow = historyAfterClosure
    .getByRole("row")
    .filter({ hasText: DECEASED_ID })
  await expect(endedRow.getByText("Encerrado", { exact: true })).toBeVisible()
  await expect(endedRow.getByText(END_REASON, { exact: true })).toBeVisible()

  const allowedStatusChange = await patchJson(
    page,
    `/api/v1/burial-spaces/${SPACE_ID}/status`,
    {
      status: BURIAL_SPACE_STATUS.RESERVED,
      confirmation: true,
    },
  )

  expect(allowedStatusChange).toMatchObject({
    status: 200,
    body: {
      success: true,
      data: {
        id: SPACE_ID,
        status: BURIAL_SPACE_STATUS.RESERVED,
        activeLinkCount: 0,
      },
    },
  })

  await expectSpaceDetailStatus(page, "Reservado")
  await expect(page.getByText("0/1", { exact: true })).toBeVisible()
  await expect(endedRow.getByText("Encerrado", { exact: true })).toBeVisible()
  await expect(endedRow.getByText(END_REASON, { exact: true })).toBeVisible()
})
