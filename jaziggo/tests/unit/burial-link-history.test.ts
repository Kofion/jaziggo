import { beforeEach, describe, expect, it, vi } from "vitest"

import { DOMAIN_ERROR_CODE, HTTP_STATUS } from "@/types/api"
import { PERMISSION } from "@/types/auth"
import { BURIAL_LINK_STATUS } from "@/types/burial-link"
import {
  BURIAL_SPACE_STATUS,
  type BurialSpaceStatus,
} from "@/types/burial-space"

const transactionMock = vi.hoisted(() => ({
  burialSpace: {
    update: vi.fn(),
  },
  burialLink: {
    count: vi.fn(),
    delete: vi.fn(),
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

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(),
}))

vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: requirePermissionMock,
}))

vi.mock("@/lib/db/transaction", () => ({
  withSerializableTransaction: withSerializableTransactionMock,
}))

vi.mock("@/lib/db/prisma", () => ({
  prisma: {},
}))

const { endBurialLink } = await import("@/services/burial-link-service")

const burialLinkId = "00000000-0000-4000-8000-000000000135"
const deceasedId = "00000000-0000-4000-8000-000000000136"
const burialSpaceId = "00000000-0000-4000-8000-000000000137"
const responsibleId = "00000000-0000-4000-8000-000000000138"
const endedAt = "2026-03-01T10:00:00.000Z"
const endReason = "Transferencia administrativa"

function activeLinkLookup(status: BurialSpaceStatus = BURIAL_SPACE_STATUS.OCCUPIED) {
  return {
    id: burialLinkId,
    status: BURIAL_LINK_STATUS.ACTIVE,
    burialSpaceId,
    burialSpace: {
      status,
    },
  }
}

function endedBurialLinkRecord(overrides: {
  endedAt?: Date
  endReason?: string
} = {}) {
  return {
    id: burialLinkId,
    deceasedId,
    burialSpaceId,
    responsibleId,
    burialDate: new Date("2026-01-12T00:00:00.000Z"),
    status: BURIAL_LINK_STATUS.ENDED,
    endedAt: overrides.endedAt ?? new Date(endedAt),
    endReason: overrides.endReason ?? endReason,
    createdAt: new Date("2026-01-12T12:00:00.000Z"),
    updatedAt: new Date("2026-03-01T10:01:00.000Z"),
  }
}

function mockEndFlow(options: {
  currentSpaceStatus?: BurialSpaceStatus
  remainingActiveLinks?: number
} = {}): void {
  transactionMock.burialLink.findUnique.mockResolvedValue(
    activeLinkLookup(options.currentSpaceStatus),
  )
  transactionMock.burialLink.update.mockResolvedValue(
    endedBurialLinkRecord(),
  )
  transactionMock.burialLink.count.mockResolvedValue(
    options.remainingActiveLinks ?? 0,
  )
  transactionMock.burialSpace.update.mockResolvedValue({ id: burialSpaceId })
}

