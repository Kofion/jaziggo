import { Prisma } from "@prisma/client"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { DOMAIN_ERROR_CODE, HTTP_STATUS } from "@/types/api"
import { PERMISSION } from "@/types/auth"
import {
  LINK_STATUS,
  RESPONSIBLE_LINK_TYPE,
  type ResponsibleDetailDto,
  type ResponsibleListItemDto,
} from "@/types/responsible"

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  responsible: {
    count: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}))

const transactionMock = vi.hoisted(() => ({
  burialSpace: {
    findUnique: vi.fn(),
  },
  deceased: {
    findUnique: vi.fn(),
  },
  responsible: {
    findUnique: vi.fn(),
  },
  responsibleLink: {
    create: vi.fn(),
    delete: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}))

const requirePermissionMock = vi.hoisted(() => vi.fn())
const withSerializableTransactionMock = vi.hoisted(() =>
  vi.fn(async (callback: (transaction: typeof transactionMock) => unknown) =>
    callback(transactionMock),
  ),
)

vi.mock("server-only", () => ({}))

vi.mock("@prisma/client", () => {
  class PrismaClientKnownRequestError extends Error {
    readonly code: string

    constructor(message: string, options: { code: string }) {
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

vi.mock("@/lib/db/transaction", () => ({
  withSerializableTransaction: withSerializableTransactionMock,
}))

const {
  createResponsible,
  createResponsibleLink,
  endResponsibleLink,
  getResponsibleById,
  listResponsibles,
} = await import("@/services/responsible-service")

type ResponsibleRecord = {
  id: string
  fullName: string
  documentType: "CPF" | "RG" | null
  document: string | null
  phone: string | null
  email: string | null
  address: string | null
  links: ResponsibleLinkRecord[]
}

type ResponsibleLinkRecord = {
  id: string
  responsibleId: string
  linkType: typeof RESPONSIBLE_LINK_TYPE.DECEASED
  deceasedId: string
  burialSpaceId: null
  status: typeof LINK_STATUS.ACTIVE | typeof LINK_STATUS.ENDED
  endedAt: Date | null
  endReason: string | null
  createdAt: Date
}

const responsibleId = "00000000-0000-4000-8000-000000000132"
const responsibleLinkId = "00000000-0000-4000-8000-000000000133"
const deceasedId = "00000000-0000-4000-8000-000000000134"

function responsibleRecord(
  overrides: Partial<ResponsibleRecord> = {},
): ResponsibleRecord {
  return {
    id: responsibleId,
    fullName: "Maria Responsavel",
    documentType: "CPF",
    document: "12345678900",
    phone: "11987654321",
    email: "maria@example.com",
    address: "Rua Central, 100",
    links: [],
    ...overrides,
  }
}

function activeResponsibleLink(
  overrides: Partial<ResponsibleLinkRecord> = {},
): ResponsibleLinkRecord {
  return {
    id: responsibleLinkId,
    responsibleId,
    linkType: RESPONSIBLE_LINK_TYPE.DECEASED,
    deceasedId,
    burialSpaceId: null,
    status: LINK_STATUS.ACTIVE,
    endedAt: null,
    endReason: null,
    createdAt: new Date("2026-01-10T12:00:00.000Z"),
    ...overrides,
  }
}

function endedResponsibleLink(
  overrides: Partial<ResponsibleLinkRecord> = {},
): ResponsibleLinkRecord {
  return activeResponsibleLink({
    status: LINK_STATUS.ENDED,
    endedAt: new Date("2026-02-10T12:00:00.000Z"),
    endReason: "Responsavel atualizado",
    ...overrides,
  })
}

function prismaError(code: "P2025"): Error {
  return new Prisma.PrismaClientKnownRequestError("Prisma error", {
    code,
    clientVersion: "test",
  })
}

describe("ResponsibleService", () => {
  beforeEach(() => {
    prismaMock.$transaction.mockReset()
    prismaMock.responsible.count.mockReset()
    prismaMock.responsible.create.mockReset()
    prismaMock.responsible.findMany.mockReset()
    prismaMock.responsible.findFirst.mockReset()
    prismaMock.responsible.findFirst.mockResolvedValue(null)
    prismaMock.responsible.findUnique.mockReset()
    prismaMock.responsible.update.mockReset()
    transactionMock.burialSpace.findUnique.mockReset()
    transactionMock.deceased.findUnique.mockReset()
    transactionMock.responsible.findUnique.mockReset()
    transactionMock.responsibleLink.create.mockReset()
    transactionMock.responsibleLink.delete.mockReset()
    transactionMock.responsibleLink.findFirst.mockReset()
    transactionMock.responsibleLink.findUnique.mockReset()
    transactionMock.responsibleLink.update.mockReset()
    requirePermissionMock.mockReset()
    withSerializableTransactionMock.mockClear()
  })

  it("creates a responsible with required document data and returns a list DTO", async () => {
    prismaMock.responsible.create.mockResolvedValue(
      responsibleRecord({
        documentType: "RG",
        document: "12345678900",
        phone: null,
        email: null,
        address: null,
      }),
    )

    const result = await createResponsible({
      fullName: " Maria Responsavel ",
      documentType: "RG",
      document: " 12345678900 ",
    })

    expect(requirePermissionMock).toHaveBeenCalledWith(
      PERMISSION.MANAGE_OPERATIONAL_RECORDS,
    )
    expect(prismaMock.responsible.create).toHaveBeenCalledWith({
      data: {
        fullName: "Maria Responsavel",
        documentType: "RG",
        document: "12345678900",
        searchName: "maria responsavel",
      },
      select: {
        id: true,
        fullName: true,
        document: true,
        documentType: true,
      },
    })
    expect(result).toEqual<ResponsibleListItemDto>({
      id: responsibleId,
      fullName: "Maria Responsavel",
      documentType: "RG",
      documentMasked: "*******8900",
    })
    expect(result).not.toHaveProperty("phone")
    expect(result).not.toHaveProperty("email")
    expect(result).not.toHaveProperty("address")
    expect(result).not.toHaveProperty("document")
  })

  it("rejects name-only responsible creation before writing", async () => {
    await expect(
      createResponsible({
        fullName: "Nome Sem Contato",
      } as Parameters<typeof createResponsible>[0]),
    ).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    })

    expect(prismaMock.responsible.create).not.toHaveBeenCalled()
  })

  it("lists responsibles by name without exposing contact data", async () => {
    prismaMock.$transaction.mockResolvedValue([
      [
        responsibleRecord(),
        responsibleRecord({
          id: "00000000-0000-4000-8000-000000000135",
          fullName: "Maria Outra",
          documentType: null,
          document: null,
        }),
      ],
      2,
    ])

    const result = await listResponsibles({
      name: " Mária ",
      page: 2,
      pageSize: 10,
    })

    expect(result).toEqual({
      items: [
        {
          id: responsibleId,
          fullName: "Maria Responsavel",
          documentType: "CPF",
          documentMasked: "*******8900",
        },
        {
          id: "00000000-0000-4000-8000-000000000135",
          fullName: "Maria Outra",
        },
      ],
      pagination: {
        page: 2,
        pageSize: 10,
        totalRecords: 2,
        totalPages: 1,
      },
    })
    expect(result.items[0]).not.toHaveProperty("document")
    expect(result.items[0]).not.toHaveProperty("phone")
    expect(result.items[0]).not.toHaveProperty("email")
    expect(result.items[0]).not.toHaveProperty("address")
    expect(prismaMock.$transaction).toHaveBeenCalledWith([
      prismaMock.responsible.findMany({
        where: {
          searchName: { contains: "maria" },
        },
        select: {
          id: true,
          fullName: true,
          document: true,
        documentType: true,
        },
        orderBy: [{ searchName: "asc" }, { id: "asc" }],
        skip: 10,
        take: 10,
      }),
      prismaMock.responsible.count({
        where: {
          searchName: { contains: "maria" },
        },
      }),
    ])
  })

  it("gets responsible detail with restricted contacts and historical links", async () => {
    prismaMock.responsible.findUnique.mockResolvedValue(
      responsibleRecord({
        links: [
          activeResponsibleLink(),
          endedResponsibleLink({
            id: "00000000-0000-4000-8000-000000000136",
          }),
        ],
      }),
    )

    const result = await getResponsibleById(responsibleId)

    expect(result).toEqual<ResponsibleDetailDto>({
      id: responsibleId,
      fullName: "Maria Responsavel",
      documentType: "CPF",
          documentMasked: "*******8900",
      phone: "11987654321",
      email: "maria@example.com",
      address: "Rua Central, 100",
      links: [
        {
          id: responsibleLinkId,
          responsibleId,
          linkType: RESPONSIBLE_LINK_TYPE.DECEASED,
          deceasedId,
          status: LINK_STATUS.ACTIVE,
          createdAt: "2026-01-10T12:00:00.000Z",
        },
        {
          id: "00000000-0000-4000-8000-000000000136",
          responsibleId,
          linkType: RESPONSIBLE_LINK_TYPE.DECEASED,
          deceasedId,
          status: LINK_STATUS.ENDED,
          endedAt: "2026-02-10T12:00:00.000Z",
          endReason: "Responsavel atualizado",
          createdAt: "2026-01-10T12:00:00.000Z",
        },
      ],
    })
    expect(result).not.toHaveProperty("document")
  })

  it("creates an active responsible link after checking target and duplicates", async () => {
    transactionMock.responsible.findUnique.mockResolvedValue({ id: responsibleId })
    transactionMock.deceased.findUnique.mockResolvedValue({ id: deceasedId })
    transactionMock.responsibleLink.findFirst.mockResolvedValue(null)
    transactionMock.responsibleLink.create.mockResolvedValue(activeResponsibleLink())

    await expect(
      createResponsibleLink({
        responsibleId,
        linkType: RESPONSIBLE_LINK_TYPE.DECEASED,
        deceasedId,
      }),
    ).resolves.toEqual({
      id: responsibleLinkId,
      responsibleId,
      linkType: RESPONSIBLE_LINK_TYPE.DECEASED,
      deceasedId,
      status: LINK_STATUS.ACTIVE,
      createdAt: "2026-01-10T12:00:00.000Z",
    })

    expect(transactionMock.responsibleLink.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          responsibleId,
          linkType: RESPONSIBLE_LINK_TYPE.DECEASED,
          deceasedId,
          burialSpaceId: null,
        },
      }),
    )
  })

  it("ends responsible links historically and never deletes them", async () => {
    const endedAt = "2026-03-01T10:00:00.000Z"

    transactionMock.responsibleLink.findUnique.mockResolvedValue(
      activeResponsibleLink(),
    )
    transactionMock.responsibleLink.update.mockResolvedValue(
      endedResponsibleLink({
        endedAt: new Date(endedAt),
        endReason: "Solicitacao administrativa",
      }),
    )

    await expect(
      endResponsibleLink({
        responsibleLinkId,
        endedAt,
        endReason: " Solicitacao administrativa ",
        confirmation: true,
      }),
    ).resolves.toMatchObject({
      id: responsibleLinkId,
      status: LINK_STATUS.ENDED,
      endedAt,
      endReason: "Solicitacao administrativa",
    })

    expect(transactionMock.responsibleLink.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: responsibleLinkId },
        data: {
          status: LINK_STATUS.ENDED,
          endedAt: new Date(endedAt),
          endReason: "Solicitacao administrativa",
        },
      }),
    )
    expect(transactionMock.responsibleLink.delete).not.toHaveBeenCalled()
  })

  it("requires endedAt, reason and confirmation to end a responsible link", async () => {
    await expect(
      endResponsibleLink({
        responsibleLinkId,
        endedAt: "2026-03-01T10:00:00.000Z",
        endReason: " ",
        confirmation: true,
      }),
    ).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    })

    await expect(
      endResponsibleLink({
        responsibleLinkId,
        endedAt: "not-a-date",
        endReason: "Solicitacao administrativa",
        confirmation: true,
      }),
    ).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    })

    const input = {
      responsibleLinkId,
      endedAt: "2026-03-01T10:00:00.000Z",
      endReason: "Solicitacao administrativa",
      confirmation: false,
    } as unknown as Parameters<typeof endResponsibleLink>[0]

    await expect(endResponsibleLink(input)).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    })

    expect(withSerializableTransactionMock).not.toHaveBeenCalled()
    expect(transactionMock.responsibleLink.update).not.toHaveBeenCalled()
    expect(transactionMock.responsibleLink.delete).not.toHaveBeenCalled()
  })

  it("maps missing responsibles and missing links to not found", async () => {
    prismaMock.responsible.findUnique.mockResolvedValueOnce(null)

    await expect(getResponsibleById(responsibleId)).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.NOT_FOUND,
      status: HTTP_STATUS.NOT_FOUND,
    })

    transactionMock.responsibleLink.findUnique.mockResolvedValueOnce(null)

    await expect(
      endResponsibleLink({
        responsibleLinkId,
        endedAt: "2026-03-01T10:00:00.000Z",
        endReason: "Solicitacao administrativa",
        confirmation: true,
      }),
    ).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.NOT_FOUND,
      status: HTTP_STATUS.NOT_FOUND,
    })
  })

  it("maps missing responsible updates to not found without deleting", async () => {
    prismaMock.responsible.update.mockRejectedValue(prismaError("P2025"))

    const { updateResponsible } = await import(
      "@/services/responsible-service"
    )

    await expect(
      updateResponsible(responsibleId, {
        fullName: "Responsavel Ausente",
        phone: "11999999999",
      }),
    ).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.NOT_FOUND,
      status: HTTP_STATUS.NOT_FOUND,
    })
  })
})
