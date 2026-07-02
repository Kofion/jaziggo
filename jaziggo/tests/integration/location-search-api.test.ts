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
import { BURIAL_LINK_STATUS } from "../../types/burial-link";
import {
  BURIAL_SPACE_STATUS,
  BURIAL_SPACE_TYPE,
} from "../../types/burial-space";
import type { LocationSearchItemDto } from "../../lib/dto/location-search";
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

type LocationSearchGet = typeof import("../../app/api/v1/location-search/route").GET;
type LocationSearchByDocumentPost =
  typeof import("../../app/api/v1/location-search/by-document/route").POST;
type LocationSearchDetailGet =
  typeof import("../../app/api/v1/location-search/[deceasedId]/route").GET;

interface LocationRoutes {
  locationSearchGet: LocationSearchGet;
  locationSearchByDocumentPost: LocationSearchByDocumentPost;
  locationSearchDetailGet: LocationSearchDetailGet;
}

interface LocationPageResponse extends PaginationMeta {
  data: LocationSearchItemDto[];
}

interface LocationRouteContext {
  params: Promise<{ deceasedId: string }>;
}

const integrationEmployeeUser = {
  id: "00000000-0000-4000-8000-000000000701",
  name: "Location Search API Employee",
  email: "employee@location-search-api.integration.test",
  role: USER_ROLE.EMPLOYEE,
  status: USER_STATUS.ACTIVE,
  mustChangePassword: false,
} as const satisfies UserDto;

const locatedDeceasedId = "00000000-0000-4000-8000-000000006701";
const homonymDeceasedId = "00000000-0000-4000-8000-000000006702";
const locatedBurialSpaceId = "00000000-0000-4000-8000-000000005701";
const homonymBurialSpaceId = "00000000-0000-4000-8000-000000005702";
const responsibleId = "00000000-0000-4000-8000-000000003701";
const locatedBurialLinkId = "00000000-0000-4000-8000-000000007701";
const homonymBurialLinkId = "00000000-0000-4000-8000-000000007702";
const deceasedDocument = "14770199015";
const responsibleDocument = "14770188080";

let prisma: PrismaClient;
let routes: LocationRoutes;

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

