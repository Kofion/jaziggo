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
import { BURIAL_LINK_STATUS } from "../../types/burial-link";
import {
  BURIAL_SPACE_STATUS,
  BURIAL_SPACE_TYPE,
} from "../../types/burial-space";
import type {
  BurialsByPeriodReportDto,
  DeceasedReportDto,
  SpaceOccupationReportDto,
  SpaceStatusReportDto,
} from "../../types/report";
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

type DeceasedReportGet = typeof import("../../app/api/v1/reports/deceased/route").GET;
type BurialsByPeriodReportGet =
  typeof import("../../app/api/v1/reports/burials-by-period/route").GET;
type SpaceOccupationReportGet =
  typeof import("../../app/api/v1/reports/space-occupation/route").GET;
type SpaceStatusReportGet =
  typeof import("../../app/api/v1/reports/space-status/route").GET;

interface ReportRoutes {
  deceasedReportGet: DeceasedReportGet;
  burialsByPeriodReportGet: BurialsByPeriodReportGet;
  spaceOccupationReportGet: SpaceOccupationReportGet;
  spaceStatusReportGet: SpaceStatusReportGet;
}

const integrationAdminUser = {
  id: "00000000-0000-4000-8000-000000000801",
  name: "Reports API Admin",
  email: "admin@reports-api.integration.test",
  role: USER_ROLE.ADMIN,
  status: USER_STATUS.ACTIVE,
} as const satisfies UserDto;

const integrationEmployeeUser = {
  id: "00000000-0000-4000-8000-000000000802",
  name: "Reports API Employee",
  email: "employee@reports-api.integration.test",
  role: USER_ROLE.EMPLOYEE,
  status: USER_STATUS.ACTIVE,
} as const satisfies UserDto;

const deceasedIds = [
  "00000000-0000-4000-8000-000000006801",
  "00000000-0000-4000-8000-000000006802",
] as const;
const burialSpaceIds = [
  "00000000-0000-4000-8000-000000005801",
  "00000000-0000-4000-8000-000000005802",
] as const;
const burialLinkIds = [
  "00000000-0000-4000-8000-000000007801",
  "00000000-0000-4000-8000-000000007802",
] as const;
const deceasedDocument = "14880199001";

let prisma: PrismaClient;
let routes: ReportRoutes;

