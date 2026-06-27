import { loadEnvConfig } from "@next/env";
import type { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { resolveIntegrationDatabaseUrl } from "./setup-database";
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type ErrorEnvelope,
  type PaginationMeta,
  type SuccessEnvelope,
} from "../../types/api";
import {
  BURIAL_SPACE_STATUS,
  BURIAL_SPACE_TYPE,
  type BurialSpaceListItemDto,
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

type BurialSpacesGet = typeof import("../../app/api/v1/burial-spaces/route").GET;
type BurialSpacesPost = typeof import("../../app/api/v1/burial-spaces/route").POST;
type BurialSpaceGet = typeof import("../../app/api/v1/burial-spaces/[id]/route").GET;
type BurialSpacePut = typeof import("../../app/api/v1/burial-spaces/[id]/route").PUT;
type BurialSpaceStatusPatch =
  typeof import("../../app/api/v1/burial-spaces/[id]/status/route").PATCH;

interface BurialSpaceRoutes {
  burialSpacesGet: BurialSpacesGet;
  burialSpacesPost: BurialSpacesPost;
  burialSpaceGet: BurialSpaceGet;
  burialSpacePut: BurialSpacePut;
  burialSpaceStatusPatch: BurialSpaceStatusPatch;
}

interface BurialSpacePageResponse extends PaginationMeta {
  data: BurialSpaceListItemDto[];
}

interface BurialSpaceRouteContext {
  params: Promise<{ id: string }>;
}

const integrationEmployeeUser = {
  id: "00000000-0000-4000-8000-000000000202",
  name: "Burial Spaces API Employee",
  email: "employee@burial-spaces-api.integration.test",
  role: USER_ROLE.EMPLOYEE,
  status: USER_STATUS.ACTIVE,
} as const satisfies UserDto;

const occupiedJazigoId = "00000000-0000-4000-8000-000000003201";
const linkedDeceasedIds = [
  "00000000-0000-4000-8000-000000006201",
  "00000000-0000-4000-8000-000000006202",
] as const;
const activeBurialLinkIds = [
  "00000000-0000-4000-8000-000000007201",
  "00000000-0000-4000-8000-000000007202",
] as const;

let prisma: PrismaClient;
let routes: BurialSpaceRoutes;

function requestUrl(path: string): string {
  return `http://localhost${path}`;
}

function jsonRequest(path: string, method: "POST" | "PUT" | "PATCH", body: unknown): NextRequest {
  return new NextRequest(requestUrl(path), {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function routeContext(id: string): BurialSpaceRouteContext {
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

function expectErrorEnvelope(
  body: ErrorEnvelope,
  code: ErrorEnvelope["error"]["code"],
): void {
  expect(body).toMatchObject({
    success: false,
    error: { code },
  });
  expectRequestId(body);
}

async function seedBurialSpaces(): Promise<void> {
  await prisma.burialLink.deleteMany({
    where: {
      OR: [
        { id: { in: [...activeBurialLinkIds] } },
        { burialSpace: { identifier: { startsWith: "INT-T142-" } } },
        { deceased: { internalCode: { startsWith: "INT-T142-" } } },
      ],
    },
  });
  await prisma.burialSpace.deleteMany({
    where: { identifier: { startsWith: "INT-T142-" } },
  });
  await prisma.deceased.deleteMany({
    where: { internalCode: { startsWith: "INT-T142-" } },
  });
  await prisma.user.deleteMany({
    where: { email: { endsWith: "@burial-spaces-api.integration.test" } },
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
      id: occupiedJazigoId,
      type: BURIAL_SPACE_TYPE.JAZIGO,
      identifier: "INT-T142-OCCUPIED-JAZIGO",
      locationKey: "sector=integration%20sector%20t142|row=occupied",
      sector: "Integration Sector T142",
      row: "Occupied",
      number: "99",
      status: BURIAL_SPACE_STATUS.OCCUPIED,
      capacity: 2,
    },
  });

  await prisma.deceased.createMany({
    data: linkedDeceasedIds.map((id, index) => ({
      id,
      internalCode: `INT-T142-DEC-${index + 1}`,
      fullName: `Integration Burial Space Linked Deceased ${index + 1}`,
      searchName: `integration burial space linked deceased ${index + 1}`,
      burialDate: new Date(`2025-01-${10 + index}T00:00:00.000Z`),
      datesUnknown: false,
      historicalDataIncomplete: true,
    })),
  });

  await prisma.burialLink.createMany({
    data: activeBurialLinkIds.map((id, index) => ({
      id,
      deceasedId: linkedDeceasedIds[index],
      burialSpaceId: occupiedJazigoId,
      burialDate: new Date(`2025-01-${10 + index}T00:00:00.000Z`),
      status: "ACTIVE",
    })),
  });
}

async function loadRoutes(): Promise<BurialSpaceRoutes> {
  const [collectionRoute, detailRoute, statusRoute] = await Promise.all([
    import("../../app/api/v1/burial-spaces/route"),
    import("../../app/api/v1/burial-spaces/[id]/route"),
    import("../../app/api/v1/burial-spaces/[id]/status/route"),
  ]);

  return {
    burialSpacesGet: collectionRoute.GET,
    burialSpacesPost: collectionRoute.POST,
    burialSpaceGet: detailRoute.GET,
    burialSpacePut: detailRoute.PUT,
    burialSpaceStatusPatch: statusRoute.PATCH,
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
  await seedBurialSpaces();
});

afterAll(async () => {
  await prisma?.$disconnect();
});

describe("burial spaces API integration", () => {
  it("lets EMPLOYEE create, list, read, update and reserve a persisted space preserving row", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor(integrationEmployeeUser));

    const createResponse = await routes.burialSpacesPost(
      jsonRequest("/api/v1/burial-spaces", "POST", {
        type: BURIAL_SPACE_TYPE.SEPULTURA,
        identifier: " INT-T142-SEP-CREATED ",
        status: BURIAL_SPACE_STATUS.AVAILABLE,
        capacity: 1,
        row: " Row T142 ",
      }),
    );
    const createBody =
      await responseJson<SuccessEnvelope<BurialSpaceListItemDto>>(createResponse);

    expect(createResponse.status).toBe(HTTP_STATUS.CREATED);
    expect(createBody).toMatchObject({
      success: true,
      data: {
        type: BURIAL_SPACE_TYPE.SEPULTURA,
        identifier: "INT-T142-SEP-CREATED",
        row: "Row T142",
        status: BURIAL_SPACE_STATUS.AVAILABLE,
        capacity: 1,
        activeLinkCount: 0,
      },
    });
    expectRequestId(createBody);

    await expect(
      prisma.burialSpace.findUniqueOrThrow({
        where: { id: createBody.data.id },
      }),
    ).resolves.toMatchObject({
      identifier: "INT-T142-SEP-CREATED",
      row: "Row T142",
      locationKey: "row=row%20t142",
      capacity: 1,
    });

    const listResponse = await routes.burialSpacesGet(
      new NextRequest(
        requestUrl("/api/v1/burial-spaces?type=SEPULTURA&status=AVAILABLE&identifier=INT-T142-SEP-CREATED"),
        { method: "GET" },
      ),
    );
    const listBody =
      await responseJson<SuccessEnvelope<BurialSpacePageResponse>>(listResponse);

    expect(listResponse.status).toBe(HTTP_STATUS.OK);
    expect(listBody.data.data).toEqual([
      expect.objectContaining({
        id: createBody.data.id,
        row: "Row T142",
        activeLinkCount: 0,
      }),
    ]);

    const detailResponse = await routes.burialSpaceGet(
      new NextRequest(requestUrl(`/api/v1/burial-spaces/${createBody.data.id}`), {
        method: "GET",
      }),
      routeContext(createBody.data.id),
    );
    const detailBody =
      await responseJson<SuccessEnvelope<BurialSpaceListItemDto>>(detailResponse);

    expect(detailResponse.status).toBe(HTTP_STATUS.OK);
    expect(detailBody.data).toMatchObject({
      id: createBody.data.id,
      row: "Row T142",
      activeLinkCount: 0,
    });

    const updateResponse = await routes.burialSpacePut(
      jsonRequest(`/api/v1/burial-spaces/${createBody.data.id}`, "PUT", {
        type: BURIAL_SPACE_TYPE.JAZIGO,
        identifier: "INT-T142-JAZ-UPDATED",
        capacity: 3,
        sector: "Integration Sector T142",
        row: "Row Updated",
        number: "42",
      }),
      routeContext(createBody.data.id),
    );
    const updateBody =
      await responseJson<SuccessEnvelope<BurialSpaceListItemDto>>(updateResponse);

    expect(updateResponse.status).toBe(HTTP_STATUS.OK);
    expect(updateBody.data).toMatchObject({
      id: createBody.data.id,
      type: BURIAL_SPACE_TYPE.JAZIGO,
      identifier: "INT-T142-JAZ-UPDATED",
      sector: "Integration Sector T142",
      row: "Row Updated",
      number: "42",
      capacity: 3,
      status: BURIAL_SPACE_STATUS.AVAILABLE,
      activeLinkCount: 0,
    });

    const reserveResponse = await routes.burialSpaceStatusPatch(
      jsonRequest(`/api/v1/burial-spaces/${createBody.data.id}/status`, "PATCH", {
        status: BURIAL_SPACE_STATUS.RESERVED,
        confirmation: true,
      }),
      routeContext(createBody.data.id),
    );
    const reserveBody =
      await responseJson<SuccessEnvelope<BurialSpaceListItemDto>>(reserveResponse);

    expect(reserveResponse.status).toBe(HTTP_STATUS.OK);
    expect(reserveBody.data).toMatchObject({
      id: createBody.data.id,
      status: BURIAL_SPACE_STATUS.RESERVED,
      activeLinkCount: 0,
    });

    await expect(
      prisma.burialSpace.findUniqueOrThrow({
        where: { id: createBody.data.id },
      }),
    ).resolves.toMatchObject({
      identifier: "INT-T142-JAZ-UPDATED",
      row: "Row Updated",
      status: BURIAL_SPACE_STATUS.RESERVED,
      capacity: 3,
    });
  });

  it("returns 422 for invalid capacity and missing confirmation without writing invalid data", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor(integrationEmployeeUser));

    const invalidCreateResponse = await routes.burialSpacesPost(
      jsonRequest("/api/v1/burial-spaces", "POST", {
        type: BURIAL_SPACE_TYPE.SEPULTURA,
        identifier: "INT-T142-INVALID-CAPACITY",
        status: BURIAL_SPACE_STATUS.AVAILABLE,
        capacity: 2,
        row: "Invalid Row",
      }),
    );
    const invalidCreateBody = await responseJson<ErrorEnvelope>(invalidCreateResponse);

    expect(invalidCreateResponse.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expectErrorEnvelope(invalidCreateBody, DOMAIN_ERROR_CODE.VALIDATION_ERROR);

    const missingConfirmationResponse = await routes.burialSpaceStatusPatch(
      jsonRequest(`/api/v1/burial-spaces/${occupiedJazigoId}/status`, "PATCH", {
        status: BURIAL_SPACE_STATUS.INACTIVE,
        confirmation: false,
      }),
      routeContext(occupiedJazigoId),
    );
    const missingConfirmationBody =
      await responseJson<ErrorEnvelope>(missingConfirmationResponse);

    expect(missingConfirmationResponse.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expectErrorEnvelope(missingConfirmationBody, DOMAIN_ERROR_CODE.VALIDATION_ERROR);

    await expect(
      prisma.burialSpace.findFirst({
        where: { identifier: "INT-T142-INVALID-CAPACITY" },
      }),
    ).resolves.toBeNull();
  });

  it("returns 409 for duplicate location, manual occupied status and active-link conflicts", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor(integrationEmployeeUser));

    const firstCreateResponse = await routes.burialSpacesPost(
      jsonRequest("/api/v1/burial-spaces", "POST", {
        type: BURIAL_SPACE_TYPE.JAZIGO,
        identifier: "INT-T142-DUPLICATE",
        status: BURIAL_SPACE_STATUS.AVAILABLE,
        capacity: 2,
        sector: "Duplicate Sector",
        row: "Duplicate Row",
      }),
    );

    expect(firstCreateResponse.status).toBe(HTTP_STATUS.CREATED);

    const duplicateResponse = await routes.burialSpacesPost(
      jsonRequest("/api/v1/burial-spaces", "POST", {
        type: BURIAL_SPACE_TYPE.JAZIGO,
        identifier: "INT-T142-DUPLICATE",
        status: BURIAL_SPACE_STATUS.AVAILABLE,
        capacity: 2,
        sector: "Duplicate Sector",
        row: "Duplicate Row",
      }),
    );
    const duplicateBody = await responseJson<ErrorEnvelope>(duplicateResponse);

    expect(duplicateResponse.status).toBe(HTTP_STATUS.CONFLICT);
    expectErrorEnvelope(duplicateBody, DOMAIN_ERROR_CODE.CONFLICT);

    const manualOccupiedResponse = await routes.burialSpaceStatusPatch(
      jsonRequest(`/api/v1/burial-spaces/${occupiedJazigoId}/status`, "PATCH", {
        status: BURIAL_SPACE_STATUS.OCCUPIED,
        confirmation: true,
      }),
      routeContext(occupiedJazigoId),
    );
    const manualOccupiedBody = await responseJson<ErrorEnvelope>(manualOccupiedResponse);

    expect(manualOccupiedResponse.status).toBe(HTTP_STATUS.CONFLICT);
    expectErrorEnvelope(manualOccupiedBody, DOMAIN_ERROR_CODE.CONFLICT);

    const activeLinkStatusResponse = await routes.burialSpaceStatusPatch(
      jsonRequest(`/api/v1/burial-spaces/${occupiedJazigoId}/status`, "PATCH", {
        status: BURIAL_SPACE_STATUS.INACTIVE,
        confirmation: true,
      }),
      routeContext(occupiedJazigoId),
    );
    const activeLinkStatusBody =
      await responseJson<ErrorEnvelope>(activeLinkStatusResponse);

    expect(activeLinkStatusResponse.status).toBe(HTTP_STATUS.CONFLICT);
    expectErrorEnvelope(activeLinkStatusBody, DOMAIN_ERROR_CODE.CONFLICT);

    const capacityConflictResponse = await routes.burialSpacePut(
      jsonRequest(`/api/v1/burial-spaces/${occupiedJazigoId}`, "PUT", {
        type: BURIAL_SPACE_TYPE.JAZIGO,
        identifier: "INT-T142-OCCUPIED-JAZIGO",
        capacity: 1,
        sector: "Integration Sector T142",
        row: "Occupied",
        number: "99",
      }),
      routeContext(occupiedJazigoId),
    );
    const capacityConflictBody =
      await responseJson<ErrorEnvelope>(capacityConflictResponse);

    expect(capacityConflictResponse.status).toBe(HTTP_STATUS.CONFLICT);
    expectErrorEnvelope(capacityConflictBody, DOMAIN_ERROR_CODE.CONFLICT);

    await expect(
      prisma.burialSpace.findUniqueOrThrow({
        where: { id: occupiedJazigoId },
        include: { _count: { select: { burialLinks: true } } },
      }),
    ).resolves.toMatchObject({
      status: BURIAL_SPACE_STATUS.OCCUPIED,
      capacity: 2,
      _count: { burialLinks: 2 },
    });
  });
});
