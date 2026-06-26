import { Prisma } from "@prisma/client"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { DOMAIN_ERROR_CODE, HTTP_STATUS } from "@/types/api"
import { PERMISSION } from "@/types/auth"
import { BURIAL_LINK_STATUS } from "@/types/burial-link"
import type {
  DeceasedDetailDto,
  DeceasedDuplicateCandidateDto,
  DeceasedListItemDto,
} from "@/types/deceased"

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  deceased: {
    count: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}))

const generateUniqueInternalCodeMock = vi.hoisted(() => vi.fn())
const listBurialLinksByDeceasedMock = vi.hoisted(() => vi.fn())
const requirePermissionMock = vi.hoisted(() => vi.fn())

vi.mock("server-only", () => ({}))

vi.mock("@prisma/client", () => {
  class PrismaClientKnownRequestError extends Error {
    readonly code: string

    constructor(
      message: string,
      options: { code: string; clientVersion?: string },
    ) {
      super(message)
      this.name = "PrismaClientKnownRequestError"
      this.code = options.code
    }
  }

  return {
    Prisma: {
      PrismaClientKnownRequestError,
    },
    PrismaClient: vi.fn(() => prismaMock),
  }
})

vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: requirePermissionMock,
}))

vi.mock("@/lib/deceased/internal-code", () => ({
  generateUniqueInternalCode: generateUniqueInternalCodeMock,
}))

vi.mock("@/services/burial-link-service", () => ({
  listBurialLinksByDeceased: listBurialLinksByDeceasedMock,
}))

const {
  checkDeceasedDuplicates,
  createDeceased,
  getDeceasedById,
  listDeceased,
  searchDeceasedByDocument,
  updateDeceased,
} = await import("@/services/deceased-service")

