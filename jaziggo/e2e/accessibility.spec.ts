import { argon2id, hash } from "argon2"
import { expect, test, type Locator, type Page } from "@playwright/test"
import type { PrismaClient } from "@prisma/client"

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
import {
  BURIAL_SPACE_STATUS,
  BURIAL_SPACE_TYPE,
} from "../types/burial-space"
import { BURIAL_LINK_STATUS } from "../types/burial-link"
import { USER_ROLE, USER_STATUS } from "../types/user"

const DEFAULT_E2E_DATABASE_URL =
  "postgresql://jaziggo_test:jaziggo_test@127.0.0.1:5432/jaziggo_test?schema=public"

const DECEASED_ID = "10000000-0000-4000-8000-000000000462"
const SPACE_ID = "20000000-0000-4000-8000-000000000462"
const LINK_ID = "30000000-0000-4000-8000-000000000462"
const RESPONSIBLE_ID = "40000000-0000-4000-8000-000000000462"

const DECEASED_NAME = "E2E Acessibilidade Interna"
const INTERNAL_CODE = "E2E-A11Y-162-D"
const SPACE_IDENTIFIER = "E2E-A11Y-162"
const SPACE_SECTOR = "Setor E2E Acessibilidade"
const SPACE_ROW = "Quadra 162"
const SPACE_NUMBER = "162"
const RESPONSIBLE_NAME = "E2E Responsavel Acessibilidade"
const DEATH_DATE = "2026-06-11"
const BURIAL_DATE = "2026-06-12"

let prisma: PrismaClient
let passwordHash: string

type ContrastFailure = Readonly<{
  text: string
  ratio: number
  color: string
  backgroundColor: string
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

async function deleteAccessibilityData() {
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
  await prisma.responsible.deleteMany({ where: { id: RESPONSIBLE_ID } })
  await prisma.burialSpace.deleteMany({ where: { id: SPACE_ID } })
}

async function seedAccessibilityData() {
  await deleteAccessibilityData()

  await prisma.deceased.create({
    data: {
      id: DECEASED_ID,
      internalCode: INTERNAL_CODE,
      fullName: DECEASED_NAME,
      searchName: normalizeSearchName(DECEASED_NAME),
      document: null,
      deathDate: new Date(`${DEATH_DATE}T00:00:00.000Z`),
      burialDate: new Date(`${BURIAL_DATE}T00:00:00.000Z`),
      datesUnknown: false,
      historicalDataIncomplete: true,
      createdAt: new Date("2026-06-13T12:00:00.000Z"),
    },
  })

  await prisma.burialSpace.create({
    data: {
      id: SPACE_ID,
      type: BURIAL_SPACE_TYPE.SEPULTURA,
      identifier: SPACE_IDENTIFIER,
      sector: SPACE_SECTOR,
      row: SPACE_ROW,
      number: SPACE_NUMBER,
      locationKey: generateLocationKey({
        sector: SPACE_SECTOR,
        row: SPACE_ROW,
        number: SPACE_NUMBER,
      }),
      status: BURIAL_SPACE_STATUS.OCCUPIED,
      capacity: 1,
    },
  })

  await prisma.responsible.create({
    data: {
      id: RESPONSIBLE_ID,
      fullName: RESPONSIBLE_NAME,
      searchName: normalizeSearchName(RESPONSIBLE_NAME),
      email: "responsavel-a11y-162@example.test",
    },
  })

  await prisma.burialLink.create({
    data: {
      id: LINK_ID,
      deceasedId: DECEASED_ID,
      burialSpaceId: SPACE_ID,
      responsibleId: RESPONSIBLE_ID,
      burialDate: new Date(`${BURIAL_DATE}T00:00:00.000Z`),
      status: BURIAL_LINK_STATUS.ACTIVE,
    },
  })
}

async function tabUntilFocused(page: Page, locator: Locator, maxTabs = 20) {
  for (let index = 0; index < maxTabs; index += 1) {
    if (await locator.evaluate((element) => element === document.activeElement)) {
      return
    }

    await page.keyboard.press("Tab")
  }

  await expect(locator).toBeFocused()
}

async function expectVisibleFocus(locator: Locator) {
  await expect(locator).toBeFocused()

  const hasVisibleFocus = await locator.evaluate((element) => {
    const styles = window.getComputedStyle(element)
    const outlineWidth = Number.parseFloat(styles.outlineWidth)

    return (
      styles.outlineStyle !== "none" ||
      outlineWidth > 0 ||
      styles.boxShadow !== "none" ||
      styles.borderColor !== "rgba(0, 0, 0, 0)"
    )
  })

  expect(hasVisibleFocus).toBe(true)
}

async function loginWithKeyboard(page: Page, email: string) {
  await page.goto("/login")
  await expect(
    page.getByRole("heading", { name: "Acesso ao sistema" }),
  ).toBeVisible()

  const emailInput = page.getByLabel("E-mail")
  const passwordInput = page.getByLabel("Senha")
  const submitButton = page.getByRole("button", { name: "Entrar" })

  await tabUntilFocused(page, emailInput)
  await expectVisibleFocus(emailInput)
  await page.keyboard.type(email)
  await page.keyboard.press("Tab")
  await expect(passwordInput).toBeFocused()
  await expectVisibleFocus(passwordInput)
  await page.keyboard.type(TEST_USER_PASSWORD)
  await page.keyboard.press("Tab")
  await expect(submitButton).toBeFocused()
  await expectVisibleFocus(submitButton)
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL("/")
}

async function expectSinglePageHeading(page: Page, name: string) {
  await expect(
    page.getByRole("heading", { level: 1, name, exact: true }),
  ).toBeVisible()
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1)
}

