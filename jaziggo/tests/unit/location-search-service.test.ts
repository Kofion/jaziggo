import { beforeEach, describe, expect, it, vi } from "vitest"

import { PERMISSION } from "@/types/auth"
import {
  BURIAL_SPACE_STATUS,
  BURIAL_SPACE_TYPE,
} from "@/types/burial-space"

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  burialLink: {
    count: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
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
  searchLocations,
  searchLocationsByDocument,
  getLocationDetail,
} = await import("@/services/location-search-service")

const deceasedId = "00000000-0000-4000-8000-000000000136"
const secondDeceasedId = "00000000-0000-4000-8000-000000000137"
const burialSpaceId = "00000000-0000-4000-8000-000000000138"
const secondBurialSpaceId = "00000000-0000-4000-8000-000000000139"
const fullDeceasedDocument = "12345678900"
const fullResponsibleDocument = "99888777666"

function valueOrDefault<T extends object, K extends keyof T>(
  source: T,
  key: K,
  fallback: Exclude<T[K], undefined>,
): Exclude<T[K], undefined> {
  return Object.hasOwn(source, key)
    ? (source[key] as Exclude<T[K], undefined>)
    : fallback
}

function locationRecord(overrides: {
  burialDate?: Date | null
  burialSpaceId?: string
  complement?: string | null
  deceasedDocument?: string | null
  deceasedId?: string
  deathDate?: Date | null
  fullName?: string
  historicalDataIncomplete?: boolean
  internalCode?: string
  responsibleDocument?: string | null
  responsibleName?: string | null
  row?: string | null
  sector?: string | null
  street?: string | null
} = {}) {
  return {
    id: `link-${overrides.internalCode ?? "JZG-001"}`,
    burialDate: valueOrDefault(
      overrides,
      "burialDate",
      new Date("2026-01-12T00:00:00.000Z"),
    ),
    deceased: {
      id: overrides.deceasedId ?? deceasedId,
      internalCode: overrides.internalCode ?? "JZG-001",
      fullName: overrides.fullName ?? "Joao da Silva",
      document: valueOrDefault(
        overrides,
        "deceasedDocument",
        fullDeceasedDocument,
      ),
      deathDate: valueOrDefault(
        overrides,
        "deathDate",
        new Date("2026-01-10T00:00:00.000Z"),
      ),
      burialDate: null,
      historicalDataIncomplete:
        overrides.historicalDataIncomplete ?? false,
    },
    burialSpace: {
      id: overrides.burialSpaceId ?? burialSpaceId,
      type: BURIAL_SPACE_TYPE.JAZIGO,
      sector: valueOrDefault(overrides, "sector", "A"),
      block: null,
      street: valueOrDefault(overrides, "street", "Principal"),
      row: valueOrDefault(overrides, "row", "2"),
      number: null,
      complement: valueOrDefault(
        overrides,
        "complement",
        "Proximo ao portao",
      ),
      status: BURIAL_SPACE_STATUS.OCCUPIED,
    },
    responsible:
      overrides.responsibleName === null
        ? null
        : {
            fullName: overrides.responsibleName ?? "Maria da Silva",
            document:
              overrides.responsibleDocument ?? fullResponsibleDocument,
          },
  }
}

function mockLocationPage(records: ReturnType<typeof locationRecord>[]): void {
  prismaMock.burialLink.findMany.mockResolvedValue(records)
  prismaMock.burialLink.count.mockResolvedValue(records.length)
  prismaMock.$transaction.mockImplementation(async (operations: unknown[]) =>
    Promise.all(operations),
  )
}

function expectNoSensitiveDocument(value: unknown): void {
  const serialized = JSON.stringify(value)

  expect(serialized).not.toContain(fullDeceasedDocument)
  expect(serialized).not.toContain("123.456.789-00")
  expect(serialized).not.toContain(fullResponsibleDocument)
  expect(serialized).not.toContain("998.887.776-66")
}

