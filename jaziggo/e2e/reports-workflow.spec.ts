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
  adminUserFixture,
  TEST_USER_PASSWORD,
} from "../tests/fixtures/users"
import { BURIAL_LINK_STATUS } from "../types/burial-link"
import {
  BURIAL_SPACE_STATUS,
  BURIAL_SPACE_TYPE,
} from "../types/burial-space"
import { USER_ROLE, USER_STATUS } from "../types/user"

const DEFAULT_E2E_DATABASE_URL =
  "postgresql://jaziggo_test:jaziggo_test@127.0.0.1:5432/jaziggo_test?schema=public"

const DECEASED_ID = "10000000-0000-4000-8000-000000000361"
const SPACE_ID = "20000000-0000-4000-8000-000000000361"
const LINK_ID = "30000000-0000-4000-8000-000000000361"

const DECEASED_NAME = "E2E Relatorio Administrativo"
const INTERNAL_CODE = "E2E-REP-161-D"
const SPACE_IDENTIFIER = "E2E-REP-161"
const SPACE_SECTOR = "Setor E2E Relatorios"
const COMPLETE_DOCUMENT = "E2E-REPORT-DOC-9876543210"
const NORMALIZED_DOCUMENT = COMPLETE_DOCUMENT.replace(/[^a-z0-9]/gi, "").toUpperCase()
const MASKED_DOCUMENT = maskDocument(COMPLETE_DOCUMENT)

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

async function deleteReportWorkflowData() {
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

async function seedReportWorkflow() {
  await deleteReportWorkflowData()

  await prisma.deceased.create({
    data: {
      id: DECEASED_ID,
      internalCode: INTERNAL_CODE,
      fullName: DECEASED_NAME,
      searchName: normalizeSearchName(DECEASED_NAME),
      document: NORMALIZED_DOCUMENT,
      deathDate: new Date("2026-06-08T00:00:00.000Z"),
      burialDate: new Date("2026-06-10T00:00:00.000Z"),
      datesUnknown: false,
      historicalDataIncomplete: false,
      createdAt: new Date("2026-06-15T12:00:00.000Z"),
    },
  })

  await prisma.burialSpace.create({
    data: {
      id: SPACE_ID,
      type: BURIAL_SPACE_TYPE.SEPULTURA,
      identifier: SPACE_IDENTIFIER,
      sector: SPACE_SECTOR,
      row: "Quadra 161",
      number: "161",
      locationKey: generateLocationKey({
        sector: SPACE_SECTOR,
        row: "Quadra 161",
        number: "161",
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
      burialDate: new Date("2026-06-10T00:00:00.000Z"),
      status: BURIAL_LINK_STATUS.ACTIVE,
    },
  })
}

async function login(page: Page, email: string) {
  await page.goto("/login")
  await page.getByLabel("E-mail").fill(email)
  await page.getByLabel("Senha").fill(TEST_USER_PASSWORD)
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL("/")
}

async function expectReportsShell(page: Page, selectedReport: string) {
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Relatorios",
      exact: true,
    }),
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { level: 2, name: selectedReport, exact: true }),
  ).toBeVisible()
  await expect(page.getByRole("button", { name: /export/i })).toHaveCount(0)
  await expect(page.getByRole("link", { name: /export/i })).toHaveCount(0)
}

async function expectNoCompleteDocument(page: Page) {
  await expect(page.locator("body")).not.toContainText(COMPLETE_DOCUMENT)
  await expect(page.locator("body")).not.toContainText(NORMALIZED_DOCUMENT)
  await expect(page).not.toHaveURL(new RegExp(COMPLETE_DOCUMENT))
  await expect(page).not.toHaveURL(new RegExp(NORMALIZED_DOCUMENT))
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
  await seedReportWorkflow()
})

