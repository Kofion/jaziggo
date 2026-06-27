import { loadEnvConfig } from "@next/env";
import type { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { resolveIntegrationDatabaseUrl } from "./setup-database";
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type ErrorEnvelope,
  type SuccessEnvelope,
} from "../../types/api";
import type { BurialLink } from "../../types/burial-link";
import { BURIAL_LINK_STATUS } from "../../types/burial-link";
import {
  BURIAL_SPACE_STATUS,
  BURIAL_SPACE_TYPE,
} from "../../types/burial-space";
import {
  USER_ROLE,
  USER_STATUS,
  type UserDto,
} from "../../types/user";

const getServerSessionMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));

vi.mock("next-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-auth")>();

  return {
    ...actual,
    getServerSession: getServerSessionMock,
  };
});

type BurialLinksPost = typeof import("../../app/api/v1/burial-links/route").POST;

interface BurialLinkRoutes {
  burialLinksPost: BurialLinksPost;
}

const integrationEmployeeUser = {
  id: "00000000-0000-4000-8000-000000000501",
  name: "Burial Link Concurrency Employee",
  email: "employee@burial-link-concurrency.integration.test",
  role: USER_ROLE.EMPLOYEE,
  status: USER_STATUS.ACTIVE,
} as const satisfies UserDto;

const contestedJazigoId = "00000000-0000-4000-8000-000000005501";
const existingDeceasedId = "00000000-0000-4000-8000-000000006501";
const contenderDeceasedIds = [
  "00000000-0000-4000-8000-000000006502",
  "00000000-0000-4000-8000-000000006503",
] as const;
const existingBurialLinkId = "00000000-0000-4000-8000-000000007501";

let prisma: PrismaClient;
let routes: BurialLinkRoutes;

function requestUrl(path: string): string {
  return `http://localhost${path}`;
}