async function expectHeadingLevelsDoNotSkip(page: Page) {
  const headingLevels = await page
    .getByRole("heading")
    .evaluateAll((headings) =>
      headings.map((heading) => Number(heading.tagName.slice(1))),
    )

  for (let index = 1; index < headingLevels.length; index += 1) {
    expect(headingLevels[index] - headingLevels[index - 1]).toBeLessThanOrEqual(1)
  }
}

async function expectVisibleControlsHaveAccessibleNames(page: Page) {
  const unnamedControls = await page.evaluate(() => {
    function textFromLabelledBy(element: Element) {
      const labelledBy = element.getAttribute("aria-labelledby")

      if (!labelledBy) return ""

      return labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
        .join(" ")
        .trim()
    }

    function labelText(element: Element) {
      const id = element.getAttribute("id")
      const explicitLabel = id
        ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent?.trim()
        : ""
      const wrappingLabel = element.closest("label")?.textContent?.trim() ?? ""
      const ariaLabel = element.getAttribute("aria-label")?.trim() ?? ""
      const labelledBy = textFromLabelledBy(element)

      return explicitLabel || wrappingLabel || ariaLabel || labelledBy
    }

    return Array.from(
      document.querySelectorAll("input, select, textarea, button"),
    )
      .filter((element) => {
        const htmlElement = element as HTMLElement
        const styles = window.getComputedStyle(htmlElement)
        const input = element as HTMLInputElement

        return (
          input.type !== "hidden" &&
          !htmlElement.hidden &&
          styles.display !== "none" &&
          styles.visibility !== "hidden"
        )
      })
      .filter((element) => labelText(element).length === 0)
      .map((element) => element.outerHTML.slice(0, 160))
  })

  expect(unnamedControls).toEqual([])
}

