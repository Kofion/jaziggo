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

type BurialLinkEndPatch =
  typeof import("../../app/api/v1/burial-links/[id]/end/route").PATCH;

interface BurialLinkRoutes {
  burialLinkEndPatch: BurialLinkEndPatch;
}

interface BurialLinkRouteContext {
  params: Promise<{ id: string }>;
}

const integrationEmployeeUser = {
  id: "00000000-0000-4000-8000-000000000502",
  name: "Burial Link History Employee",
  email: "employee@burial-link-history.integration.test",
  role: USER_ROLE.EMPLOYEE,
  status: USER_STATUS.ACTIVE,
  mustChangePassword: false,
} as const satisfies UserDto;

const singleSepulturaId = "00000000-0000-4000-8000-000000005601";
const sharedJazigoId = "00000000-0000-4000-8000-000000005602";
const singleDeceasedId = "00000000-0000-4000-8000-000000006601";
const sharedDeceasedIds = [
  "00000000-0000-4000-8000-000000006602",
  "00000000-0000-4000-8000-000000006603",
] as const;
const singleBurialLinkId = "00000000-0000-4000-8000-000000007601";
const sharedBurialLinkIds = [
  "00000000-0000-4000-8000-000000007602",
  "00000000-0000-4000-8000-000000007603",
] as const;

let prisma: PrismaClient;
let routes: BurialLinkRoutes;

function requestUrl(path: string): string {
  return `http://localhost${path}`;
}