function jsonRequest(path: string, method: "POST", body: unknown): NextRequest {
  return new NextRequest(requestUrl(path), {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function responseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function sessionFor(user: Pick<UserDto, "id" | "role">) {
  return {
    expires: new Date(Date.now() + 60_000).toISOString(),
    user: {
      id: user.id,
      role: user.role,
    },
  };
}

function expectRequestId(body: { requestId: string }): void {
  expect(body.requestId).toEqual(expect.any(String));
}

async function seedBurialLinkConcurrency(): Promise<void> {
  await prisma.burialLink.deleteMany({
    where: {
      OR: [
        { id: existingBurialLinkId },
        { burialSpaceId: contestedJazigoId },
        { deceasedId: { in: [existingDeceasedId, ...contenderDeceasedIds] } },
        { deceased: { internalCode: { startsWith: "INT-T145" } } },
        { burialSpace: { identifier: { startsWith: "INT-T145" } } },
      ],
    },
  });
  await prisma.burialSpace.deleteMany({
    where: {
      OR: [
        { id: contestedJazigoId },
        { identifier: { startsWith: "INT-T145" } },
      ],
    },
  });
  await prisma.deceased.deleteMany({
    where: {
      OR: [
        { id: { in: [existingDeceasedId, ...contenderDeceasedIds] } },
        { internalCode: { startsWith: "INT-T145" } },
      ],
    },
  });
  await prisma.user.deleteMany({
    where: {
      email: { endsWith: "@burial-link-concurrency.integration.test" },
    },
  });

  await prisma.user.create({
    data: {
      id: integrationEmployeeUser.id,
      name: integrationEmployeeUser.name,
      email: integrationEmployeeUser.email,
      passwordHash: "integration-test-password-hash",
      role: USER_ROLE.EMPLOYEE,
      status: USER_STATUS.ACTIVE,
    },
  });

  await prisma.burialSpace.create({
    data: {
      id: contestedJazigoId,
      type: BURIAL_SPACE_TYPE.JAZIGO,
      identifier: "INT-T145-CONTESTED-JAZIGO",
      locationKey: "sector=integration%20sector%20t145|row=contested",
      sector: "Integration Sector T145",
      row: "Contested",
      number: "145",
      status: BURIAL_SPACE_STATUS.OCCUPIED,
      capacity: 2,
    },
  });

  await prisma.deceased.createMany({
    data: [existingDeceasedId, ...contenderDeceasedIds].map((id, index) => ({
      id,
      internalCode: `INT-T145-DEC-${index + 1}`,
      fullName: `INT-T145 Deceased ${index + 1}`,
      searchName: `int-t145 deceased ${index + 1}`,
      burialDate: new Date(`2025-05-${10 + index}T00:00:00.000Z`),
      datesUnknown: false,
      historicalDataIncomplete: true,
    })),
  });

  await prisma.burialLink.create({
    data: {
      id: existingBurialLinkId,
      deceasedId: existingDeceasedId,
      burialSpaceId: contestedJazigoId,
      burialDate: new Date("2025-05-10T00:00:00.000Z"),
      status: BURIAL_LINK_STATUS.ACTIVE,
    },
  });
}

async function loadRoutes(): Promise<BurialLinkRoutes> {
  const collectionRoute = await import("../../app/api/v1/burial-links/route");

  return {
    burialLinksPost: collectionRoute.POST,
  };
}

beforeAll(async () => {
  loadEnvConfig(process.cwd());

  const testDatabaseUrl = resolveIntegrationDatabaseUrl();

  process.env.AUTH_SECRET ??= "integration-test-auth-secret";
  process.env.DATABASE_URL = testDatabaseUrl;

  const prismaModule = await import("../../lib/db/prisma");
  prisma = prismaModule.prisma;
  routes = await loadRoutes();
});

beforeEach(async () => {
  getServerSessionMock.mockReset();
  await seedBurialLinkConcurrency();
});

afterAll(async () => {
  await prisma?.$disconnect();
});

describe("burial link concurrency integration", () => {
  it("confirms exactly one concurrent request for the last jazigo slot and never exceeds capacity", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor(integrationEmployeeUser));

    const responses = await Promise.all(
      contenderDeceasedIds.map((deceasedId, index) =>
        routes.burialLinksPost(
          jsonRequest("/api/v1/burial-links", "POST", {
            deceasedId,
            burialSpaceId: contestedJazigoId,
            burialDate: `2025-05-${11 + index}`,
          }),
        ),
      ),
    );
    const successResponses = responses.filter(
      (response) => response.status === HTTP_STATUS.CREATED,
    );
    const conflictResponses = responses.filter(
      (response) => response.status === HTTP_STATUS.CONFLICT,
    );

    expect(successResponses).toHaveLength(1);
    expect(conflictResponses).toHaveLength(1);

    const successBody =
      await responseJson<SuccessEnvelope<BurialLink>>(successResponses[0]);
    const conflictBody = await responseJson<ErrorEnvelope>(conflictResponses[0]);

    expect(successBody).toMatchObject({
      success: true,
      data: {
        burialSpaceId: contestedJazigoId,
        status: BURIAL_LINK_STATUS.ACTIVE,
      },
    });
    expect(contenderDeceasedIds).toContain(successBody.data.deceasedId);
    expectRequestId(successBody);
    expect(conflictBody).toMatchObject({
      success: false,
      error: { code: DOMAIN_ERROR_CODE.CONFLICT },
    });
    expectRequestId(conflictBody);

    await expect(
      prisma.burialLink.count({
        where: {
          burialSpaceId: contestedJazigoId,
          status: BURIAL_LINK_STATUS.ACTIVE,
        },
      }),
    ).resolves.toBe(2);
    await expect(
      prisma.burialSpace.findUniqueOrThrow({
        where: { id: contestedJazigoId },
        include: {
          _count: {
            select: {
              burialLinks: {
                where: { status: BURIAL_LINK_STATUS.ACTIVE },
              },
            },
          },
        },
      }),
    ).resolves.toMatchObject({
      status: BURIAL_SPACE_STATUS.OCCUPIED,
      capacity: 2,
      _count: { burialLinks: 2 },
    });

    const linkedContenderIds = await prisma.burialLink.findMany({
      where: {
        deceasedId: { in: [...contenderDeceasedIds] },
        burialSpaceId: contestedJazigoId,
        status: BURIAL_LINK_STATUS.ACTIVE,
      },
      select: { deceasedId: true },
    });

    expect(linkedContenderIds).toHaveLength(1);
    expect(linkedContenderIds[0]?.deceasedId).toBe(successBody.data.deceasedId);
  });
});