async function expectTextContrast(page: Page) {
  const failures = await page.evaluate<ContrastFailure[]>(() => {
    type RgbaColor = Readonly<{ r: number; g: number; b: number; a: number }>

    const colorCanvas = document.createElement("canvas")
    colorCanvas.width = 1
    colorCanvas.height = 1
    const colorContext = colorCanvas.getContext("2d", {
      willReadFrequently: true,
    })

    function renderedColor(value: string): RgbaColor | null {
      if (!colorContext) return null

      colorContext.clearRect(0, 0, 1, 1)
      colorContext.fillStyle = "#000000"
      colorContext.fillStyle = value
      colorContext.fillRect(0, 0, 1, 1)

      const [r, g, b, alpha] = colorContext.getImageData(0, 0, 1, 1).data

      return { r, g, b, a: alpha / 255 }
    }

    function channel(value: number) {
      const normalized = value / 255

      return normalized <= 0.03928
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4
    }

    function luminance(color: RgbaColor) {
      return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b)
    }

    function contrastRatio(foreground: RgbaColor, background: RgbaColor) {
      const lighter = Math.max(luminance(foreground), luminance(background))
      const darker = Math.min(luminance(foreground), luminance(background))

      return (lighter + 0.05) / (darker + 0.05)
    }

    function blend(foreground: RgbaColor, background: RgbaColor): RgbaColor {
      const alpha = foreground.a + background.a * (1 - foreground.a)

      if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 }

      return {
        r: (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha,
        g: (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha,
        b: (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha,
        a: alpha,
      }
    }

    function effectiveBackground(element: Element): RgbaColor {
      const backgrounds: RgbaColor[] = []
      let current: Element | null = element

      while (current) {
        const color = renderedColor(window.getComputedStyle(current).backgroundColor)

        if (color && color.a > 0) backgrounds.push(color)

        current = current.parentElement
      }

      return backgrounds
        .reverse()
        .reduce<RgbaColor>(
          (background, foreground) => blend(foreground, background),
          { r: 255, g: 255, b: 255, a: 1 },
        )
    }

    function isVisible(element: HTMLElement) {
      const styles = window.getComputedStyle(element)

      return (
        element.offsetParent !== null &&
        styles.display !== "none" &&
        styles.visibility !== "hidden" &&
        styles.opacity !== "0"
      )
    }

    function isDisabledOrInactive(element: HTMLElement) {
      return Boolean(element.closest("[disabled], [aria-disabled=\"true\"]"))
    }

    return Array.from(document.body.querySelectorAll<HTMLElement>("body *"))
      .filter((element) =>
        isVisible(element) &&
        !isDisabledOrInactive(element) &&
        (element.innerText ?? "").trim().length > 0,
      )
      .flatMap((element) => {
        const directText = Array.from(element.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent?.trim() ?? "")
          .join(" ")
          .trim()

        if (!directText) return []

        const styles = window.getComputedStyle(element)
        const foreground = renderedColor(styles.color)
        const background = effectiveBackground(element)

        if (!foreground) return []

        const fontSize = Number.parseFloat(styles.fontSize)
        const fontWeight = Number.parseInt(styles.fontWeight, 10)
        const minimumRatio = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700) ? 3 : 4.5
        const ratio = contrastRatio(blend(foreground, background), background)

        return ratio + 0.01 >= minimumRatio
          ? []
          : [
              {
                text: directText.slice(0, 80),
                ratio: Number(ratio.toFixed(2)),
                color: styles.color,
                backgroundColor: styles.backgroundColor,
              },
            ]
      })
      .slice(0, 10)
  })

  expect(failures).toEqual([])
}

async function expectAccessibilityBaseline(page: Page, h1: string) {
  await expectSinglePageHeading(page, h1)
  await expectHeadingLevelsDoNotSkip(page)
  await expectVisibleControlsHaveAccessibleNames(page)
  await expectTextContrast(page)
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
  await seedAccessibilityData()
})

