import { beforeEach, describe, expect, it, vi } from "vitest"

import { DOMAIN_ERROR_CODE, HTTP_STATUS } from "@/types/api"
import { PERMISSION } from "@/types/auth"
import { BURIAL_LINK_STATUS } from "@/types/burial-link"
import {
  BURIAL_SPACE_STATUS,
  BURIAL_SPACE_TYPE,
} from "@/types/burial-space"

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  burialLink: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  burialSpace: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  deceased: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
}))

const requirePermissionMock = vi.hoisted(() => vi.fn())

vi.mock("server-only", () => ({}))

vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: requirePermissionMock,
}))

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}))

const {
  generateBurialsByPeriodReport,
  generateDeceasedReport,
  generateSpaceOccupationReport,
  generateSpaceStatusReport,
} = await import("@/services/report-service")

const adminUserId = "00000000-0000-4000-8000-000000000137"
const deceasedId = "00000000-0000-4000-8000-000000000138"
const burialLinkId = "00000000-0000-4000-8000-000000000139"
const burialSpaceId = "00000000-0000-4000-8000-000000000140"
const fullDocument = "12345678900"

function deceasedRecord() {
  return {
    id: deceasedId,
    internalCode: "JZG-001",
    fullName: "Joao da Silva",
    document: fullDocument,
    deathDate: new Date("2026-01-10T00:00:00.000Z"),
    burialDate: new Date("2026-01-12T00:00:00.000Z"),
    historicalDataIncomplete: false,
    createdAt: new Date("2026-01-11T12:30:00.000Z"),
  }
}

function burialLinkRecord() {
  return {
    id: burialLinkId,
    burialDate: new Date("2026-01-12T00:00:00.000Z"),
    status: BURIAL_LINK_STATUS.ACTIVE,
    deceased: {
      id: deceasedId,
      internalCode: "JZG-001",
      fullName: "Joao da Silva",
      document: fullDocument,
    },
    burialSpace: {
      id: burialSpaceId,
      type: BURIAL_SPACE_TYPE.JAZIGO,
      identifier: "J-22",
      sector: "A",
      block: null,
      street: "Principal",
      row: "2",
      number: null,
      complement: "Proximo ao portao",
      status: BURIAL_SPACE_STATUS.OCCUPIED,
    },
  }
}

function burialSpaceRecord(overrides: {
  activeLinkCount?: number
  capacity?: number
  id?: string
  identifier?: string
  status?: (typeof BURIAL_SPACE_STATUS)[keyof typeof BURIAL_SPACE_STATUS]
  type?: (typeof BURIAL_SPACE_TYPE)[keyof typeof BURIAL_SPACE_TYPE]
} = {}) {
  return {
    id: overrides.id ?? burialSpaceId,
    type: overrides.type ?? BURIAL_SPACE_TYPE.JAZIGO,
    identifier: overrides.identifier ?? "J-22",
    sector: "A",
    block: null,
    street: "Principal",
    row: "2",
    number: null,
    complement: "Proximo ao portao",
    status: overrides.status ?? BURIAL_SPACE_STATUS.OCCUPIED,
    capacity: overrides.capacity ?? 3,
    _count: {
      burialLinks: overrides.activeLinkCount ?? 2,
    },
  }
}

function mockTransaction(): void {
  prismaMock.$transaction.mockImplementation(async (operations: unknown[]) =>
    Promise.all(operations),
  )
}

function expectNoFullDocument(value: unknown): void {
  const serialized = JSON.stringify(value)

  expect(serialized).not.toContain(fullDocument)
  expect(serialized).not.toContain("123.456.789-00")
}

