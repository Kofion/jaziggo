import { argon2id, hash } from "argon2"
import { expect, test, type Page } from "@playwright/test"
import type { PrismaClient } from "@prisma/client"

import { maskDocument } from "../lib/privacy/mask-document"
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

const HOMONYM_NAME = "E2E Homonimo Seguro"
const FIRST_DOCUMENT = "E2E-DOC-ALPHA-1234567890"
const SECOND_DOCUMENT = "E2E-DOC-BETA-0987654321"
const FIRST_MASKED_DOCUMENT = maskDocument(FIRST_DOCUMENT)
const SECOND_MASKED_DOCUMENT = maskDocument(SECOND_DOCUMENT)

const FIRST_DECEASED_ID = "10000000-0000-4000-8000-000000000159"
const SECOND_DECEASED_ID = "10000000-0000-4000-8000-000000000160"
const FIRST_SPACE_ID = "20000000-0000-4000-8000-000000000159"
const SECOND_SPACE_ID = "20000000-0000-4000-8000-000000000160"
const FIRST_LINK_ID = "30000000-0000-4000-8000-000000000159"
const SECOND_LINK_ID = "30000000-0000-4000-8000-000000000160"

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
    where: { id: { in: [FIRST_LINK_ID, SECOND_LINK_ID] } },
  })
  await prisma.deceased.deleteMany({
    where: { id: { in: [FIRST_DECEASED_ID, SECOND_DECEASED_ID] } },
  })
  await prisma.burialSpace.deleteMany({
    where: { id: { in: [FIRST_SPACE_ID, SECOND_SPACE_ID] } },
  })
}