test("EMPLOYEE completes login and location search with keyboard, labels, focus, headings and contrast", async ({
  page,
}) => {
  await loginWithKeyboard(page, activeEmployeeUserFixture.email)

  await page.goto("/location-search")
  await expectAccessibilityBaseline(page, "Busca e localizacao")

  const deceasedNameInput = page.getByLabel("Nome do falecido")
  const filterButton = page.getByRole("button", { name: "Filtrar" })

  await tabUntilFocused(page, deceasedNameInput)
  await expectVisibleFocus(deceasedNameInput)
  await page.keyboard.type(DECEASED_NAME)

  const responsibleNameInput = page.getByLabel("Nome do responsavel")
  await tabUntilFocused(page, responsibleNameInput)
  await expectVisibleFocus(responsibleNameInput)
  await page.keyboard.type(RESPONSIBLE_NAME)

  const deathDateInput = page.getByLabel("Falecimento")
  await tabUntilFocused(page, deathDateInput)
  await expectVisibleFocus(deathDateInput)
  await deathDateInput.fill(DEATH_DATE)

  const burialDateInput = page.getByLabel("Sepultamento")
  await tabUntilFocused(page, burialDateInput)
  await expectVisibleFocus(burialDateInput)
  await burialDateInput.fill(BURIAL_DATE)

  const sectorInput = page.getByLabel("Setor")
  await tabUntilFocused(page, sectorInput)
  await expectVisibleFocus(sectorInput)
  await page.keyboard.type(SPACE_SECTOR)

  const identifierInput = page.getByLabel("Identificacao")
  await tabUntilFocused(page, identifierInput)
  await expectVisibleFocus(identifierInput)
  await page.keyboard.type(SPACE_IDENTIFIER)

  await tabUntilFocused(page, filterButton)
  await expectVisibleFocus(filterButton)
  await filterButton.press("Enter")

  await expect(page).toHaveURL(/\/location-search\?/)
  const submittedSearchParams = new URL(page.url()).searchParams
  expect(submittedSearchParams.get("deceasedName")).toBe(DECEASED_NAME)
  expect(submittedSearchParams.get("responsibleName")).toBe(RESPONSIBLE_NAME)
  expect(submittedSearchParams.get("deathDate")).toBe(DEATH_DATE)
  expect(submittedSearchParams.get("burialDate")).toBe(BURIAL_DATE)
  expect(submittedSearchParams.get("sector")).toBe(SPACE_SECTOR)
  expect(submittedSearchParams.get("burialSpaceIdentifier")).toBe(SPACE_IDENTIFIER)

  await expect(page.getByRole("heading", { name: "Resultados de localizacao" })).toBeVisible()
  const resultsTable = page.getByRole("table").filter({
    hasText: DECEASED_NAME,
  })
  await expect(resultsTable).toBeVisible()
  await expect(
    resultsTable.getByText(INTERNAL_CODE, { exact: true }),
  ).toBeVisible()
  await expectAccessibilityBaseline(page, "Busca e localizacao")

  const exactSearchButton = page.getByRole("button", { name: "Buscar" })
  await tabUntilFocused(page, exactSearchButton)
  await expectVisibleFocus(exactSearchButton)
  await page.keyboard.press("Enter")

  const alert = page.getByRole("alert").filter({
    hasText: "Busca nao concluida",
  })
  await expect(alert).toContainText("Busca nao concluida")
  await expect(alert).toContainText("Informe o documento para executar a busca exata.")
})

test("ADMIN report filtering remains keyboard reachable with accessible labels, headings and contrast", async ({
  page,
}) => {
  await loginWithKeyboard(page, adminUserFixture.email)

  await page.goto(
    `/reports?reportType=space-occupation&sector=${encodeURIComponent(
      SPACE_SECTOR,
    )}&type=SEPULTURA&status=OCCUPIED&pageSize=100`,
  )
  await expectAccessibilityBaseline(page, "Relatorios")

  const reportType = page.getByLabel("Tipo de relatorio")
  const sectorInput = page.getByLabel("Setor")
  const applyFilters = page.getByRole("button", { name: "Aplicar filtros" })

  await tabUntilFocused(page, reportType)
  await expectVisibleFocus(reportType)
  await tabUntilFocused(page, sectorInput)
  await expectVisibleFocus(sectorInput)
  await tabUntilFocused(page, applyFilters)
  await expectVisibleFocus(applyFilters)

  await expect(
    page.getByRole("table").getByText(SPACE_IDENTIFIER, { exact: true }),
  ).toBeVisible()
})

test("registration and listing pages expose labeled controls, structured headings and non-color-only empty feedback", async ({
  page,
}) => {
  await loginWithKeyboard(page, activeEmployeeUserFixture.email)

  await page.goto("/deceased?name=Nenhum%20Registro%20E2E%20162")
  await expectAccessibilityBaseline(page, "Falecidos")
  await expect(page.getByLabel("Nome")).toBeVisible()
  await expect(page.getByLabel("Codigo interno")).toBeVisible()
  await expect(page.getByText("Nenhum falecido encontrado", { exact: true })).toBeVisible()
  await expect(
    page.getByText(
      "Ajuste os filtros para verificar outros nomes, codigos ou datas cadastradas.",
    ),
  ).toBeVisible()

  await page.goto("/burial-spaces?identifier=Nenhum%20Espaco%20E2E%20162")
  await expectAccessibilityBaseline(page, "Sepulturas e jazigos")
  await expect(page.getByLabel("Identificacao")).toBeVisible()
  await expect(page.getByLabel("Tipo")).toBeVisible()
  await expect(page.getByLabel("Status")).toBeVisible()
  await expect(page.getByText("Nenhum espaco encontrado", { exact: true })).toBeVisible()
  await expect(
    page.getByText(
      "Ajuste os filtros para verificar outros tipos, status ou setores cadastrados.",
    ),
  ).toBeVisible()
})