describe("BurialLinkService historical closure", () => {
  beforeEach(() => {
    transactionMock.burialSpace.update.mockReset()
    transactionMock.burialLink.count.mockReset()
    transactionMock.burialLink.delete.mockReset()
    transactionMock.burialLink.findUnique.mockReset()
    transactionMock.burialLink.update.mockReset()
    requirePermissionMock.mockReset()
    withSerializableTransactionMock.mockClear()
  })

  it("requires endedAt, endReason and confirmation before opening a transaction", async () => {
    await expect(
      endBurialLink({
        burialLinkId,
        endedAt,
        endReason: " ",
        confirmation: true,
      }),
    ).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    })

    await expect(
      endBurialLink({
        burialLinkId,
        endedAt: "not-a-date",
        endReason,
        confirmation: true,
      }),
    ).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    })

    const input = {
      burialLinkId,
      endedAt,
      endReason,
      confirmation: false,
    } as unknown as Parameters<typeof endBurialLink>[0]

    await expect(endBurialLink(input)).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    })

    expect(withSerializableTransactionMock).not.toHaveBeenCalled()
    expect(transactionMock.burialLink.update).not.toHaveBeenCalled()
    expect(transactionMock.burialLink.delete).not.toHaveBeenCalled()
  })

  it("ends an active link historically and keeps the space occupied when active links remain", async () => {
    mockEndFlow({ remainingActiveLinks: 1 })

    await expect(
      endBurialLink({
        burialLinkId,
        endedAt,
        endReason: ` ${endReason} `,
        confirmation: true,
      }),
    ).resolves.toEqual({
      id: burialLinkId,
      deceasedId,
      burialSpaceId,
      responsibleId,
      burialDate: "2026-01-12",
      status: BURIAL_LINK_STATUS.ENDED,
      endedAt,
      endReason,
      createdAt: "2026-01-12T12:00:00.000Z",
      updatedAt: "2026-03-01T10:01:00.000Z",
    })

    expect(requirePermissionMock).toHaveBeenCalledWith(
      PERMISSION.MANAGE_OPERATIONAL_RECORDS,
    )
    expect(transactionMock.burialLink.update).toHaveBeenCalledWith({
      where: { id: burialLinkId },
      data: {
        status: BURIAL_LINK_STATUS.ENDED,
        endedAt: new Date(endedAt),
        endReason,
      },
      select: expect.objectContaining({
        id: true,
        status: true,
      }),
    })
    expect(transactionMock.burialLink.count).toHaveBeenCalledWith({
      where: {
        burialSpaceId,
        status: BURIAL_LINK_STATUS.ACTIVE,
      },
    })
    expect(transactionMock.burialSpace.update).toHaveBeenCalledWith({
      where: { id: burialSpaceId },
      data: { status: BURIAL_SPACE_STATUS.OCCUPIED },
      select: { id: true },
    })
    expect(transactionMock.burialLink.delete).not.toHaveBeenCalled()
  })

  it("sets the space to available when the ended link was the last active one", async () => {
    mockEndFlow({
      currentSpaceStatus: BURIAL_SPACE_STATUS.OCCUPIED,
      remainingActiveLinks: 0,
    })

    await endBurialLink({
      burialLinkId,
      endedAt,
      endReason,
      confirmation: true,
    })

    expect(transactionMock.burialSpace.update).toHaveBeenCalledWith({
      where: { id: burialSpaceId },
      data: { status: BURIAL_SPACE_STATUS.AVAILABLE },
      select: { id: true },
    })
    expect(transactionMock.burialLink.delete).not.toHaveBeenCalled()
  })

  it.each([
    BURIAL_SPACE_STATUS.RESERVED,
    BURIAL_SPACE_STATUS.INACTIVE,
  ] as const)(
    "preserves %s when no active links remain",
    async (currentSpaceStatus) => {
      mockEndFlow({
        currentSpaceStatus,
        remainingActiveLinks: 0,
      })

      await endBurialLink({
        burialLinkId,
        endedAt,
        endReason,
        confirmation: true,
      })

      expect(transactionMock.burialSpace.update).toHaveBeenCalledWith({
        where: { id: burialSpaceId },
        data: { status: currentSpaceStatus },
        select: { id: true },
      })
      expect(transactionMock.burialLink.delete).not.toHaveBeenCalled()
    },
  )

  it("rejects missing or already-ended links without updating history", async () => {
    transactionMock.burialLink.findUnique.mockResolvedValueOnce(null)

    await expect(
      endBurialLink({
        burialLinkId,
        endedAt,
        endReason,
        confirmation: true,
      }),
    ).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.NOT_FOUND,
      status: HTTP_STATUS.NOT_FOUND,
    })

    transactionMock.burialLink.findUnique.mockResolvedValueOnce({
      ...activeLinkLookup(),
      status: BURIAL_LINK_STATUS.ENDED,
    })

    await expect(
      endBurialLink({
        burialLinkId,
        endedAt,
        endReason,
        confirmation: true,
      }),
    ).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.CONFLICT,
      status: HTTP_STATUS.CONFLICT,
    })

    expect(transactionMock.burialLink.update).not.toHaveBeenCalled()
    expect(transactionMock.burialLink.delete).not.toHaveBeenCalled()
    expect(transactionMock.burialSpace.update).not.toHaveBeenCalled()
  })
})
