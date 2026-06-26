import { beforeEach, describe, expect, it, vi } from "vitest"

import { DOMAIN_ERROR_CODE, HTTP_STATUS } from "@/types/api"
import { PERMISSION } from "@/types/auth"
import { BURIAL_LINK_STATUS } from "@/types/burial-link"
import {
  BURIAL_SPACE_STATUS,
  BURIAL_SPACE_TYPE,
  type BurialSpaceStatus,
  type BurialSpaceType,
} from "@/types/burial-space"

const prismaMock = vi.hoisted(() => ({
  burialLink: {
    count: vi.fn(),
  },
}))

const transactionMock = vi.hoisted(() => ({
  burialSpace: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  burialLink: {
    create: vi.fn(),
  },
  deceased: {
    findUnique: vi.fn(),
  },
  responsible: {
    findUnique: vi.fn(),
  },
}))

const requirePermissionMock = vi.hoisted(() => vi.fn())
const withSerializableTransactionMock = vi.hoisted(() =>
  vi.fn(async (callback: (transaction: typeof transactionMock) => unknown) =>
    callback(transactionMock),
  ),
)

vi.mock("server-only", () => ({}))

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(() => prismaMock),
}))

vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: requirePermissionMock,
}))

vi.mock("@/lib/db/transaction", () => ({
  withSerializableTransaction: withSerializableTransactionMock,
}))

const {
  BURIAL_LINK_BLOCK_REASON,
  createBurialLink,
  readBurialLinkAvailability,
} = await import("@/services/burial-link-service")

const deceasedId = "00000000-0000-4000-8000-000000000134"
const burialSpaceId = "00000000-0000-4000-8000-000000000135"
const responsibleId = "00000000-0000-4000-8000-000000000136"
const burialLinkId = "00000000-0000-4000-8000-000000000137"

function mockDeceased(activeLinkCount = 0): void {
  transactionMock.deceased.findUnique.mockResolvedValue({
    id: deceasedId,
    burialLinks: Array.from({ length: activeLinkCount }, (_, index) => ({
      id: `active-link-${index}`,
    })),
  })
}

function mockBurialSpace(overrides: {
  activeLinkCount?: number
  capacity?: number
  status?: BurialSpaceStatus
  type?: BurialSpaceType
} = {}): void {
  transactionMock.burialSpace.findUnique.mockResolvedValue({
    id: burialSpaceId,
    type: overrides.type ?? BURIAL_SPACE_TYPE.JAZIGO,
    status: overrides.status ?? BURIAL_SPACE_STATUS.AVAILABLE,
    capacity: overrides.capacity ?? 2,
    _count: {
      burialLinks: overrides.activeLinkCount ?? 0,
    },
  })
}

function mockAvailableSpace(overrides: {
  activeLinkCount?: number
  capacity?: number
  type?: BurialSpaceType
} = {}): void {
  mockDeceased(0)
  mockBurialSpace(overrides)
}

function activeBurialLinkRecord() {
  return {
    id: burialLinkId,
    deceasedId,
    burialSpaceId,
    responsibleId,
    burialDate: new Date("2026-01-12T00:00:00.000Z"),
    status: BURIAL_LINK_STATUS.ACTIVE,
    endedAt: null,
    endReason: null,
    createdAt: new Date("2026-01-12T12:00:00.000Z"),
    updatedAt: new Date("2026-01-12T13:00:00.000Z"),
  }
}