function jsonRequest(path: string, method: "PATCH", body: unknown): NextRequest {
  return new NextRequest(requestUrl(path), {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function routeContext(id: string): BurialLinkRouteContext {
  return {
    params: Promise.resolve({ id }),
  };
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

async function seedBurialLinkHistory(): Promise<void> {
  await prisma.burialLink.deleteMany({
    where: {
      OR: [
        { id: { in: [singleBurialLinkId, ...sharedBurialLinkIds] } },
        { burialSpaceId: { in: [singleSepulturaId, sharedJazigoId] } },
        { deceasedId: { in: [singleDeceasedId, ...sharedDeceasedIds] } },
        { deceased: { internalCode: { startsWith: "INT-T146" } } },
        { burialSpace: { identifier: { startsWith: "INT-T146" } } },
      ],
    },
  });
  await prisma.burialSpace.deleteMany({
    where: {
      OR: [
        { id: { in: [singleSepulturaId, sharedJazigoId] } },
        { identifier: { startsWith: "INT-T146" } },
      ],
    },
  });
  await prisma.deceased.deleteMany({
    where: {
      OR: [
        { id: { in: [singleDeceasedId, ...sharedDeceasedIds] } },
        { internalCode: { startsWith: "INT-T146" } },
      ],
    },
  });
  await prisma.user.deleteMany({
    where: {
      email: { endsWith: "@burial-link-history.integration.test" },
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
      mustChangePassword: false,
    },
  });

  await prisma.burialSpace.createMany({
    data: [
      {
        id: singleSepulturaId,
        type: BURIAL_SPACE_TYPE.SEPULTURA,
        identifier: "INT-T146-SINGLE-SEPULTURA",
        locationKey: "sector=integration%20sector%20t146|row=single",
        sector: "Integration Sector T146",
        row: "Single",
        number: "146A",
        status: BURIAL_SPACE_STATUS.OCCUPIED,
        capacity: 1,
      },
      {
        id: sharedJazigoId,
        type: BURIAL_SPACE_TYPE.JAZIGO,
        identifier: "INT-T146-SHARED-JAZIGO",
        locationKey: "sector=integration%20sector%20t146|row=shared",
        sector: "Integration Sector T146",
        row: "Shared",
        number: "146B",
        status: BURIAL_SPACE_STATUS.OCCUPIED,
        capacity: 2,
      },
    ],
  });

  await prisma.deceased.createMany({
    data: [singleDeceasedId, ...sharedDeceasedIds].map((id, index) => ({
      id,
      internalCode: `INT-T146-DEC-${index + 1}`,
      fullName: `INT-T146 Deceased ${index + 1}`,
      searchName: `int-t146 deceased ${index + 1}`,
      burialDate: new Date(`2025-06-${10 + index}T00:00:00.000Z`),
      datesUnknown: false,
      historicalDataIncomplete: true,
    })),
  });

  await prisma.burialLink.createMany({
    data: [
      {
        id: singleBurialLinkId,
        deceasedId: singleDeceasedId,
        burialSpaceId: singleSepulturaId,
        burialDate: new Date("2025-06-10T00:00:00.000Z"),
        status: BURIAL_LINK_STATUS.ACTIVE,
      },
      {
        id: sharedBurialLinkIds[0],
        deceasedId: sharedDeceasedIds[0],
        burialSpaceId: sharedJazigoId,
        burialDate: new Date("2025-06-11T00:00:00.000Z"),
        status: BURIAL_LINK_STATUS.ACTIVE,
      },
      {
        id: sharedBurialLinkIds[1],
        deceasedId: sharedDeceasedIds[1],
        burialSpaceId: sharedJazigoId,
        burialDate: new Date("2025-06-12T00:00:00.000Z"),
        status: BURIAL_LINK_STATUS.ACTIVE,
      },
    ],
  });
}

async function loadRoutes(): Promise<BurialLinkRoutes> {
  const endRoute = await import("../../app/api/v1/burial-links/[id]/end/route");

  return {
    burialLinkEndPatch: endRoute.PATCH,
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
  await seedBurialLinkHistory();
});

afterAll(async () => {
  await prisma?.$disconnect();
});

describe("burial link history integration", () => {
  it("ends one link while preserving remaining active links and occupied status", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor(integrationEmployeeUser));

    const endedAt = "2025-07-01T10:00:00.000Z";
    const endReason = "Integration T146 partial history closure";
    const response = await routes.burialLinkEndPatch(
      jsonRequest(`/api/v1/burial-links/${sharedBurialLinkIds[0]}/end`, "PATCH", {
        endedAt,
        endReason,
        confirmation: true,
      }),
      routeContext(sharedBurialLinkIds[0]),
    );
    const body = await responseJson<SuccessEnvelope<BurialLink>>(response);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(body).toMatchObject({
      success: true,
      data: {
        id: sharedBurialLinkIds[0],
        burialSpaceId: sharedJazigoId,
        status: BURIAL_LINK_STATUS.ENDED,
        endedAt,
        endReason,
      },
    });
    expectRequestId(body);

    await expect(
      prisma.burialLink.findUniqueOrThrow({
        where: { id: sharedBurialLinkIds[0] },
      }),
    ).resolves.toMatchObject({
      status: BURIAL_LINK_STATUS.ENDED,
      endedAt: new Date(endedAt),
      endReason,
    });
    await expect(
      prisma.burialLink.count({
        where: {
          burialSpaceId: sharedJazigoId,
          status: BURIAL_LINK_STATUS.ACTIVE,
        },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.burialSpace.findUniqueOrThrow({
        where: { id: sharedJazigoId },
      }),
    ).resolves.toMatchObject({
      status: BURIAL_SPACE_STATUS.OCCUPIED,
    });
  });

  it("ends the last active link and recalculates the space to available without deleting history", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor(integrationEmployeeUser));

    const endedAt = "2025-07-02T10:00:00.000Z";
    const endReason = "Integration T146 final history closure";
    const response = await routes.burialLinkEndPatch(
      jsonRequest(`/api/v1/burial-links/${singleBurialLinkId}/end`, "PATCH", {
        endedAt,
        endReason,
        confirmation: true,
      }),
      routeContext(singleBurialLinkId),
    );
    const body = await responseJson<SuccessEnvelope<BurialLink>>(response);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(body).toMatchObject({
      success: true,
      data: {
        id: singleBurialLinkId,
        burialSpaceId: singleSepulturaId,
        status: BURIAL_LINK_STATUS.ENDED,
        endedAt,
        endReason,
      },
    });
    expectRequestId(body);

    await expect(
      prisma.burialLink.count({ where: { id: singleBurialLinkId } }),
    ).resolves.toBe(1);
    await expect(
      prisma.burialSpace.findUniqueOrThrow({
        where: { id: singleSepulturaId },
      }),
    ).resolves.toMatchObject({
      status: BURIAL_SPACE_STATUS.AVAILABLE,
    });
    await expect(
      prisma.burialLink.count({
        where: {
          burialSpaceId: singleSepulturaId,
          status: BURIAL_LINK_STATUS.ACTIVE,
        },
      }),
    ).resolves.toBe(0);
  });

  it("returns 409 when ending an already ended link and preserves the historical row", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor(integrationEmployeeUser));

    const endedAt = new Date("2025-07-03T10:00:00.000Z");
    const endReason = "Integration T146 already ended";

    await prisma.burialLink.update({
      where: { id: singleBurialLinkId },
      data: {
        status: BURIAL_LINK_STATUS.ENDED,
        endedAt,
        endReason,
      },
    });
    await prisma.burialSpace.update({
      where: { id: singleSepulturaId },
      data: { status: BURIAL_SPACE_STATUS.AVAILABLE },
    });

    const response = await routes.burialLinkEndPatch(
      jsonRequest(`/api/v1/burial-links/${singleBurialLinkId}/end`, "PATCH", {
        endedAt: "2025-07-04T10:00:00.000Z",
        endReason: "Integration T146 duplicate closure",
        confirmation: true,
      }),
      routeContext(singleBurialLinkId),
    );
    const body = await responseJson<ErrorEnvelope>(response);

    expect(response.status).toBe(HTTP_STATUS.CONFLICT);
    expect(body).toMatchObject({
      success: false,
      error: { code: DOMAIN_ERROR_CODE.CONFLICT },
    });
    expectRequestId(body);

    await expect(
      prisma.burialLink.findUniqueOrThrow({
        where: { id: singleBurialLinkId },
      }),
    ).resolves.toMatchObject({
      status: BURIAL_LINK_STATUS.ENDED,
      endedAt,
      endReason,
    });
  });
});
