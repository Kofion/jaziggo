import { argon2id, hash } from "argon2"
import { expect, test, type Page } from "@playwright/test"
import type { PrismaClient } from "@prisma/client"

import { maskDocument } from "../lib/privacy/mask-document"
import {
  generateLocationKey,
  normalizeDocument,
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

const DECEASED_ID = "10000000-0000-4000-8000-000000000163"
const RESPONSIBLE_ID = "11000000-0000-4000-8000-000000000163"
const SPACE_ID = "20000000-0000-4000-8000-000000000163"
const LINK_ID = "30000000-0000-4000-8000-000000000163"
const DEACTIVATE_USER_ID = "40000000-0000-4000-8000-000000000163"

const DECEASED_NAME = "E2E Feedback Textual"
const INTERNAL_CODE = "E2E-FEED-163-D"
const SPACE_IDENTIFIER = "E2E-FEED-163"
const SPACE_SECTOR = "Setor E2E Feedback"
const DOCUMENT = "E2E-FEEDBACK-DOC-1630000000"
const NORMALIZED_DOCUMENT = normalizeDocument(DOCUMENT)
const MASKED_DOCUMENT = maskDocument(DOCUMENT)
const END_REASON = "Encerramento historico E2E T163"

let prisma: PrismaClient
let passwordHash: string

type BrowserJsonResponse = Readonly<{
  status: number
  body: {
    success?: boolean
    error?: {
      code?: string
      message?: string
    }
    data?: unknown
  } | null
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

async function seedAuthUsers() {
  passwordHash ??= await hash(TEST_USER_PASSWORD, {
    type: argon2id,
    memoryCost: 65_536,
    timeCost: 3,
    parallelism: 1,
  })

  await prisma.user.deleteMany({
    where: {
      OR: [
        {
          id: {
            in: [
              adminUserFixture.id,
              activeEmployeeUserFixture.id,
              DEACTIVATE_USER_ID,
            ],
          },
        },
        {
          email: {
            in: [
              adminUserFixture.email,
              activeEmployeeUserFixture.email,
              "feedback-target@jaziggo.test",
            ],
          },
        },
      ],
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
      {
        id: DEACTIVATE_USER_ID,
        name: "E2E Feedback Deactivation Target",
        email: "feedback-target@jaziggo.test",
        passwordHash,
        role: USER_ROLE.EMPLOYEE,
        status: USER_STATUS.ACTIVE,
      },
    ],
  })
}

async function deleteFeedbackData() {
  await prisma.burialLink.deleteMany({
    where: {
      OR: [
        { id: LINK_ID },
        { deceasedId: DECEASED_ID },
        { burialSpaceId: SPACE_ID },
      ],
    },
  })
  await prisma.responsibleLink.deleteMany({
    where: {
      OR: [
        { responsibleId: RESPONSIBLE_ID },
        { deceasedId: DECEASED_ID },
        { burialSpaceId: SPACE_ID },
      ],
    },
  })
  await prisma.responsible.deleteMany({ where: { id: RESPONSIBLE_ID } })
  await prisma.deceased.deleteMany({ where: { id: DECEASED_ID } })
  await prisma.burialSpace.deleteMany({ where: { id: SPACE_ID } })
}

async function seedFeedbackData() {
  await deleteFeedbackData()

  await prisma.deceased.create({
    data: {
      id: DECEASED_ID,
      internalCode: INTERNAL_CODE,
      fullName: DECEASED_NAME,
      searchName: normalizeSearchName(DECEASED_NAME),
      document: NORMALIZED_DOCUMENT,
      deathDate: new Date("2026-03-01T00:00:00.000Z"),
      burialDate: new Date("2026-03-03T00:00:00.000Z"),
      datesUnknown: false,
      historicalDataIncomplete: false,
    },
  })

  await prisma.responsible.create({
    data: {
      id: RESPONSIBLE_ID,
      fullName: "E2E Responsavel Feedback",
      searchName: normalizeSearchName("E2E Responsavel Feedback"),
      email: "responsavel-feedback@jaziggo.test",
    },
  })

  await prisma.burialSpace.create({
    data: {
      id: SPACE_ID,
      type: BURIAL_SPACE_TYPE.SEPULTURA,
      identifier: SPACE_IDENTIFIER,
      sector: SPACE_SECTOR,
      row: "Quadra 163",
      number: "163",
      locationKey: generateLocationKey({
        sector: SPACE_SECTOR,
        row: "Quadra 163",
        number: "163",
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
      responsibleId: RESPONSIBLE_ID,
      burialDate: new Date("2026-03-03T00:00:00.000Z"),
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

async function patchJson(
  page: Page,
  path: string,
  body: Record<string, unknown> | undefined,
): Promise<BrowserJsonResponse> {
  return page.evaluate(
    async ({ requestPath, requestBody }) => {
      const response = await fetch(requestPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        ...(requestBody ? { body: JSON.stringify(requestBody) } : {}),
      })
      const responseBody = await response.json().catch(() => null)

      return { status: response.status, body: responseBody }
    },
    { requestPath: path, requestBody: body },
  )
}

async function expectNoSensitiveDocument(page: Page) {
  await expect(page.locator("body")).not.toContainText(DOCUMENT)
  await expect(page.locator("body")).not.toContainText(NORMALIZED_DOCUMENT)
  await expect(page).not.toHaveURL(new RegExp(DOCUMENT))
  await expect(page).not.toHaveURL(new RegExp(NORMALIZED_DOCUMENT))
}

function locationResultsTable(page: Page) {
  return page.getByRole("table", {
    name: "Resultados internos de busca de localizacao",
  })
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
  await seedFeedbackData()
})

test("EMPLOYEE receives textual loading, empty, error and success feedback in location search", async ({
  page,
}) => {
  await login(page, activeEmployeeUserFixture.email)

  await page.goto("/location-search")
  await expect(
    page.getByRole("heading", { level: 1, name: "Busca e localizacao" }),
  ).toBeVisible()
  await expect(page.getByText("Nenhum resultado carregado")).toBeVisible()
  await expect(
    page.getByText("Informe filtros de atendimento para iniciar a busca de localizacao."),
  ).toBeVisible()

  await page.goto("/location-search?deceasedName=E2E%20Feedback%20Sem%20Resultado")
  await expect(page.getByText("Nenhum registro encontrado")).toBeVisible()
  await expect(
    page.getByText("Revise nome, datas, setor, identificacao ou documento e tente novamente."),
  ).toBeVisible()

  let releaseFailedDocumentSearch: (() => void) | undefined
  await page.route("**/api/v1/location-search/by-document", async (route) => {
    await new Promise<void>((resolve) => {
      releaseFailedDocumentSearch = resolve
    })
    await route.fulfill({
      contentType: "application/json",
      status: 500,
      body: JSON.stringify({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to complete request",
        },
        requestId: "e2e-t163-feedback",
      }),
    })
  })

  const documentSearchBox = page.getByRole("searchbox", { name: "Documento" })
  await documentSearchBox.fill("E2E-FEEDBACK-LOOKUP")
  await page.getByRole("button", { name: "Buscar por documento" }).click()
  await expect(page.getByRole("status").filter({ hasText: "Buscando localizacao" })).toBeVisible()
  await expect(
    page.getByText(
      "A busca por documento esta em andamento sem persistir o valor informado na URL.",
    ),
  ).toBeVisible()
  releaseFailedDocumentSearch?.()
  await expect(page.getByRole("alert").filter({ hasText: "Busca nao concluida" })).toBeVisible()
  await expect(
    page.getByText("Nao foi possivel concluir a busca por documento. Tente novamente."),
  ).toBeVisible()

  await page.unroute("**/api/v1/location-search/by-document")
  await documentSearchBox.fill(DOCUMENT)
  await page.getByRole("button", { name: "Buscar por documento" }).click()
  await expect(page.getByRole("status").filter({ hasText: "1 registro localizado por documento." })).toBeVisible()

  const table = locationResultsTable(page)
  await expect(table.getByText(INTERNAL_CODE, { exact: true })).toBeVisible()
  await expect(table.getByText(DECEASED_NAME, { exact: true })).toBeVisible()
  await expect(table.getByText(MASKED_DOCUMENT, { exact: true })).toBeVisible()
  await expect(
    page.getByText("Resultado de busca exata por documento. O documento informado nao foi persistido na URL."),
  ).toBeVisible()
  await expect(documentSearchBox).toHaveValue("")
  await expectNoSensitiveDocument(page)
})

test("ADMIN sees textual empty and invalid-filter feedback across administrative modules", async ({
  page,
}) => {
  await login(page, adminUserFixture.email)

  await page.goto("/users?status=UNKNOWN")
  await expect(
    page.getByRole("alert").filter({ hasText: /Filtros inv/ }),
  ).toBeVisible()
  await expect(
    page.getByText(
      /Revise os filtros e a pagina.*antes de tentar novamente\./,
    ),
  ).toBeVisible()

  await page.goto("/users?role=ADMIN&status=INACTIVE&pageSize=10")
  await expect(page.getByRole("status").filter({ hasText: /Nenhum usu/ })).toBeVisible()
  await expect(
    page.getByText("Ajuste os filtros para verificar outros perfis ou status de contas internas."),
  ).toBeVisible()

  await page.goto("/deceased?name=E2E%20Feedback%20Sem%20Resultado&pageSize=10")
  await expect(page.getByText("Nenhum falecido encontrado")).toBeVisible()
  await expect(
    page.getByText("Ajuste os filtros para verificar outros nomes, codigos ou datas cadastradas."),
  ).toBeVisible()

  await page.goto("/responsibles?name=E2E%20Feedback%20Sem%20Resultado&pageSize=10")
  await expect(page.getByText(/Nenhum respons[aá]vel encontrado/)).toBeVisible()
  await expect(
    page.getByText(/Ajuste o filtro de nome para verificar outros cadastros administrativos\./),
  ).toBeVisible()

  await page.goto("/burial-spaces?identifier=E2E-FEEDBACK-SEM-RESULTADO&pageSize=10")
  await expect(page.getByText("Nenhum espaco encontrado")).toBeVisible()
  await expect(
    page.getByText("Ajuste os filtros para verificar outros tipos, status ou setores cadastrados."),
  ).toBeVisible()

  await page.goto("/reports?reportType=deceased&startDate=2026-04-01&endDate=2026-04-30&pageSize=10")
  await expect(
    page.getByRole("heading", { name: "Nenhum falecido encontrado" }),
  ).toBeVisible()
  await expect(
    page.getByText("Nenhum falecido encontrado para os filtros selecionados."),
  ).toBeVisible()
})

test("sensitive operations require explicit confirmation and return safe textual feedback", async ({
  page,
}) => {
  await login(page, adminUserFixture.email)

  const missingStatusConfirmation = await patchJson(
    page,
    `/api/v1/burial-spaces/${SPACE_ID}/status`,
    { status: BURIAL_SPACE_STATUS.RESERVED },
  )
  expect(missingStatusConfirmation).toMatchObject({
    status: 422,
    body: {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid burial space status data",
      },
    },
  })

  const blockedReservedStatus = await patchJson(
    page,
    `/api/v1/burial-spaces/${SPACE_ID}/status`,
    {
      status: BURIAL_SPACE_STATUS.RESERVED,
      confirmation: true,
    },
  )
  expect(blockedReservedStatus).toMatchObject({
    status: 409,
    body: {
      success: false,
      error: {
        code: "CONFLICT",
        message: "Burial space status conflicts with active links",
      },
    },
  })

  const missingEndConfirmation = await patchJson(
    page,
    `/api/v1/burial-links/${LINK_ID}/end`,
    {
      endedAt: "2026-03-10T12:00:00.000Z",
      endReason: END_REASON,
    },
  )
  expect(missingEndConfirmation).toMatchObject({
    status: 422,
    body: {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid burial link end data",
      },
    },
  })

  const endedLink = await patchJson(page, `/api/v1/burial-links/${LINK_ID}/end`, {
    endedAt: "2026-03-10T12:00:00.000Z",
    endReason: END_REASON,
    confirmation: true,
  })
  expect(endedLink).toMatchObject({
    status: 200,
    body: {
      success: true,
      data: {
        id: LINK_ID,
        status: BURIAL_LINK_STATUS.ENDED,
        endReason: END_REASON,
      },
    },
  })

  const reservedStatus = await patchJson(page, `/api/v1/burial-spaces/${SPACE_ID}/status`, {
    status: BURIAL_SPACE_STATUS.RESERVED,
    confirmation: true,
  })
  expect(reservedStatus).toMatchObject({
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

  const deactivatedUser = await patchJson(
    page,
    `/api/v1/users/${DEACTIVATE_USER_ID}/deactivate`,
    undefined,
  )
  expect(deactivatedUser).toMatchObject({
    status: 200,
    body: {
      success: true,
      data: { acknowledged: true },
    },
  })

  await page.goto(`/burial-spaces/${SPACE_ID}`)
  await expect(page.getByText("Reservado", { exact: true })).toBeVisible()
  await expect(page.getByText("0/1", { exact: true })).toBeVisible()
  await expect(page.getByText("Vinculos ativos e encerrados permanecem visiveis")).toBeVisible()
  await expect(page.getByText(END_REASON, { exact: true })).toBeVisible()
  await expectNoSensitiveDocument(page)
})