test("ADMIN views the four internal reports with synthetic data and masked documents", async ({
  page,
}) => {
  await login(page, adminUserFixture.email)

  await page.goto(
    "/reports?reportType=deceased&startDate=2026-06-01&endDate=2026-06-30&pageSize=100",
  )
  await expectReportsShell(page, "Falecidos cadastrados")
  const deceasedTable = page.getByRole("table", {
    name: "Falecidos cadastrados",
  })
  await expect(deceasedTable.getByText(INTERNAL_CODE, { exact: true })).toBeVisible()
  await expect(deceasedTable.getByText(DECEASED_NAME, { exact: true })).toBeVisible()
  await expect(deceasedTable.getByText(MASKED_DOCUMENT, { exact: true })).toBeVisible()
  await expectNoCompleteDocument(page)

  await page.goto(
    "/reports?reportType=burials-by-period&startDate=2026-06-01&endDate=2026-06-30&pageSize=100",
  )
  await expectReportsShell(page, "Sepultamentos por periodo")
  const burialsTable = page.getByRole("table")
  await expect(burialsTable.getByText(INTERNAL_CODE, { exact: true })).toBeVisible()
  await expect(burialsTable.getByText(DECEASED_NAME, { exact: true })).toBeVisible()
  await expect(burialsTable.getByText(SPACE_IDENTIFIER, { exact: true })).toBeVisible()
  await expect(burialsTable.getByText(MASKED_DOCUMENT, { exact: true })).toBeVisible()
  await expectNoCompleteDocument(page)

  await page.goto(
    `/reports?reportType=space-occupation&sector=${encodeURIComponent(
      SPACE_SECTOR,
    )}&type=SEPULTURA&status=OCCUPIED&pageSize=100`,
  )
  await expectReportsShell(page, "Ocupacao de espacos")
  const occupationTable = page.getByRole("table")
  await expect(occupationTable.getByText(SPACE_IDENTIFIER, { exact: true })).toBeVisible()
  await expect(occupationTable.getByText(`Setor: ${SPACE_SECTOR}`)).toBeVisible()
  await expect(occupationTable.getByText("1/1", { exact: true })).toBeVisible()

  await page.goto(
    `/reports?reportType=space-status&sector=${encodeURIComponent(
      SPACE_SECTOR,
    )}&type=SEPULTURA&status=OCCUPIED&pageSize=100`,
  )
  await expectReportsShell(page, "Espacos por status")
  const statusTable = page.getByRole("table")
  await expect(statusTable.getByText(SPACE_IDENTIFIER, { exact: true })).toBeVisible()
  await expect(statusTable.getByText(`Setor: ${SPACE_SECTOR}`)).toBeVisible()
  await expect(statusTable.getByText("Ocupado", { exact: true })).toBeVisible()
})

test("ADMIN sees clear empty states for every report type", async ({ page }) => {
  await login(page, adminUserFixture.email)

  await page.goto(
    "/reports?reportType=deceased&startDate=1900-01-01&endDate=1900-01-02&pageSize=100",
  )
  await expectReportsShell(page, "Falecidos cadastrados")
  await expect(page.getByText("Nenhum falecido encontrado", { exact: true })).toBeVisible()

  await page.goto(
    "/reports?reportType=burials-by-period&startDate=1900-01-01&endDate=1900-01-02&pageSize=100",
  )
  await expectReportsShell(page, "Sepultamentos por periodo")
  await expect(page.getByText("Nenhum sepultamento encontrado", { exact: true })).toBeVisible()

  await page.goto(
    "/reports?reportType=space-occupation&sector=Setor%20E2E%20Relatorios%20Vazio&pageSize=100",
  )
  await expectReportsShell(page, "Ocupacao de espacos")
  await expect(page.getByText("Nenhum espaco encontrado", { exact: true })).toBeVisible()

  await page.goto(
    "/reports?reportType=space-status&sector=Setor%20E2E%20Relatorios%20Vazio&pageSize=100",
  )
  await expectReportsShell(page, "Espacos por status")
  await expect(page.getByText("Nenhum espaco encontrado", { exact: true })).toBeVisible()
})

test("EMPLOYEE cannot access internal reports", async ({ page }) => {
  await login(page, activeEmployeeUserFixture.email)

  await page.goto("/reports")

  await expect(page).not.toHaveURL(/\/reports(?:\?|$)/)
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Relatorios",
      exact: true,
    }),
  ).toHaveCount(0)
})