function routeContext(deceasedId: string): LocationRouteContext {
  return {
    params: Promise.resolve({ deceasedId }),
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

function expectNoFullDocuments(value: unknown): void {
  const serialized = JSON.stringify(value);

  expect(serialized).not.toContain(deceasedDocument);
  expect(serialized).not.toContain(responsibleDocument);
}

function expectLocationItemHasOnlyMaskedDocuments(item: LocationSearchItemDto): void {
  expect(item).not.toHaveProperty("deceasedDocument");
  expect(item).not.toHaveProperty("responsibleDocument");
  expect(item.deceasedDocumentMasked).toEqual(expect.stringContaining("9015"));
  expect(item.responsibleDocumentMasked).toEqual(expect.stringContaining("8080"));
}

async function seedLocationSearch(): Promise<void> {
  await prisma.burialLink.deleteMany({
    where: {
      OR: [
        { id: { in: [locatedBurialLinkId, homonymBurialLinkId] } },
        { deceased: { internalCode: { startsWith: "INT-T147" } } },
        { burialSpace: { identifier: { startsWith: "INT-T147" } } },
      ],
    },
  });
  await prisma.responsible.deleteMany({
    where: {
      OR: [
        { id: responsibleId },
        { fullName: { startsWith: "INT-T147" } },
        { document: responsibleDocument },
      ],
    },
  });
  await prisma.burialSpace.deleteMany({
    where: {
      OR: [
        { id: { in: [locatedBurialSpaceId, homonymBurialSpaceId] } },
        { identifier: { startsWith: "INT-T147" } },
      ],
    },
  });
  await prisma.deceased.deleteMany({
    where: {
      OR: [
        { id: { in: [locatedDeceasedId, homonymDeceasedId] } },
        { internalCode: { startsWith: "INT-T147" } },
        { document: deceasedDocument },
      ],
    },
  });
  await prisma.user.deleteMany({
    where: { email: { endsWith: "@location-search-api.integration.test" } },
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

  await prisma.responsible.create({
    data: {
      id: responsibleId,
      fullName: "INT-T147 Responsible Silva",
      searchName: "int-t147 responsible silva",
      document: responsibleDocument,
    },
  });

  await prisma.burialSpace.createMany({
    data: [
      {
        id: locatedBurialSpaceId,
        type: BURIAL_SPACE_TYPE.SEPULTURA,
        identifier: "INT-T147-SEP-LOCATED",
        locationKey: "sector=integration%20sector%20t147|row=a|number=1",
        sector: "Integration Sector T147",
        row: "A",
        number: "1",
        status: BURIAL_SPACE_STATUS.OCCUPIED,
        capacity: 1,
      },
      {
        id: homonymBurialSpaceId,
        type: BURIAL_SPACE_TYPE.JAZIGO,
        identifier: "INT-T147-JAZ-HOMONYM",
        locationKey: "sector=integration%20sector%20t147|row=b|number=2",
        sector: "Integration Sector T147",
        row: "B",
        number: "2",
        status: BURIAL_SPACE_STATUS.OCCUPIED,
        capacity: 2,
      },
    ],
  });

  await prisma.deceased.createMany({
    data: [
      {
        id: locatedDeceasedId,
        internalCode: "INT-T147-DEC-1",
        fullName: "INT-T147 Maria Silva",
        searchName: "int-t147 maria silva",
        documentType: "CPF",
        document: deceasedDocument,
        deathDate: new Date("2025-08-10T00:00:00.000Z"),
        burialDate: new Date("2025-08-12T00:00:00.000Z"),
        datesUnknown: false,
        historicalDataIncomplete: false,
      },
      {
        id: homonymDeceasedId,
        internalCode: "INT-T147-DEC-2",
        fullName: "INT-T147 Maria Silva",
        searchName: "int-t147 maria silva",
        deathDate: new Date("2025-09-10T00:00:00.000Z"),
        burialDate: new Date("2025-09-12T00:00:00.000Z"),
        datesUnknown: false,
        historicalDataIncomplete: true,
      },
    ],
  });

  await prisma.burialLink.createMany({
    data: [
      {
        id: locatedBurialLinkId,
        deceasedId: locatedDeceasedId,
        burialSpaceId: locatedBurialSpaceId,
        responsibleId,
        burialDate: new Date("2025-08-12T00:00:00.000Z"),
        status: BURIAL_LINK_STATUS.ACTIVE,
      },
      {
        id: homonymBurialLinkId,
        deceasedId: homonymDeceasedId,
        burialSpaceId: homonymBurialSpaceId,
        burialDate: new Date("2025-09-12T00:00:00.000Z"),
        status: BURIAL_LINK_STATUS.ACTIVE,
      },
    ],
  });
}

async function loadRoutes(): Promise<LocationRoutes> {
  const [collectionRoute, documentRoute, detailRoute] = await Promise.all([
    import("../../app/api/v1/location-search/route"),
    import("../../app/api/v1/location-search/by-document/route"),
    import("../../app/api/v1/location-search/[deceasedId]/route"),
  ]);

  return {
    locationSearchGet: collectionRoute.GET,
    locationSearchByDocumentPost: documentRoute.POST,
    locationSearchDetailGet: detailRoute.GET,
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
  await seedLocationSearch();
});

afterAll(async () => {
  await prisma?.$disconnect();
});

describe("location search API integration", () => {
  it("searches active locations by GET filters and differentiates homonyms with location and dates", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor(integrationEmployeeUser));

    const response = await routes.locationSearchGet(
      new NextRequest(
        requestUrl("/api/v1/location-search?deceasedName=maria&sector=Integration%20Sector%20T147"),
        { method: "GET" },
      ),
    );
    const body = await responseJson<SuccessEnvelope<LocationPageResponse>>(response);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(body).toMatchObject({
      success: true,
      data: {
        page: 1,
        pageSize: 25,
        totalRecords: 2,
        data: expect.arrayContaining([
          expect.objectContaining({
            deceasedId: locatedDeceasedId,
            deceasedName: "INT-T147 Maria Silva",
            deathDate: "2025-08-10",
            burialDate: "2025-08-12",
            locationDescription: expect.stringContaining("Integration Sector T147"),
          }),
          expect.objectContaining({
            deceasedId: homonymDeceasedId,
            deathDate: "2025-09-10",
            burialDate: "2025-09-12",
            locationDescription: expect.stringContaining("Integration Sector T147"),
          }),
        ]),
      },
    });
    expectRequestId(body);
    expectNoFullDocuments(body);
  });

  it("searches exact deceased document only through POST body and returns masked response data", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor(integrationEmployeeUser));

    const searchPath = "/api/v1/location-search/by-document";
    const response = await routes.locationSearchByDocumentPost(
      jsonRequest(searchPath, "POST", {
        documentType: "CPF",
        deceasedDocument: deceasedDocument,
      }),
    );
    const body = await responseJson<SuccessEnvelope<LocationPageResponse>>(response);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(body).toMatchObject({
      success: true,
      data: {
        totalRecords: 1,
        data: [
          expect.objectContaining({
            deceasedId: locatedDeceasedId,
            deceasedDocumentMasked: expect.stringContaining("9015"),
            responsibleName: "INT-T147 Responsible Silva",
            responsibleDocumentMasked: expect.stringContaining("8080"),
          }),
        ],
      },
    });
    expect(requestUrl(searchPath)).not.toContain(deceasedDocument);
    expectLocationItemHasOnlyMaskedDocuments(body.data.data[0]);
    expectNoFullDocuments(body);
  });

  it("returns detail for an active location and has no public unauthenticated access", async () => {
    getServerSessionMock.mockResolvedValueOnce(sessionFor(integrationEmployeeUser));

    const detailResponse = await routes.locationSearchDetailGet(
      new NextRequest(requestUrl(`/api/v1/location-search/${locatedDeceasedId}`), {
        method: "GET",
      }),
      routeContext(locatedDeceasedId),
    );
    const detailBody = await responseJson<SuccessEnvelope<LocationSearchItemDto>>(
      detailResponse,
    );

    expect(detailResponse.status).toBe(HTTP_STATUS.OK);
    expect(detailBody.data).toMatchObject({
      deceasedId: locatedDeceasedId,
      burialSpaceId: locatedBurialSpaceId,
      status: BURIAL_SPACE_STATUS.OCCUPIED,
    });
    expectLocationItemHasOnlyMaskedDocuments(detailBody.data);
    expectNoFullDocuments(detailBody);

    getServerSessionMock.mockResolvedValueOnce(null);

    const unauthenticatedResponse = await routes.locationSearchGet(
      new NextRequest(requestUrl("/api/v1/location-search?deceasedName=maria"), {
        method: "GET",
      }),
    );
    const unauthenticatedBody = await responseJson<ErrorEnvelope>(
      unauthenticatedResponse,
    );

    expect(unauthenticatedResponse.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    expect(unauthenticatedBody).toMatchObject({
      success: false,
      error: { code: DOMAIN_ERROR_CODE.UNAUTHORIZED },
    });
    expectRequestId(unauthenticatedBody);
  });

  it("rejects full document in query string for the POST document endpoint", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor(integrationEmployeeUser));

    const response = await routes.locationSearchByDocumentPost(
      jsonRequest(
        `/api/v1/location-search/by-document?deceasedDocument=${deceasedDocument}`,
        "POST",
        { documentType: "CPF", deceasedDocument },
      ),
    );
    const body = await responseJson<ErrorEnvelope>(response);

    expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(body).toMatchObject({
      success: false,
      error: { code: DOMAIN_ERROR_CODE.VALIDATION_ERROR },
    });
    expectRequestId(body);
    expectNoFullDocuments(body);
  });
});
