import { beforeEach, describe, expect, it, vi } from "vitest";

import { DOMAIN_ERROR_CODE, HTTP_STATUS } from "@/types/api";
import { PERMISSION } from "@/types/auth";
import {
  BURIAL_SPACE_STATUS,
  BURIAL_SPACE_TYPE,
  type BurialSpaceStatus,
} from "@/types/burial-space";

const requirePermissionMock = vi.hoisted(() => vi.fn());

const transactionMock = vi.hoisted(() => ({
  burialSpace: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

const withSerializableTransactionMock = vi.hoisted(() =>
  vi.fn(async (callback: (transaction: typeof transactionMock) => unknown) =>
    callback(transactionMock),
  ),
);

vi.mock("server-only", () => ({}));

vi.mock("@prisma/client", () => {
  class PrismaClientKnownRequestError extends Error {
    code: string;

    constructor(message: string, options: { code: string }) {
      super(message);
      this.code = options.code;
    }
  }

  return {
    Prisma: {
      PrismaClientKnownRequestError,
    },
    PrismaClient: vi.fn(),
  };
});

vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: requirePermissionMock,
}));

vi.mock("@/lib/db/transaction", () => ({
  withSerializableTransaction: withSerializableTransactionMock,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {},
}));

type BurialSpaceRecord = {
  id: string;
  type: typeof BURIAL_SPACE_TYPE.JAZIGO;
  identifier: string;
  sector: string | null;
  block: string | null;
  street: string | null;
  row: string | null;
  number: string | null;
  complement: string | null;
  status: BurialSpaceStatus;
  capacity: number;
  _count: {
    burialLinks: number;
  };
};

type BurialSpaceRecordOverrides = Partial<Omit<BurialSpaceRecord, "_count">> & {
  activeLinkCount?: number;
};

const burialSpaceId = "00000000-0000-4000-8000-000000000131";

const makeBurialSpaceRecord = (
  overrides: BurialSpaceRecordOverrides = {},
): BurialSpaceRecord => ({
  id: burialSpaceId,
  type: BURIAL_SPACE_TYPE.JAZIGO,
  identifier: "A-001",
  sector: "A",
  block: "01",
  street: null,
  row: "02",
  number: "003",
  complement: null,
  status: BURIAL_SPACE_STATUS.AVAILABLE,
  capacity: 2,
  ...overrides,
  _count: {
    burialLinks: overrides.activeLinkCount ?? 0,
  },
});

describe("BurialSpaceService status transitions", () => {
  beforeEach(() => {
    requirePermissionMock.mockReset();
    transactionMock.burialSpace.findUnique.mockReset();
    transactionMock.burialSpace.update.mockReset();
    withSerializableTransactionMock.mockClear();
  });

  it.each([
    BURIAL_SPACE_STATUS.AVAILABLE,
    BURIAL_SPACE_STATUS.RESERVED,
    BURIAL_SPACE_STATUS.INACTIVE,
  ] as const)(
    "updates a burial space without active links to %s",
    async (status) => {
      const { updateBurialSpaceStatus } = await import(
        "@/services/burial-space-service"
      );

      transactionMock.burialSpace.findUnique.mockResolvedValue(
        makeBurialSpaceRecord(),
      );
      transactionMock.burialSpace.update.mockResolvedValue(
        makeBurialSpaceRecord({ status }),
      );

      await expect(
        updateBurialSpaceStatus(burialSpaceId, {
          status,
          confirmation: true,
        }),
      ).resolves.toMatchObject({
        id: burialSpaceId,
        status,
        activeLinkCount: 0,
      });

      expect(requirePermissionMock).toHaveBeenCalledWith(
        PERMISSION.MANAGE_OPERATIONAL_RECORDS,
      );
      expect(transactionMock.burialSpace.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status },
          where: { id: burialSpaceId },
        }),
      );
    },
  );

  it.each([
    BURIAL_SPACE_STATUS.AVAILABLE,
    BURIAL_SPACE_STATUS.RESERVED,
    BURIAL_SPACE_STATUS.INACTIVE,
  ] as const)(
    "rejects changing to %s when active links exist",
    async (status) => {
      const { updateBurialSpaceStatus } = await import(
        "@/services/burial-space-service"
      );

      transactionMock.burialSpace.findUnique.mockResolvedValue(
        makeBurialSpaceRecord({
          activeLinkCount: 1,
          status: BURIAL_SPACE_STATUS.OCCUPIED,
        }),
      );

      await expect(
        updateBurialSpaceStatus(burialSpaceId, {
          status,
          confirmation: true,
        }),
      ).rejects.toMatchObject({
        code: DOMAIN_ERROR_CODE.CONFLICT,
        status: HTTP_STATUS.CONFLICT,
      });

      expect(transactionMock.burialSpace.update).not.toHaveBeenCalled();
    },
  );

  it("rejects manual transition to OCCUPIED before opening a transaction", async () => {
    const { updateBurialSpaceStatus } = await import(
      "@/services/burial-space-service"
    );

    await expect(
      updateBurialSpaceStatus(burialSpaceId, {
        status: BURIAL_SPACE_STATUS.OCCUPIED,
        confirmation: true,
      }),
    ).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.CONFLICT,
      status: HTTP_STATUS.CONFLICT,
    });

    expect(withSerializableTransactionMock).not.toHaveBeenCalled();
    expect(transactionMock.burialSpace.findUnique).not.toHaveBeenCalled();
    expect(transactionMock.burialSpace.update).not.toHaveBeenCalled();
  });

  it("rejects missing confirmation without changing a burial space", async () => {
    const { updateBurialSpaceStatus } = await import(
      "@/services/burial-space-service"
    );
    const input = {
      status: BURIAL_SPACE_STATUS.INACTIVE,
      confirmation: false,
    } as unknown as Parameters<typeof updateBurialSpaceStatus>[1];

    await expect(
      updateBurialSpaceStatus(burialSpaceId, input),
    ).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    });

    expect(withSerializableTransactionMock).not.toHaveBeenCalled();
    expect(transactionMock.burialSpace.update).not.toHaveBeenCalled();
  });

  it("returns not found when the burial space does not exist", async () => {
    const { updateBurialSpaceStatus } = await import(
      "@/services/burial-space-service"
    );

    transactionMock.burialSpace.findUnique.mockResolvedValue(null);

    await expect(
      updateBurialSpaceStatus(burialSpaceId, {
        status: BURIAL_SPACE_STATUS.RESERVED,
        confirmation: true,
      }),
    ).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.NOT_FOUND,
      status: HTTP_STATUS.NOT_FOUND,
    });

    expect(transactionMock.burialSpace.update).not.toHaveBeenCalled();
  });
});
