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
import type {
  DeceasedDetailDto,
  DeceasedDuplicateCandidateDto,
  DeceasedListItemDto,
} from "../../types/deceased";
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

type DeceasedGet = typeof import("../../app/api/v1/deceased/route").GET;
type DeceasedPost = typeof import("../../app/api/v1/deceased/route").POST;
type DeceasedDetailGet = typeof import("../../app/api/v1/deceased/[id]/route").GET;
type DeceasedDuplicatePost =
  typeof import("../../app/api/v1/deceased/check-duplicates/route").POST;

interface DeceasedRoutes {
  deceasedGet: DeceasedGet;
  deceasedPost: DeceasedPost;
  deceasedDetailGet: DeceasedDetailGet;
  deceasedDuplicatePost: DeceasedDuplicatePost;
}

interface DeceasedPageResponse extends PaginationMeta {
  data: DeceasedListItemDto[];
}

interface DeceasedDuplicatePageResponse extends PaginationMeta {
  data: DeceasedDuplicateCandidateDto[];
}

interface DeceasedRouteContext {
  params: Promise<{ id: string }>;
}

const integrationEmployeeUser = {
  id: "00000000-0000-4000-8000-000000000401",
  name: "Deceased API Employee",
  email: "employee@deceased-api.integration.test",
  role: USER_ROLE.EMPLOYEE,
  status: USER_STATUS.ACTIVE,
  mustChangePassword: false,
} as const satisfies UserDto;

const duplicateCandidateId = "00000000-0000-4000-8000-000000006401";
const duplicateCandidateDocument = "14440199020";

let prisma: PrismaClient;
let routes: DeceasedRoutes;

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