describe("LocationSearchService", () => {
  let infoSpy: ReturnType<typeof vi.spyOn>
  let warnSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    prismaMock.$transaction.mockReset()
    prismaMock.burialLink.count.mockReset()
    prismaMock.burialLink.findMany.mockReset()
    prismaMock.burialLink.findFirst.mockReset()
    requirePermissionMock.mockReset()
    requirePermissionMock.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000140",
    })
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {})
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("performs exact deceased document search and returns only masked output", async () => {
    mockLocationPage([locationRecord()])

    const result = await searchLocationsByDocument({
      deceasedDocument: "123.456.789-00",
    })

    expect(requirePermissionMock).toHaveBeenCalledWith(
      PERMISSION.VIEW_LOCATIONS,
    )
    expect(prismaMock.burialLink.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "ACTIVE",
          deceased: {
            is: {
              document: fullDeceasedDocument,
            },
          },
        },
      }),
    )
    expect(result.items).toEqual([
      expect.objectContaining({
        deceasedId,
        internalCode: "JZG-001",
        deceasedName: "Joao da Silva",
        deceasedDocumentMasked: "*******8900",
        responsibleName: "Maria da Silva",
        responsibleDocumentMasked: "*******7666",
        locationDescription:
          "Setor: A, Quadra/Fila: 2, Rua: Principal, Complemento: Proximo ao portao",
      }),
    ])
    expectNoSensitiveDocument(result)
    expectNoSensitiveDocument(infoSpy.mock.calls)
    expect(warnSpy).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it("performs exact responsible document search without exposing full documents in responses or logs", async () => {
    mockLocationPage([locationRecord()])

    const result = await searchLocationsByDocument({
      responsibleDocument: "998.887.776-66",
    })

    expect(prismaMock.burialLink.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "ACTIVE",
          responsible: {
            is: {
              document: fullResponsibleDocument,
            },
          },
        },
      }),
    )
    expect(result.items[0]).toMatchObject({
      deceasedDocumentMasked: "*******8900",
      responsibleDocumentMasked: "*******7666",
    })
    expectNoSensitiveDocument(result)
    expectNoSensitiveDocument(infoSpy.mock.calls)
    expect(warnSpy).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it("returns homonyms with differentiating data and formatted locations", async () => {
    mockLocationPage([
      locationRecord({
        internalCode: "JZG-010",
        fullName: "Jose Almeida",
        deceasedDocument: "11122233344",
        responsibleDocument: "55566677788",
        deathDate: new Date("2024-05-01T00:00:00.000Z"),
        burialDate: new Date("2024-05-03T00:00:00.000Z"),
      }),
      locationRecord({
        deceasedId: secondDeceasedId,
        burialSpaceId: secondBurialSpaceId,
        internalCode: "JZG-011",
        fullName: "Jose Almeida",
        deceasedDocument: null,
        responsibleName: null,
        historicalDataIncomplete: true,
        deathDate: null,
        burialDate: null,
        sector: "B",
        row: null,
        street: null,
        complement: "Memorial antigo",
      }),
    ])

    const result = await searchLocations({ deceasedName: " José Almeida " })

    expect(prismaMock.burialLink.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deceased: {
            is: {
              searchName: { contains: "jose almeida" },
            },
          },
        }),
      }),
    )
    expect(result.items).toEqual([
      expect.objectContaining({
        deceasedName: "Jose Almeida",
        internalCode: "JZG-010",
        deceasedDocumentMasked: "*******3344",
        deathDate: "2024-05-01",
        burialDate: "2024-05-03",
        historicalDataIncomplete: false,
        responsibleName: "Maria da Silva",
        responsibleDocumentMasked: "*******7788",
        locationDescription:
          "Setor: A, Quadra/Fila: 2, Rua: Principal, Complemento: Proximo ao portao",
      }),
      expect.objectContaining({
        deceasedId: secondDeceasedId,
        deceasedName: "Jose Almeida",
        internalCode: "JZG-011",
        historicalDataIncomplete: true,
        burialSpaceId: secondBurialSpaceId,
        locationDescription: "Setor: B, Complemento: Memorial antigo",
      }),
    ])
    expect(result.items[1]).not.toHaveProperty("deceasedDocumentMasked")
    expect(result.items[1]).not.toHaveProperty("responsibleName")
    expect(result.items[1].locationDescription).not.toContain(",,")
    expect(result.items[1].locationDescription).not.toContain(": ,")
  })

  it("logs empty and detail searches without full documents", async () => {
    mockLocationPage([])

    await expect(
      searchLocationsByDocument({
        deceasedDocument: "123.456.789-00",
      }),
    ).resolves.toMatchObject({
      items: [],
      pagination: {
        totalRecords: 0,
      },
    })

    prismaMock.burialLink.findFirst.mockResolvedValue(locationRecord())

    await expect(getLocationDetail(deceasedId)).resolves.toMatchObject({
      deceasedDocumentMasked: "*******8900",
      responsibleDocumentMasked: "*******7666",
    })

    expectNoSensitiveDocument(warnSpy.mock.calls)
    expectNoSensitiveDocument(infoSpy.mock.calls)
    expectNoSensitiveDocument(errorSpy.mock.calls)
  })
})