describe("ReportService", () => {
  let infoSpy: ReturnType<typeof vi.spyOn>
  let warnSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    prismaMock.$transaction.mockReset()
    prismaMock.burialLink.count.mockReset()
    prismaMock.burialLink.findMany.mockReset()
    prismaMock.burialSpace.count.mockReset()
    prismaMock.burialSpace.findMany.mockReset()
    prismaMock.deceased.count.mockReset()
    prismaMock.deceased.findMany.mockReset()
    requirePermissionMock.mockReset()
    requirePermissionMock.mockResolvedValue({ id: adminUserId })
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {})
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    mockTransaction()
  })

  it("generates the deceased report with period filters, totals and masked documents", async () => {
    prismaMock.deceased.findMany.mockResolvedValue([deceasedRecord()])
    prismaMock.deceased.count.mockResolvedValue(7)

    const report = await generateDeceasedReport({
      page: 2,
      pageSize: 3,
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    })

    expect(requirePermissionMock).toHaveBeenCalledWith(
      PERMISSION.VIEW_REPORTS,
    )
    expect(prismaMock.deceased.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          createdAt: {
            gte: new Date("2026-01-01T00:00:00.000Z"),
            lt: new Date("2026-02-01T00:00:00.000Z"),
          },
        },
        skip: 3,
        take: 3,
      }),
    )
    expect(report).toMatchObject({
      title: "Falecidos cadastrados",
      filters: {
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      },
      page: 2,
      pageSize: 3,
      totalRecords: 7,
      totalPages: 3,
      data: [
        {
          id: deceasedId,
          internalCode: "JZG-001",
          fullName: "Joao da Silva",
          documentMasked: "*******8900",
          deathDate: "2026-01-10",
          burialDate: "2026-01-12",
          historicalDataIncomplete: false,
          createdAt: "2026-01-11T12:30:00.000Z",
        },
      ],
    })
    expect(report).not.toHaveProperty("emptyMessage")
    expectNoFullDocument(report)
    expectNoFullDocument(infoSpy.mock.calls)
  })

  it("generates the burials-by-period report with link status, location and masked documents", async () => {
    prismaMock.burialLink.findMany.mockResolvedValue([burialLinkRecord()])
    prismaMock.burialLink.count.mockResolvedValue(1)

    const report = await generateBurialsByPeriodReport({
      startDate: "2026-01-01",
      endDate: "2026-01-31",
      linkStatus: BURIAL_LINK_STATUS.ACTIVE,
    })

    expect(prismaMock.burialLink.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          burialDate: {
            gte: new Date("2026-01-01T00:00:00.000Z"),
            lt: new Date("2026-02-01T00:00:00.000Z"),
          },
          status: BURIAL_LINK_STATUS.ACTIVE,
        },
      }),
    )
    expect(report).toMatchObject({
      title: "Sepultamentos por per\u00edodo",
      filters: {
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        linkStatus: BURIAL_LINK_STATUS.ACTIVE,
      },
      totalRecords: 1,
      data: [
        {
          burialLinkId,
          burialDate: "2026-01-12",
          linkStatus: BURIAL_LINK_STATUS.ACTIVE,
          deceasedId,
          internalCode: "JZG-001",
          deceasedName: "Joao da Silva",
          deceasedDocumentMasked: "*******8900",
          burialSpaceId,
          burialSpaceType: BURIAL_SPACE_TYPE.JAZIGO,
          burialSpaceIdentifier: "J-22",
          burialSpaceStatus: BURIAL_SPACE_STATUS.OCCUPIED,
          locationDescription:
            "Setor: A, Quadra/Fila: 2, Rua: Principal, Complemento: Proximo ao portao",
        },
      ],
    })
    expectNoFullDocument(report)
    expectNoFullDocument(infoSpy.mock.calls)
  })

  it("generates the space occupation report with filters, states and capacity totals", async () => {
    prismaMock.burialSpace.findMany.mockResolvedValue([
      burialSpaceRecord(),
    ])
    prismaMock.burialSpace.count.mockResolvedValue(1)

    const report = await generateSpaceOccupationReport({
      status: BURIAL_SPACE_STATUS.OCCUPIED,
      type: BURIAL_SPACE_TYPE.JAZIGO,
      sector: " A ",
      linkStatus: BURIAL_LINK_STATUS.ACTIVE,
    })

    expect(prismaMock.burialSpace.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: BURIAL_SPACE_STATUS.OCCUPIED,
          type: BURIAL_SPACE_TYPE.JAZIGO,
          sector: "a",
          burialLinks: {
            some: {
              status: BURIAL_LINK_STATUS.ACTIVE,
            },
          },
        },
      }),
    )
    expect(report).toMatchObject({
      title: "Ocupa\u00e7\u00e3o dos espa\u00e7os",
      filters: {
        status: BURIAL_SPACE_STATUS.OCCUPIED,
        type: BURIAL_SPACE_TYPE.JAZIGO,
        sector: "a",
        linkStatus: BURIAL_LINK_STATUS.ACTIVE,
      },
      totalRecords: 1,
      data: [
        {
          burialSpaceId,
          burialSpaceType: BURIAL_SPACE_TYPE.JAZIGO,
          identifier: "J-22",
          status: BURIAL_SPACE_STATUS.OCCUPIED,
          capacity: 3,
          activeLinkCount: 2,
          availableCapacity: 1,
          locationDescription:
            "Setor: A, Quadra/Fila: 2, Rua: Principal, Complemento: Proximo ao portao",
        },
      ],
    })
  })

  it("generates the space status report and preserves zero available capacity floors", async () => {
    prismaMock.burialSpace.findMany.mockResolvedValue([
      burialSpaceRecord({
        activeLinkCount: 4,
        capacity: 3,
        status: BURIAL_SPACE_STATUS.OCCUPIED,
      }),
    ])
    prismaMock.burialSpace.count.mockResolvedValue(1)

    const report = await generateSpaceStatusReport({
      status: BURIAL_SPACE_STATUS.OCCUPIED,
    })

    expect(prismaMock.burialSpace.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: BURIAL_SPACE_STATUS.OCCUPIED,
          type: undefined,
          sector: undefined,
          burialLinks: undefined,
        },
      }),
    )
    expect(report).toMatchObject({
      title: "Espa\u00e7os por status",
      filters: {
        status: BURIAL_SPACE_STATUS.OCCUPIED,
      },
      totalRecords: 1,
      data: [
        {
          burialSpaceId,
          burialSpaceType: BURIAL_SPACE_TYPE.JAZIGO,
          identifier: "J-22",
          status: BURIAL_SPACE_STATUS.OCCUPIED,
          capacity: 3,
          activeLinkCount: 4,
          locationDescription:
            "Setor: A, Quadra/Fila: 2, Rua: Principal, Complemento: Proximo ao portao",
        },
      ],
    })
    expect(report.data[0]).not.toHaveProperty("availableCapacity")
  })

  it.each([
    [
      "deceased",
      () => generateDeceasedReport(),
      () => {
        prismaMock.deceased.findMany.mockResolvedValue([])
        prismaMock.deceased.count.mockResolvedValue(0)
      },
      "Nenhum falecido encontrado para os filtros selecionados.",
    ],
    [
      "burials-by-period",
      () => generateBurialsByPeriodReport(),
      () => {
        prismaMock.burialLink.findMany.mockResolvedValue([])
        prismaMock.burialLink.count.mockResolvedValue(0)
      },
      "Nenhum sepultamento encontrado para os filtros selecionados.",
    ],
    [
      "space-occupation",
      () => generateSpaceOccupationReport(),
      () => {
        prismaMock.burialSpace.findMany.mockResolvedValue([])
        prismaMock.burialSpace.count.mockResolvedValue(0)
      },
      "Nenhum espa\u00e7o encontrado para os filtros selecionados.",
    ],
    [
      "space-status",
      () => generateSpaceStatusReport(),
      () => {
        prismaMock.burialSpace.findMany.mockResolvedValue([])
        prismaMock.burialSpace.count.mockResolvedValue(0)
      },
      "Nenhum espa\u00e7o encontrado para os filtros selecionados.",
    ],
  ] as const)(
    "returns an empty state for the %s report",
    async (_name, generate, prepare, emptyMessage) => {
      prepare()

      await expect(generate()).resolves.toMatchObject({
        data: [],
        totalRecords: 0,
        totalPages: 0,
        emptyMessage,
      })
      expectNoFullDocument(warnSpy.mock.calls)
      expect(errorSpy).not.toHaveBeenCalled()
    },
  )

  it("rejects invalid filters before querying the database", async () => {
    await expect(
      generateDeceasedReport({
        startDate: "2026-02-01",
        endDate: "2026-01-01",
      }),
    ).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    })

    expect(prismaMock.$transaction).not.toHaveBeenCalled()
    expect(prismaMock.deceased.findMany).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalled()
  })

  it("rejects EMPLOYEE users before producing reports", async () => {
    requirePermissionMock.mockRejectedValue({
      code: DOMAIN_ERROR_CODE.FORBIDDEN,
      status: HTTP_STATUS.FORBIDDEN,
      message: "Access denied",
    })

    await expect(generateSpaceStatusReport()).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.FORBIDDEN,
      status: HTTP_STATUS.FORBIDDEN,
    })

    expect(requirePermissionMock).toHaveBeenCalledWith(
      PERMISSION.VIEW_REPORTS,
    )
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
    expect(prismaMock.burialSpace.findMany).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalled()
  })
})