function routeContext(id: string): DeceasedRouteContext {
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

function expectNoFullDocument(item: DeceasedListItemDto | DeceasedDetailDto): void {
  expect(item).not.toHaveProperty("document");
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

async function seedDeceased(): Promise<void> {
  await prisma.burialLink.deleteMany({
    where: { deceased: { fullName: { startsWith: "INT-T144" } } },
  });
  await prisma.responsibleLink.deleteMany({
    where: { deceased: { fullName: { startsWith: "INT-T144" } } },
  });
  await prisma.deceased.deleteMany({
    where: {
      OR: [
        { id: duplicateCandidateId },
        { fullName: { startsWith: "INT-T144" } },
        { internalCode: { startsWith: "INT-T144" } },
        { document: { in: [duplicateCandidateDocument, "14440299083", "14440399037"] } },
      ],
    },
  });
  await prisma.user.deleteMany({
    where: { email: { endsWith: "@deceased-api.integration.test" } },
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

  await prisma.deceased.create({
    data: {
      id: duplicateCandidateId,
      internalCode: "INT-T144-DUPLICATE-1",
      fullName: "INT-T144 Duplicate Candidate",
      searchName: "int-t144 duplicate candidate",
      documentType: "CPF",
        document: duplicateCandidateDocument,
      birthDate: new Date("1940-01-05T00:00:00.000Z"),
      deathDate: new Date("2025-04-10T00:00:00.000Z"),
      burialDate: new Date("2025-04-12T00:00:00.000Z"),
      datesUnknown: false,
      historicalDataIncomplete: false,
      notes: "Integration duplicate candidate",
    },
  });
}

async function loadRoutes(): Promise<DeceasedRoutes> {
  const [collectionRoute, detailRoute, duplicateRoute] = await Promise.all([
    import("../../app/api/v1/deceased/route"),
    import("../../app/api/v1/deceased/[id]/route"),
    import("../../app/api/v1/deceased/check-duplicates/route"),
  ]);

  return {
    deceasedGet: collectionRoute.GET,
    deceasedPost: collectionRoute.POST,
    deceasedDetailGet: detailRoute.GET,
    deceasedDuplicatePost: duplicateRoute.POST,
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
  await seedDeceased();
});

afterAll(async () => {
  await prisma?.$disconnect();
});

describe("deceased API integration", () => {
  it("creates, lists and reads a complete deceased record with persisted internalCode and known dates", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor(integrationEmployeeUser));

    const createResponse = await routes.deceasedPost(
      jsonRequest("/api/v1/deceased", "POST", {
        fullName: " INT-T144 Complete Deceased ",
        documentType: "CPF",
        document: " 144.402.990-83 ",
        birthDate: "1942-02-03",
        deathDate: "2025-05-10",
        burialDate: "2025-05-12",
        notes: " Complete record for integration T144 ",
      }),
    );
    const createBody =
      await responseJson<SuccessEnvelope<DeceasedDetailDto>>(createResponse);

    expect(createResponse.status).toBe(HTTP_STATUS.CREATED);
    expect(createBody).toMatchObject({
      success: true,
      data: {
        fullName: "INT-T144 Complete Deceased",
        documentMasked: expect.stringContaining("9083"),
        birthDate: "1942-02-03",
        deathDate: "2025-05-10",
        burialDate: "2025-05-12",
        historicalDataIncomplete: false,
        datesUnknown: false,
        notes: "Complete record for integration T144",
      },
    });
    expect(createBody.data.internalCode).toMatch(/^JZG-\d{8}-[A-Z0-9]{12}$/);
    expectRequestId(createBody);
    expectNoFullDocument(createBody.data);

    await expect(
      prisma.deceased.findUniqueOrThrow({
        where: { id: createBody.data.id },
      }),
    ).resolves.toMatchObject({
      internalCode: createBody.data.internalCode,
      fullName: "INT-T144 Complete Deceased",
      searchName: "int-t144 complete deceased",
      document: "14440299083",
      birthDate: new Date("1942-02-03T00:00:00.000Z"),
      deathDate: new Date("2025-05-10T00:00:00.000Z"),
      burialDate: new Date("2025-05-12T00:00:00.000Z"),
      datesUnknown: false,
      historicalDataIncomplete: false,
      notes: "Complete record for integration T144",
    });

    const listResponse = await routes.deceasedGet(
      new NextRequest(requestUrl("/api/v1/deceased?name=complete"), {
        method: "GET",
      }),
    );
    const listBody =
      await responseJson<SuccessEnvelope<DeceasedPageResponse>>(listResponse);

    expect(listResponse.status).toBe(HTTP_STATUS.OK);
    expect(listBody.data.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createBody.data.id,
          internalCode: createBody.data.internalCode,
          fullName: "INT-T144 Complete Deceased",
          documentMasked: expect.stringContaining("9083"),
          deathDate: "2025-05-10",
          burialDate: "2025-05-12",
          historicalDataIncomplete: false,
        }),
      ]),
    );
    listBody.data.data.forEach(expectNoFullDocument);

    const detailResponse = await routes.deceasedDetailGet(
      new NextRequest(requestUrl(`/api/v1/deceased/${createBody.data.id}`), {
        method: "GET",
      }),
      routeContext(createBody.data.id),
    );
    const detailBody =
      await responseJson<SuccessEnvelope<DeceasedDetailDto & { links: unknown[] }>>(
        detailResponse,
      );

    expect(detailResponse.status).toBe(HTTP_STATUS.OK);
    expect(detailBody.data).toMatchObject({
      id: createBody.data.id,
      internalCode: createBody.data.internalCode,
      datesUnknown: false,
      links: [],
    });
    expectNoFullDocument(detailBody.data);
  });

  it("creates a historical incomplete deceased record with unknown dates and null persisted dates", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor(integrationEmployeeUser));

    const createResponse = await routes.deceasedPost(
      jsonRequest("/api/v1/deceased", "POST", {
        fullName: " INT-T144 Historical Deceased ",
        datesUnknown: true,
      }),
    );
    const createBody =
      await responseJson<SuccessEnvelope<DeceasedDetailDto>>(createResponse);

    expect(createResponse.status).toBe(HTTP_STATUS.CREATED);
    expect(createBody).toMatchObject({
      success: true,
      data: {
        fullName: "INT-T144 Historical Deceased",
        historicalDataIncomplete: true,
        datesUnknown: true,
      },
    });
    expect(createBody.data.internalCode).toMatch(/^JZG-\d{8}-[A-Z0-9]{12}$/);
    expect(createBody.data).not.toHaveProperty("documentMasked");
    expect(createBody.data).not.toHaveProperty("birthDate");
    expect(createBody.data).not.toHaveProperty("deathDate");
    expect(createBody.data).not.toHaveProperty("burialDate");
    expectRequestId(createBody);

    await expect(
      prisma.deceased.findUniqueOrThrow({
        where: { id: createBody.data.id },
      }),
    ).resolves.toMatchObject({
      internalCode: createBody.data.internalCode,
      fullName: "INT-T144 Historical Deceased",
      document: null,
      birthDate: null,
      deathDate: null,
      burialDate: null,
      datesUnknown: true,
      historicalDataIncomplete: true,
    });
  });

  it("returns 422 for invalid date combinations without writing invalid deceased records", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor(integrationEmployeeUser));

    const missingDatesResponse = await routes.deceasedPost(
      jsonRequest("/api/v1/deceased", "POST", {
        fullName: "INT-T144 Invalid Missing Dates",
      }),
    );
    const missingDatesBody = await responseJson<ErrorEnvelope>(missingDatesResponse);

    expect(missingDatesResponse.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expectErrorEnvelope(missingDatesBody, DOMAIN_ERROR_CODE.VALIDATION_ERROR);

    const invertedDatesResponse = await routes.deceasedPost(
      jsonRequest("/api/v1/deceased", "POST", {
        fullName: "INT-T144 Invalid Inverted Dates",
        deathDate: "2025-05-10",
        burialDate: "2025-05-09",
      }),
    );
    const invertedDatesBody = await responseJson<ErrorEnvelope>(invertedDatesResponse);

    expect(invertedDatesResponse.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expectErrorEnvelope(invertedDatesBody, DOMAIN_ERROR_CODE.VALIDATION_ERROR);

    await expect(
      prisma.deceased.count({
        where: { fullName: { startsWith: "INT-T144 Invalid" } },
      }),
    ).resolves.toBe(0);
  });

  it("returns duplicate candidates as an alert without blocking a valid homonym registration", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor(integrationEmployeeUser));

    const duplicateResponse = await routes.deceasedDuplicatePost(
      jsonRequest("/api/v1/deceased/check-duplicates", "POST", {
        fullName: " INT-T144 Duplicate Candidate ",
        documentType: "CPF",
        document: duplicateCandidateDocument,
        deathDate: "2025-04-10",
      }),
    );
    const duplicateBody =
      await responseJson<SuccessEnvelope<DeceasedDuplicatePageResponse>>(
        duplicateResponse,
      );

    expect(duplicateResponse.status).toBe(HTTP_STATUS.OK);
    expect(duplicateBody).toMatchObject({
      success: true,
      data: {
        page: 1,
        pageSize: 25,
        totalRecords: 1,
        data: [
          {
            id: duplicateCandidateId,
            internalCode: "INT-T144-DUPLICATE-1",
            fullName: "INT-T144 Duplicate Candidate",
            documentMasked: expect.stringContaining("9020"),
            birthDate: "1940-01-05",
            deathDate: "2025-04-10",
            burialDate: "2025-04-12",
            historicalDataIncomplete: false,
          },
        ],
      },
    });
    expectRequestId(duplicateBody);
    expect(JSON.stringify(duplicateBody)).not.toContain(duplicateCandidateDocument);
    duplicateBody.data.data.forEach(expectNoFullDocument);

    const homonymCreateResponse = await routes.deceasedPost(
      jsonRequest("/api/v1/deceased", "POST", {
        fullName: "INT-T144 Duplicate Candidate",
        documentType: "CPF",
        document: "14440399037",
        deathDate: "2025-04-10",
      }),
    );
    const homonymCreateBody =
      await responseJson<SuccessEnvelope<DeceasedDetailDto>>(homonymCreateResponse);

    expect(homonymCreateResponse.status).toBe(HTTP_STATUS.CREATED);
    expect(homonymCreateBody.data).toMatchObject({
      fullName: "INT-T144 Duplicate Candidate",
      documentMasked: expect.stringContaining("9037"),
      deathDate: "2025-04-10",
      historicalDataIncomplete: false,
    });
    expect(homonymCreateBody.data.internalCode).toMatch(/^JZG-\d{8}-[A-Z0-9]{12}$/);
    expectNoFullDocument(homonymCreateBody.data);
  });
});