describe("BurialLinkService capacity and active-link rules", () => {
  beforeEach(() => {
    prismaMock.burialLink.count.mockReset()
    transactionMock.burialSpace.findUnique.mockReset()
    transactionMock.burialSpace.update.mockReset()
    transactionMock.burialLink.create.mockReset()
    transactionMock.deceased.findUnique.mockReset()
    transactionMock.responsible.findUnique.mockReset()
    requirePermissionMock.mockReset()
    withSerializableTransactionMock.mockClear()
  })

  it("allows a jazigo below capacity and returns the current counters", async () => {
    mockAvailableSpace({ activeLinkCount: 1, capacity: 2 })

    await expect(
      readBurialLinkAvailability(deceasedId, burialSpaceId),
    ).resolves.toEqual({
      burialSpaceId,
      deceasedId,
      type: BURIAL_SPACE_TYPE.JAZIGO,
      status: BURIAL_SPACE_STATUS.AVAILABLE,
      capacity: 2,
      activeLinkCount: 1,
      canLink: true,
    })

    expect(requirePermissionMock).toHaveBeenCalledWith(
      PERMISSION.MANAGE_OPERATIONAL_RECORDS,
    )
  })

  it.each([
    [
      BURIAL_SPACE_STATUS.RESERVED,
      BURIAL_LINK_BLOCK_REASON.SPACE_RESERVED,
    ],
    [
      BURIAL_SPACE_STATUS.INACTIVE,
      BURIAL_LINK_BLOCK_REASON.SPACE_INACTIVE,
    ],
  ] as const)(
    "blocks links for %s spaces with reasonCode %s",
    async (status, reasonCode) => {
      mockDeceased(0)
      mockBurialSpace({ status })

      await expect(
        readBurialLinkAvailability(deceasedId, burialSpaceId),
      ).resolves.toMatchObject({
        canLink: false,
        reasonCode,
        status,
      })
    },
  )

  it("blocks a second active link for the same deceased", async () => {
    mockDeceased(1)
    mockBurialSpace({ activeLinkCount: 0 })

    await expect(
      readBurialLinkAvailability(deceasedId, burialSpaceId),
    ).resolves.toMatchObject({
      canLink: false,
      reasonCode: BURIAL_LINK_BLOCK_REASON.DECEASED_ALREADY_LINKED,
    })
  })

  it("blocks occupied sepulturas and full jazigos with specific reasonCodes", async () => {
    mockAvailableSpace({
      activeLinkCount: 1,
      capacity: 1,
      type: BURIAL_SPACE_TYPE.SEPULTURA,
    })

    await expect(
      readBurialLinkAvailability(deceasedId, burialSpaceId),
    ).resolves.toMatchObject({
      canLink: false,
      reasonCode: BURIAL_LINK_BLOCK_REASON.SEPULTURA_OCCUPIED,
    })

    mockAvailableSpace({
      activeLinkCount: 2,
      capacity: 2,
      type: BURIAL_SPACE_TYPE.JAZIGO,
    })

    await expect(
      readBurialLinkAvailability(deceasedId, burialSpaceId),
    ).resolves.toMatchObject({
      canLink: false,
      reasonCode: BURIAL_LINK_BLOCK_REASON.JAZIGO_CAPACITY_REACHED,
    })
  })

  it("rejects creation when the deceased already has an active link", async () => {
    mockDeceased(1)
    mockBurialSpace({ activeLinkCount: 0, capacity: 2 })

    await expect(
      createBurialLink({
        deceasedId,
        burialSpaceId,
        burialDate: "2026-01-12",
      }),
    ).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.CONFLICT,
      status: HTTP_STATUS.CONFLICT,
      reasonCode: BURIAL_LINK_BLOCK_REASON.DECEASED_ALREADY_LINKED,
    })

    expect(transactionMock.burialLink.create).not.toHaveBeenCalled()
    expect(transactionMock.burialSpace.update).not.toHaveBeenCalled()
  })

  it("creates an active link up to jazigo capacity and updates the space to occupied", async () => {
    mockAvailableSpace({ activeLinkCount: 1, capacity: 2 })
    transactionMock.responsible.findUnique.mockResolvedValue({ id: responsibleId })
    transactionMock.burialLink.create.mockResolvedValue(activeBurialLinkRecord())
    transactionMock.burialSpace.update.mockResolvedValue({ id: burialSpaceId })

    await expect(
      createBurialLink({
        deceasedId,
        burialSpaceId,
        responsibleId,
        burialDate: "2026-01-12",
      }),
    ).resolves.toEqual({
      id: burialLinkId,
      deceasedId,
      burialSpaceId,
      responsibleId,
      burialDate: "2026-01-12",
      status: BURIAL_LINK_STATUS.ACTIVE,
      endedAt: null,
      endReason: null,
      createdAt: "2026-01-12T12:00:00.000Z",
      updatedAt: "2026-01-12T13:00:00.000Z",
    })

    expect(transactionMock.burialLink.create).toHaveBeenCalledWith({
      data: {
        deceasedId,
        burialSpaceId,
        responsibleId,
        burialDate: "2026-01-12",
        status: BURIAL_LINK_STATUS.ACTIVE,
      },
      select: expect.objectContaining({
        id: true,
        status: true,
      }),
    })
    expect(transactionMock.burialSpace.update).toHaveBeenCalledWith({
      where: { id: burialSpaceId },
      data: { status: BURIAL_SPACE_STATUS.OCCUPIED },
      select: { id: true },
    })
  })

  it("validates IDs before opening a transaction", async () => {
    await expect(
      readBurialLinkAvailability("not-a-uuid", burialSpaceId),
    ).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    })

    expect(withSerializableTransactionMock).not.toHaveBeenCalled()
  })
})