async function seedLocationWorkflow() {
  await deleteWorkflowData()

  await prisma.deceased.createMany({
    data: [
      {
        id: FIRST_DECEASED_ID,
        internalCode: "E2E-LOC-159-A",
        fullName: HOMONYM_NAME,
        searchName: normalizeSearchName(HOMONYM_NAME),
        document: FIRST_DOCUMENT.replace(/[^a-z0-9]/gi, "").toUpperCase(),
        deathDate: new Date("2024-01-05T00:00:00.000Z"),
        burialDate: new Date("2024-01-07T00:00:00.000Z"),
        datesUnknown: false,
        historicalDataIncomplete: false,
      },
      {
        id: SECOND_DECEASED_ID,
        internalCode: "E2E-LOC-159-B",
        fullName: HOMONYM_NAME,
        searchName: normalizeSearchName(HOMONYM_NAME),
        document: SECOND_DOCUMENT.replace(/[^a-z0-9]/gi, "").toUpperCase(),
        deathDate: new Date("2024-02-10T00:00:00.000Z"),
        burialDate: new Date("2024-02-12T00:00:00.000Z"),
        datesUnknown: false,
        historicalDataIncomplete: false,
      },
    ],
  })

  await prisma.burialSpace.createMany({
    data: [
      {
        id: FIRST_SPACE_ID,
        type: BURIAL_SPACE_TYPE.SEPULTURA,
        identifier: "E2E-159-A",
        sector: "Setor E2E Norte",
        row: "Quadra 15",
        number: "159A",
        locationKey: generateLocationKey({
          sector: "Setor E2E Norte",
          row: "Quadra 15",
          number: "159A",
        }),
        status: BURIAL_SPACE_STATUS.OCCUPIED,
        capacity: 1,
      },
      {
        id: SECOND_SPACE_ID,
        type: BURIAL_SPACE_TYPE.SEPULTURA,
        identifier: "E2E-159-B",
        sector: "Setor E2E Sul",
        row: "Quadra 16",
        number: "159B",
        locationKey: generateLocationKey({
          sector: "Setor E2E Sul",
          row: "Quadra 16",
          number: "159B",
        }),
        status: BURIAL_SPACE_STATUS.OCCUPIED,
        capacity: 1,
      },
    ],
  })

  await prisma.burialLink.createMany({
    data: [
      {
        id: FIRST_LINK_ID,
        deceasedId: FIRST_DECEASED_ID,
        burialSpaceId: FIRST_SPACE_ID,
        burialDate: new Date("2024-01-07T00:00:00.000Z"),
      },
      {
        id: SECOND_LINK_ID,
        deceasedId: SECOND_DECEASED_ID,
        burialSpaceId: SECOND_SPACE_ID,
        burialDate: new Date("2024-02-12T00:00:00.000Z"),
      },
    ],
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

async function expectNoCompleteDocument(page: Page) {
  await expect(page.locator("body")).not.toContainText(FIRST_DOCUMENT)
  await expect(page.locator("body")).not.toContainText(SECOND_DOCUMENT)
  await expect(page).not.toHaveURL(new RegExp(FIRST_DOCUMENT))
  await expect(page).not.toHaveURL(new RegExp(SECOND_DOCUMENT))
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
  await seedLocationWorkflow()
})

test("EMPLOYEE locates homonyms from synthetic registrations without exposing full documents", async ({
  page,
}) => {
  await loginAsEmployee(page)

  await page.goto(`/deceased?name=${encodeURIComponent(HOMONYM_NAME)}&pageSize=10`)
  await expect(page.getByRole("heading", { level: 1, name: "Falecidos", exact: true })).toBeVisible()
  await expect(page.getByText("2 falecidos encontrados")).toBeVisible()
  const deceasedTable = page.getByRole("table", { name: "Falecidos cadastrados" })
  await expect(deceasedTable.getByText("E2E-LOC-159-A", { exact: true })).toBeVisible()
  await expect(deceasedTable.getByText("E2E-LOC-159-B", { exact: true })).toBeVisible()
  await expect(deceasedTable.getByText(FIRST_MASKED_DOCUMENT, { exact: true })).toBeVisible()
  await expect(deceasedTable.getByText(SECOND_MASKED_DOCUMENT, { exact: true })).toBeVisible()
  await expectNoCompleteDocument(page)

  await page.goto("/burial-spaces?identifier=E2E-159-A")
  await expect(
    page.getByRole("heading", { name: "Sepulturas e jazigos" }),
  ).toBeVisible()
  const burialSpacesTable = page.getByRole("table", {
    name: "Sepulturas e jazigos cadastrados",
  })
  await expect(burialSpacesTable.getByText("E2E-159-A", { exact: true })).toBeVisible()
  await expect(burialSpacesTable.getByText("Setor Setor E2E Norte")).toBeVisible()

  await page.goto(
    `/location-search?deceasedName=${encodeURIComponent(HOMONYM_NAME)}&pageSize=10`,
  )
  await expect(
    page.getByRole("heading", { name: "Busca e localizacao" }),
  ).toBeVisible()
  await expect(page.getByText("2 resultados localizados")).toBeVisible()
  const locationResultsTable = page.getByRole("table", {
    name: "Resultados internos de busca de localizacao",
  })
  await expect(locationResultsTable.getByText("E2E-LOC-159-A", { exact: true })).toBeVisible()
  await expect(locationResultsTable.getByText("E2E-LOC-159-B", { exact: true })).toBeVisible()
  await expect(locationResultsTable.getByText("Falecimento: 05/01/2024")).toBeVisible()
  await expect(locationResultsTable.getByText("Falecimento: 10/02/2024")).toBeVisible()
  await expect(locationResultsTable.getByText("Setor: Setor E2E Norte")).toBeVisible()
  await expect(locationResultsTable.getByText("Setor: Setor E2E Sul")).toBeVisible()
  await expect(locationResultsTable.getByText(FIRST_MASKED_DOCUMENT, { exact: true })).toBeVisible()
  await expect(locationResultsTable.getByText(SECOND_MASKED_DOCUMENT, { exact: true })).toBeVisible()
  await expectNoCompleteDocument(page)

  await page.getByLabel("Busca exata").selectOption("deceasedDocument")
  await page.getByRole("searchbox", { name: "Documento" }).fill(FIRST_DOCUMENT)
  await page.getByRole("button", { name: "Buscar" }).click()
  await expect(page.getByText("1 registro localizado por documento.")).toBeVisible()
  await expect(page.getByText("Resultado de busca exata por documento.")).toBeVisible()
  await expect(locationResultsTable.getByText("E2E-LOC-159-A", { exact: true })).toBeVisible()
  await expect(locationResultsTable.getByText("E2E-LOC-159-B", { exact: true })).toHaveCount(0)
  await expect(locationResultsTable.getByText(FIRST_MASKED_DOCUMENT, { exact: true })).toBeVisible()
  await expect(page.getByRole("searchbox", { name: "Documento" })).toHaveValue("")
  await expect(page).toHaveURL(/\/location-search(?:\?.*)?$/)
  await expectNoCompleteDocument(page)
})

test("visitors cannot access the location workflow directly", async ({ page }) => {
  await page.goto(
    `/location-search?deceasedName=${encodeURIComponent(HOMONYM_NAME)}&pageSize=10`,
  )

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole("heading", { name: "Acesso ao sistema" })).toBeVisible()
})