type DeceasedRecord = {
  id: string
  internalCode: string
  fullName: string
  document: string | null
  birthDate: Date | null
  deathDate: Date | null
  burialDate: Date | null
  datesUnknown: boolean
  historicalDataIncomplete: boolean
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

const deceasedId = "00000000-0000-4000-8000-000000000133"
const otherDeceasedId = "00000000-0000-4000-8000-000000000134"
const burialLinkId = "00000000-0000-4000-8000-000000000135"
const burialSpaceId = "00000000-0000-4000-8000-000000000136"
const generatedInternalCode = "JZG-20260626-ABCDEF123456"

function deceasedRecord(
  overrides: Partial<DeceasedRecord> = {},
): DeceasedRecord {
  return {
    id: deceasedId,
    internalCode: generatedInternalCode,
    fullName: "Jose da Silva",
    document: "12345678900",
    birthDate: new Date("1940-01-05T00:00:00.000Z"),
    deathDate: new Date("2026-01-10T00:00:00.000Z"),
    burialDate: new Date("2026-01-12T00:00:00.000Z"),
    datesUnknown: false,
    historicalDataIncomplete: false,
    notes: "Registro administrativo",
    createdAt: new Date("2026-01-13T10:00:00.000Z"),
    updatedAt: new Date("2026-01-14T11:00:00.000Z"),
    ...overrides,
  }
}

function activeBurialLinkRecord() {
  return {
    id: burialLinkId,
    deceasedId,
    burialSpaceId,
    responsibleId: null,
    burialDate: new Date("2026-01-12T00:00:00.000Z"),
    status: BURIAL_LINK_STATUS.ACTIVE,
    endedAt: null,
    endReason: null,
    createdAt: new Date("2026-01-12T12:00:00.000Z"),
  }
}

function prismaError(code: "P2025"): Error {
  return new Prisma.PrismaClientKnownRequestError("Prisma error", {
    code,
    clientVersion: "test",
  })
}

describe("DeceasedService", () => {
  beforeEach(() => {
    prismaMock.$transaction.mockReset()
    prismaMock.deceased.count.mockReset()
    prismaMock.deceased.create.mockReset()
    prismaMock.deceased.findMany.mockReset()
    prismaMock.deceased.findUnique.mockReset()
    prismaMock.deceased.update.mockReset()
    generateUniqueInternalCodeMock.mockReset()
    listBurialLinksByDeceasedMock.mockReset()
    requirePermissionMock.mockReset()
    generateUniqueInternalCodeMock.mockResolvedValue(generatedInternalCode)
  })

  it("creates a complete deceased record with generated internal code and masked document", async () => {
    prismaMock.deceased.create.mockResolvedValue(deceasedRecord())

    const result = await createDeceased({
      fullName: " Jose da Silva ",
      document: " 123.456.789-00 ",
      birthDate: "1940-01-05",
      deathDate: "2026-01-10",
      burialDate: "2026-01-12",
      notes: " Registro administrativo ",
    })

    expect(requirePermissionMock).toHaveBeenCalledWith(
      PERMISSION.MANAGE_OPERATIONAL_RECORDS,
    )
    expect(generateUniqueInternalCodeMock).toHaveBeenCalledOnce()
    expect(prismaMock.deceased.create).toHaveBeenCalledWith({
      data: {
        fullName: "Jose da Silva",
        document: "12345678900",
        birthDate: "1940-01-05",
        deathDate: "2026-01-10",
        burialDate: "2026-01-12",
        notes: "Registro administrativo",
        internalCode: generatedInternalCode,
        searchName: "jose da silva",
        datesUnknown: false,
        historicalDataIncomplete: false,
      },
      select: expect.objectContaining({
        document: true,
        internalCode: true,
      }),
    })
    expect(result).toEqual<DeceasedDetailDto>({
      id: deceasedId,
      internalCode: generatedInternalCode,
      fullName: "Jose da Silva",
      documentMasked: "*******8900",
      birthDate: "1940-01-05",
      deathDate: "2026-01-10",
      burialDate: "2026-01-12",
      historicalDataIncomplete: false,
      datesUnknown: false,
      notes: "Registro administrativo",
      createdAt: "2026-01-13T10:00:00.000Z",
      updatedAt: "2026-01-14T11:00:00.000Z",
    })
    expect(result).not.toHaveProperty("document")
  })

  it("creates historical incomplete records when dates are unknown", async () => {
    prismaMock.deceased.create.mockResolvedValue(
      deceasedRecord({
        document: null,
        birthDate: null,
        deathDate: null,
        burialDate: null,
        datesUnknown: true,
        historicalDataIncomplete: true,
        notes: null,
      }),
    )

    const result = await createDeceased({
      fullName: "Registro Historico",
      datesUnknown: true,
    })

    expect(prismaMock.deceased.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fullName: "Registro Historico",
          datesUnknown: true,
          historicalDataIncomplete: true,
          internalCode: generatedInternalCode,
          searchName: "registro historico",
        }),
      }),
    )
    expect(result).toMatchObject({
      internalCode: generatedInternalCode,
      datesUnknown: true,
      historicalDataIncomplete: true,
    })
    expect(result).not.toHaveProperty("document")
    expect(result).not.toHaveProperty("documentMasked")
  })

  it("rejects invalid date combinations before generating a code or writing", async () => {
    await expect(
      createDeceased({
        fullName: "Sem Datas",
      } as Parameters<typeof createDeceased>[0]),
    ).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    })

    await expect(
      createDeceased({
        fullName: "Datas Invertidas",
        deathDate: "2026-01-10",
        burialDate: "2026-01-09",
      }),
    ).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    })

    await expect(
      createDeceased({
        fullName: "Datas Conflitantes",
        deathDate: "2026-01-10",
        datesUnknown: true,
      } as Parameters<typeof createDeceased>[0]),
    ).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    })

    expect(generateUniqueInternalCodeMock).not.toHaveBeenCalled()
    expect(prismaMock.deceased.create).not.toHaveBeenCalled()
  })

  it("lists deceased records by filters with masked documents and no full document", async () => {
    prismaMock.$transaction.mockResolvedValue([
      [deceasedRecord()],
      1,
    ])

    const result = await listDeceased({
      name: " José ",
      internalCode: generatedInternalCode,
      deathDate: "2026-01-10",
      burialDate: "2026-01-12",
      burialSpaceId,
      page: 2,
      pageSize: 10,
    })

    expect(requirePermissionMock).toHaveBeenCalledWith(PERMISSION.SEARCH_RECORDS)
    expect(prismaMock.$transaction).toHaveBeenCalledWith([
      prismaMock.deceased.findMany({
        where: {
          searchName: { contains: "jose" },
          internalCode: generatedInternalCode,
          deathDate: new Date("2026-01-10T00:00:00.000Z"),
          burialDate: new Date("2026-01-12T00:00:00.000Z"),
          burialLinks: { some: { burialSpaceId } },
        },
        select: expect.objectContaining({
          document: true,
          internalCode: true,
        }),
        orderBy: [{ searchName: "asc" }, { internalCode: "asc" }],
        skip: 10,
        take: 10,
      }),
      prismaMock.deceased.count({
        where: {
          searchName: { contains: "jose" },
          internalCode: generatedInternalCode,
          deathDate: new Date("2026-01-10T00:00:00.000Z"),
          burialDate: new Date("2026-01-12T00:00:00.000Z"),
          burialLinks: { some: { burialSpaceId } },
        },
      }),
    ])
    expect(result).toEqual({
      items: [
        {
          id: deceasedId,
          internalCode: generatedInternalCode,
          fullName: "Jose da Silva",
          documentMasked: "*******8900",
          deathDate: "2026-01-10",
          burialDate: "2026-01-12",
          historicalDataIncomplete: false,
        },
      ],
      pagination: {
        page: 2,
        pageSize: 10,
        totalRecords: 1,
        totalPages: 1,
      },
    })
    expect(result.items[0]).not.toHaveProperty("document")
  })

  it("searches by exact normalized document without exposing it in results", async () => {
    prismaMock.$transaction.mockResolvedValue([
      [deceasedRecord()],
      1,
    ])

    const result = await searchDeceasedByDocument({
      document: " 123.456.789-00 ",
      page: 1,
      pageSize: 25,
    })

    expect(prismaMock.deceased.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { document: "12345678900" },
      }),
    )
    expect(result.items).toEqual<DeceasedListItemDto[]>([
      {
        id: deceasedId,
        internalCode: generatedInternalCode,
        fullName: "Jose da Silva",
        documentMasked: "*******8900",
        deathDate: "2026-01-10",
        burialDate: "2026-01-12",
        historicalDataIncomplete: false,
      },
    ])
    expect(result.items[0]).not.toHaveProperty("document")
  })

  it("returns duplicate candidates for homonyms without blocking records", async () => {
    prismaMock.deceased.findMany.mockResolvedValue([
      deceasedRecord(),
      deceasedRecord({
        id: otherDeceasedId,
        internalCode: "JZG-20260626-ZYXWVU654321",
        document: null,
        birthDate: null,
        historicalDataIncomplete: true,
      }),
    ])

    const result = await checkDeceasedDuplicates(
      {
        fullName: " José da Silva ",
        document: "123.456.789-00",
        deathDate: "2026-01-10",
      },
      { excludeDeceasedId: otherDeceasedId },
    )

    expect(prismaMock.deceased.findMany).toHaveBeenCalledWith({
      where: {
        searchName: "jose da silva",
        id: { not: otherDeceasedId },
        OR: [
          { document: "12345678900" },
          { deathDate: new Date("2026-01-10T00:00:00.000Z") },
        ],
      },
      select: expect.objectContaining({
        document: true,
        internalCode: true,
      }),
      orderBy: [
        { historicalDataIncomplete: "asc" },
        { createdAt: "asc" },
      ],
      take: 25,
    })
    expect(result).toEqual<DeceasedDuplicateCandidateDto[]>([
      {
        id: deceasedId,
        internalCode: generatedInternalCode,
        fullName: "Jose da Silva",
        documentMasked: "*******8900",
        birthDate: "1940-01-05",
        deathDate: "2026-01-10",
        burialDate: "2026-01-12",
        historicalDataIncomplete: false,
      },
      {
        id: otherDeceasedId,
        internalCode: "JZG-20260626-ZYXWVU654321",
        fullName: "Jose da Silva",
        deathDate: "2026-01-10",
        burialDate: "2026-01-12",
        historicalDataIncomplete: true,
      },
    ])
    expect(result[0]).not.toHaveProperty("document")
  })

  it("gets deceased detail with masked document and historical burial links", async () => {
    prismaMock.deceased.findUnique.mockResolvedValue(deceasedRecord())
    listBurialLinksByDeceasedMock.mockResolvedValue([activeBurialLinkRecord()])

    const result = await getDeceasedById(deceasedId)

    expect(prismaMock.deceased.findUnique).toHaveBeenCalledWith({
      where: { id: deceasedId },
      select: expect.objectContaining({
        document: true,
        notes: true,
      }),
    })
    expect(listBurialLinksByDeceasedMock).toHaveBeenCalledWith(deceasedId)
    expect(result).toMatchObject({
      id: deceasedId,
      internalCode: generatedInternalCode,
      documentMasked: "*******8900",
      links: [
        {
          id: burialLinkId,
          deceasedId,
          burialSpaceId,
          burialDate: "2026-01-12",
          status: BURIAL_LINK_STATUS.ACTIVE,
          createdAt: "2026-01-12T12:00:00.000Z",
        },
      ],
    })
    expect(result).not.toHaveProperty("document")
  })

  it("updates dates and maps missing records to not found", async () => {
    prismaMock.deceased.update.mockResolvedValue(
      deceasedRecord({
        deathDate: null,
        burialDate: null,
        datesUnknown: true,
        historicalDataIncomplete: true,
      }),
    )

    await expect(
      updateDeceased(deceasedId, {
        fullName: " Jose da Silva ",
        document: "12345678900",
        datesUnknown: true,
      }),
    ).resolves.toMatchObject({
      id: deceasedId,
      datesUnknown: true,
      historicalDataIncomplete: true,
    })

    expect(prismaMock.deceased.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: deceasedId },
        data: expect.objectContaining({
          fullName: "Jose da Silva",
          searchName: "jose da silva",
          document: "12345678900",
          datesUnknown: true,
          historicalDataIncomplete: true,
        }),
      }),
    )

    prismaMock.deceased.update.mockRejectedValueOnce(prismaError("P2025"))

    await expect(
      updateDeceased(deceasedId, {
        fullName: "Registro Ausente",
        deathDate: "2026-01-10",
      }),
    ).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.NOT_FOUND,
      status: HTTP_STATUS.NOT_FOUND,
    })
  })
})