function requestUrl(path: string): string {
  return `http://localhost${path}`;
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

function expectNoFullDocument(value: unknown): void {
  expect(JSON.stringify(value)).not.toContain(deceasedDocument);
}

async function seedReports(): Promise<void> {
  await prisma.burialLink.deleteMany({
    where: {
      OR: [
        { id: { in: [...burialLinkIds] } },
        { deceased: { internalCode: { startsWith: "INT-T148" } } },
        { burialSpace: { identifier: { startsWith: "INT-T148" } } },
      ],
    },
  });
  await prisma.burialSpace.deleteMany({
    where: {
      OR: [
        { id: { in: [...burialSpaceIds] } },
        { identifier: { startsWith: "INT-T148" } },
      ],
    },
  });
  await prisma.deceased.deleteMany({
    where: {
      OR: [
        { id: { in: [...deceasedIds] } },
        { internalCode: { startsWith: "INT-T148" } },
        { document: deceasedDocument },
      ],
    },
  });
  await prisma.user.deleteMany({
    where: { email: { endsWith: "@reports-api.integration.test" } },
  });

  await prisma.user.createMany({
    data: [
      {
        id: integrationAdminUser.id,
        name: integrationAdminUser.name,
        email: integrationAdminUser.email,
        passwordHash: "integration-test-password-hash",
        role: USER_ROLE.ADMIN,
        status: USER_STATUS.ACTIVE,
      },
      {
        id: integrationEmployeeUser.id,
        name: integrationEmployeeUser.name,
        email: integrationEmployeeUser.email,
        passwordHash: "integration-test-password-hash",
        role: USER_ROLE.EMPLOYEE,
        status: USER_STATUS.ACTIVE,
      },
    ],
  });

  await prisma.deceased.createMany({
    data: [
      {
        id: deceasedIds[0],
        internalCode: "INT-T148-DEC-1",
        fullName: "INT-T148 Report Deceased One",
        searchName: "int-t148 report deceased one",
        document: deceasedDocument,
        deathDate: new Date("2025-10-10T00:00:00.000Z"),
        burialDate: new Date("2025-10-12T00:00:00.000Z"),
        datesUnknown: false,
        historicalDataIncomplete: false,
        createdAt: new Date("2025-10-01T12:00:00.000Z"),
      },
      {
        id: deceasedIds[1],
        internalCode: "INT-T148-DEC-2",
        fullName: "INT-T148 Report Deceased Two",
        searchName: "int-t148 report deceased two",
        deathDate: new Date("2025-11-10T00:00:00.000Z"),
        burialDate: new Date("2025-11-12T00:00:00.000Z"),
        datesUnknown: false,
        historicalDataIncomplete: true,
        createdAt: new Date("2025-11-01T12:00:00.000Z"),
      },
    ],
  });

  await prisma.burialSpace.createMany({
    data: [
      {
        id: burialSpaceIds[0],
        type: BURIAL_SPACE_TYPE.SEPULTURA,
        identifier: "INT-T148-SEP-OCCUPIED",
        locationKey: "sector=integration%20sector%20t148|row=a|number=1",
        sector: "Integration Sector T148",
        row: "A",
        number: "1",
        status: BURIAL_SPACE_STATUS.OCCUPIED,
        capacity: 1,
      },
      {
        id: burialSpaceIds[1],
        type: BURIAL_SPACE_TYPE.JAZIGO,
        identifier: "INT-T148-JAZ-AVAILABLE",
        locationKey: "sector=integration%20sector%20t148|row=b|number=2",
        sector: "Integration Sector T148",
        row: "B",
        number: "2",
        status: BURIAL_SPACE_STATUS.AVAILABLE,
        capacity: 3,
      },
    ],
  });

  await prisma.burialLink.createMany({
    data: [
      {
        id: burialLinkIds[0],
        deceasedId: deceasedIds[0],
        burialSpaceId: burialSpaceIds[0],
        burialDate: new Date("2025-10-12T00:00:00.000Z"),
        status: BURIAL_LINK_STATUS.ACTIVE,
      },
      {
        id: burialLinkIds[1],
        deceasedId: deceasedIds[1],
        burialSpaceId: burialSpaceIds[1],
        burialDate: new Date("2025-11-12T00:00:00.000Z"),
        status: BURIAL_LINK_STATUS.ENDED,
        endedAt: new Date("2025-12-01T10:00:00.000Z"),
        endReason: "Integration T148 ended link",
      },
    ],
  });
}

async function loadRoutes(): Promise<ReportRoutes> {
  const [deceasedRoute, burialsRoute, occupationRoute, statusRoute] =
    await Promise.all([
      import("../../app/api/v1/reports/deceased/route"),
      import("../../app/api/v1/reports/burials-by-period/route"),
      import("../../app/api/v1/reports/space-occupation/route"),
      import("../../app/api/v1/reports/space-status/route"),
    ]);

  return {
    deceasedReportGet: deceasedRoute.GET,
    burialsByPeriodReportGet: burialsRoute.GET,
    spaceOccupationReportGet: occupationRoute.GET,
    spaceStatusReportGet: statusRoute.GET,
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
  await seedReports();
});

afterAll(async () => {
  await prisma?.$disconnect();
});

describe("reports API integration", () => {
  it("lets ADMIN view deceased and burials reports with masked documents", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor(integrationAdminUser));

    const deceasedResponse = await routes.deceasedReportGet(
      new NextRequest(
        requestUrl("/api/v1/reports/deceased?startDate=2025-10-01&endDate=2025-10-31"),
        { method: "GET" },
      ),
    );
    const deceasedBody = await responseJson<SuccessEnvelope<DeceasedReportDto>>(
      deceasedResponse,
    );

    expect(deceasedResponse.status).toBe(HTTP_STATUS.OK);
    expect(deceasedBody).toMatchObject({
      success: true,
      data: {
        title: "Falecidos cadastrados",
        totalRecords: 1,
        data: [
          expect.objectContaining({
            id: deceasedIds[0],
            internalCode: "INT-T148-DEC-1",
            documentMasked: expect.stringContaining("9001"),
          }),
        ],
      },
    });
    expectRequestId(deceasedBody);
    expectNoFullDocument(deceasedBody);

    const burialsResponse = await routes.burialsByPeriodReportGet(
      new NextRequest(
        requestUrl("/api/v1/reports/burials-by-period?startDate=2025-10-01&endDate=2025-10-31"),
        { method: "GET" },
      ),
    );
    const burialsBody =
      await responseJson<SuccessEnvelope<BurialsByPeriodReportDto>>(burialsResponse);

    expect(burialsResponse.status).toBe(HTTP_STATUS.OK);
    expect(burialsBody).toMatchObject({
      success: true,
      data: {
        title: "Sepultamentos por período",
        totalRecords: 1,
        data: [
          expect.objectContaining({
            burialLinkId: burialLinkIds[0],
            deceasedId: deceasedIds[0],
            deceasedDocumentMasked: expect.stringContaining("9001"),
            burialSpaceIdentifier: "INT-T148-SEP-OCCUPIED",
          }),
        ],
      },
    });
    expectRequestId(burialsBody);
    expectNoFullDocument(burialsBody);
  });

  it("lets ADMIN view occupation and status reports against seeded spaces", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor(integrationAdminUser));

    const occupationResponse = await routes.spaceOccupationReportGet(
      new NextRequest(
        requestUrl("/api/v1/reports/space-occupation?sector=Integration%20Sector%20T148"),
        { method: "GET" },
      ),
    );
    const occupationBody =
      await responseJson<SuccessEnvelope<SpaceOccupationReportDto>>(
        occupationResponse,
      );

    expect(occupationResponse.status).toBe(HTTP_STATUS.OK);
    expect(occupationBody).toMatchObject({
      success: true,
      data: {
        title: "Ocupação dos espaços",
        totalRecords: 2,
        data: expect.arrayContaining([
          expect.objectContaining({
            burialSpaceId: burialSpaceIds[0],
            activeLinkCount: 1,
            availableCapacity: 0,
          }),
          expect.objectContaining({
            burialSpaceId: burialSpaceIds[1],
            activeLinkCount: 0,
            availableCapacity: 3,
          }),
        ]),
      },
    });
    expectRequestId(occupationBody);

    const statusResponse = await routes.spaceStatusReportGet(
      new NextRequest(
        requestUrl("/api/v1/reports/space-status?status=OCCUPIED&sector=Integration%20Sector%20T148"),
        { method: "GET" },
      ),
    );
    const statusBody = await responseJson<SuccessEnvelope<SpaceStatusReportDto>>(
      statusResponse,
    );

    expect(statusResponse.status).toBe(HTTP_STATUS.OK);
    expect(statusBody).toMatchObject({
      success: true,
      data: {
        title: "Espaços por status",
        totalRecords: 1,
        data: [
          expect.objectContaining({
            burialSpaceId: burialSpaceIds[0],
            status: BURIAL_SPACE_STATUS.OCCUPIED,
            activeLinkCount: 1,
          }),
        ],
      },
    });
    expectRequestId(statusBody);
  });

  it("returns report empty state for ADMIN when filters match no rows", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor(integrationAdminUser));

    const response = await routes.deceasedReportGet(
      new NextRequest(
        requestUrl("/api/v1/reports/deceased?startDate=2030-01-01&endDate=2030-01-31"),
        { method: "GET" },
      ),
    );
    const body = await responseJson<SuccessEnvelope<DeceasedReportDto>>(response);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(body).toMatchObject({
      success: true,
      data: {
        totalRecords: 0,
        totalPages: 0,
        data: [],
        emptyMessage: "Nenhum falecido encontrado para os filtros selecionados.",
      },
    });
    expectRequestId(body);
  });

  it("rejects EMPLOYEE from administrative reports", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor(integrationEmployeeUser));

    const response = await routes.deceasedReportGet(
      new NextRequest(requestUrl("/api/v1/reports/deceased"), { method: "GET" }),
    );
    const body = await responseJson<ErrorEnvelope>(response);

    expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
    expect(body).toMatchObject({
      success: false,
      error: { code: DOMAIN_ERROR_CODE.FORBIDDEN },
    });
    expectRequestId(body);
  });
});