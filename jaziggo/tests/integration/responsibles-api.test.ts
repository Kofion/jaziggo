import { loadEnvConfig } from "@next/env";
import type { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { resolveIntegrationDatabaseUrl } from "./setup-database";
import {
  HTTP_STATUS,
  type PaginationMeta,
  type SuccessEnvelope,
} from "../../types/api";
import {
  BURIAL_SPACE_STATUS,
  BURIAL_SPACE_TYPE,
} from "../../types/burial-space";
import {
  LINK_STATUS,
  RESPONSIBLE_LINK_TYPE,
  type ResponsibleDetailDto,
  type ResponsibleLinkDto,
  type ResponsibleListItemDto,
} from "../../types/responsible";
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

type ResponsiblesGet = typeof import("../../app/api/v1/responsibles/route").GET;
type ResponsiblesPost = typeof import("../../app/api/v1/responsibles/route").POST;
type ResponsibleGet = typeof import("../../app/api/v1/responsibles/[id]/route").GET;
type ResponsibleSensitiveSearchPost =
  typeof import("../../app/api/v1/responsibles/search-sensitive/route").POST;
type ResponsibleLinkPost =
  typeof import("../../app/api/v1/responsibles/link/route").POST;
type ResponsibleLinkEndPatch =
  typeof import("../../app/api/v1/responsible-links/[id]/end/route").PATCH;

interface ResponsibleRoutes {
  responsiblesGet: ResponsiblesGet;
  responsiblesPost: ResponsiblesPost;
  responsibleGet: ResponsibleGet;
  responsibleSensitiveSearchPost: ResponsibleSensitiveSearchPost;
  responsibleLinkPost: ResponsibleLinkPost;
  responsibleLinkEndPatch: ResponsibleLinkEndPatch;
}

interface ResponsiblePageResponse extends PaginationMeta {
  data: ResponsibleListItemDto[];
}

interface ResponsibleRouteContext {
  params: Promise<{ id: string }>;
}

const integrationEmployeeUser = {
  id: "00000000-0000-4000-8000-000000000301",
  name: "Responsibles API Employee",
  email: "employee@responsibles-api.integration.test",
  role: USER_ROLE.EMPLOYEE,
  status: USER_STATUS.ACTIVE,
  mustChangePassword: false,
} as const satisfies UserDto;

const existingResponsibleId = "00000000-0000-4000-8000-000000003301";
const linkedResponsibleId = "00000000-0000-4000-8000-000000003302";
const linkedDeceasedId = "00000000-0000-4000-8000-000000006301";
const linkedBurialSpaceId = "00000000-0000-4000-8000-000000005301";
const activeResponsibleLinkId = "00000000-0000-4000-8000-000000008301";
const existingResponsibleDocument = "14330199068";
const existingResponsiblePhone = "5511993010001";
const seededResponsibleIds = [existingResponsibleId, linkedResponsibleId] as const;

let prisma: PrismaClient;
let routes: ResponsibleRoutes;

function requestUrl(path: string): string {
  return `http://localhost${path}`;
}

function jsonRequest(
  path: string,
  method: "POST" | "PATCH",
  body: unknown,
): NextRequest {
  return new NextRequest(requestUrl(path), {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function routeContext(id: string): ResponsibleRouteContext {
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

function expectListItemHasNoContactFields(item: ResponsibleListItemDto): void {
  expect(item).not.toHaveProperty("document");
  expect(item).not.toHaveProperty("phone");
  expect(item).not.toHaveProperty("email");
  expect(item).not.toHaveProperty("address");
}

async function seedResponsibles(): Promise<void> {
  await prisma.responsibleLink.deleteMany({
    where: {
      OR: [
        { id: activeResponsibleLinkId },
        { responsibleId: { in: [...seededResponsibleIds] } },
        { responsible: { fullName: { startsWith: "INT-T143" } } },
        { deceased: { internalCode: { startsWith: "INT-T143" } } },
        { burialSpace: { identifier: { startsWith: "INT-T143" } } },
      ],
    },
  });
  await prisma.burialSpace.deleteMany({
    where: { identifier: { startsWith: "INT-T143" } },
  });
  await prisma.deceased.deleteMany({
    where: { internalCode: { startsWith: "INT-T143" } },
  });
  await prisma.responsible.deleteMany({
    where: {
      OR: [
        { id: { in: [...seededResponsibleIds] } },
        { fullName: { startsWith: "INT-T143" } },
      ],
    },
  });
  await prisma.user.deleteMany({
    where: { email: { endsWith: "@responsibles-api.integration.test" } },
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

  await prisma.responsible.createMany({
    data: [
      {
        id: existingResponsibleId,
        fullName: "INT-T143 Existing Responsible",
        searchName: "int-t143 existing responsible",
        documentType: "CPF",
        document: existingResponsibleDocument,
        phone: existingResponsiblePhone,
        email: "existing@responsibles-api.integration.test",
        address: "Integration Address T143",
      },
      {
        id: linkedResponsibleId,
        fullName: "INT-T143 Linked Responsible",
        searchName: "int-t143 linked responsible",
        document: "14330299011",
        phone: "5511993020002",
      },
    ],
  });

  await prisma.deceased.create({
    data: {
      id: linkedDeceasedId,
      internalCode: "INT-T143-DEC-1",
      fullName: "Integration Responsible Linked Deceased",
      searchName: "integration responsible linked deceased",
      burialDate: new Date("2025-02-10T00:00:00.000Z"),
      datesUnknown: false,
      historicalDataIncomplete: true,
    },
  });

  await prisma.burialSpace.create({
    data: {
      id: linkedBurialSpaceId,
      type: BURIAL_SPACE_TYPE.JAZIGO,
      identifier: "INT-T143-LINKED-JAZIGO",
      locationKey: "sector=integration%20sector%20t143|row=linked",
      sector: "Integration Sector T143",
      row: "Linked",
      number: "143",
      status: BURIAL_SPACE_STATUS.AVAILABLE,
      capacity: 2,
    },
  });

  await prisma.responsibleLink.create({
    data: {
      id: activeResponsibleLinkId,
      responsibleId: linkedResponsibleId,
      linkType: RESPONSIBLE_LINK_TYPE.BURIAL_SPACE,
      burialSpaceId: linkedBurialSpaceId,
      status: LINK_STATUS.ACTIVE,
    },
  });
}

async function loadRoutes(): Promise<ResponsibleRoutes> {
  const [collectionRoute, detailRoute, sensitiveSearchRoute, linkRoute, endRoute] =
    await Promise.all([
      import("../../app/api/v1/responsibles/route"),
      import("../../app/api/v1/responsibles/[id]/route"),
      import("../../app/api/v1/responsibles/search-sensitive/route"),
      import("../../app/api/v1/responsibles/link/route"),
      import("../../app/api/v1/responsible-links/[id]/end/route"),
    ]);

  return {
    responsiblesGet: collectionRoute.GET,
    responsiblesPost: collectionRoute.POST,
    responsibleGet: detailRoute.GET,
    responsibleSensitiveSearchPost: sensitiveSearchRoute.POST,
    responsibleLinkPost: linkRoute.POST,
    responsibleLinkEndPatch: endRoute.PATCH,
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
  await seedResponsibles();
});

afterAll(async () => {
  await prisma?.$disconnect();
});

describe("responsibles API integration", () => {
  it("lets EMPLOYEE create, list and read responsibles without exposing contacts in list DTOs", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor(integrationEmployeeUser));

    const createResponse = await routes.responsiblesPost(
      jsonRequest("/api/v1/responsibles", "POST", {
        fullName: " INT-T143 Created Responsible ",
        documentType: "CPF",
        document: " 14330399075 ",
        phone: " (11) 99303-0003 ",
        email: "CREATED@responsibles-api.integration.test",
        address: " Created Address T143 ",
      }),
    );
    const createBody =
      await responseJson<SuccessEnvelope<ResponsibleListItemDto>>(createResponse);

    expect(createResponse.status).toBe(HTTP_STATUS.CREATED);
    expect(createBody).toMatchObject({
      success: true,
      data: {
        fullName: "INT-T143 Created Responsible",
        documentMasked: expect.stringContaining("9075"),
      },
    });
    expectRequestId(createBody);
    expectListItemHasNoContactFields(createBody.data);

    await expect(
      prisma.responsible.findUniqueOrThrow({
        where: { id: createBody.data.id },
      }),
    ).resolves.toMatchObject({
      fullName: "INT-T143 Created Responsible",
      searchName: "int-t143 created responsible",
      document: "14330399075",
      phone: "11993030003",
      email: "created@responsibles-api.integration.test",
      address: "Created Address T143",
    });

    const listResponse = await routes.responsiblesGet(
      new NextRequest(requestUrl("/api/v1/responsibles?name=created"), {
        method: "GET",
      }),
    );
    const listBody =
      await responseJson<SuccessEnvelope<ResponsiblePageResponse>>(listResponse);

    expect(listResponse.status).toBe(HTTP_STATUS.OK);
    expect(listBody).toMatchObject({
      success: true,
      data: {
        page: 1,
        pageSize: 25,
      },
    });
    expectRequestId(listBody);
    expect(listBody.data.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createBody.data.id,
          fullName: "INT-T143 Created Responsible",
          documentMasked: expect.stringContaining("9075"),
        }),
      ]),
    );
    listBody.data.data.forEach(expectListItemHasNoContactFields);

    const detailResponse = await routes.responsibleGet(
      new NextRequest(requestUrl(`/api/v1/responsibles/${createBody.data.id}`), {
        method: "GET",
      }),
      routeContext(createBody.data.id),
    );
    const detailBody =
      await responseJson<SuccessEnvelope<ResponsibleDetailDto>>(detailResponse);

    expect(detailResponse.status).toBe(HTTP_STATUS.OK);
    expect(detailBody.data).toMatchObject({
      id: createBody.data.id,
      fullName: "INT-T143 Created Responsible",
      phone: "11993030003",
      email: "created@responsibles-api.integration.test",
      address: "Created Address T143",
      links: [],
    });
    expect(detailBody.data).not.toHaveProperty("document");
  });

  it("searches exact responsible document through POST body while keeping the URL and response masked", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor(integrationEmployeeUser));

    const searchPath = "/api/v1/responsibles/search-sensitive";
    const searchResponse = await routes.responsibleSensitiveSearchPost(
      jsonRequest(searchPath, "POST", {
        documentType: "CPF",
        document: existingResponsibleDocument,
      }),
    );
    const searchBody =
      await responseJson<SuccessEnvelope<ResponsiblePageResponse>>(searchResponse);

    expect(searchResponse.status).toBe(HTTP_STATUS.OK);
    expect(searchBody).toMatchObject({
      success: true,
      data: {
        page: 1,
        pageSize: 25,
        totalRecords: 1,
        data: [
          {
            id: existingResponsibleId,
            fullName: "INT-T143 Existing Responsible",
            documentMasked: expect.stringContaining("9068"),
          },
        ],
      },
    });
    expectRequestId(searchBody);
    expect(requestUrl(searchPath)).not.toContain(existingResponsibleDocument);
    expect(JSON.stringify(searchBody)).not.toContain(existingResponsibleDocument);
    searchBody.data.data.forEach(expectListItemHasNoContactFields);
  });

  it("creates a responsible link and ends an active link preserving historical row in PostgreSQL", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor(integrationEmployeeUser));

    const linkResponse = await routes.responsibleLinkPost(
      jsonRequest("/api/v1/responsibles/link", "POST", {
        responsibleId: existingResponsibleId,
        linkType: RESPONSIBLE_LINK_TYPE.DECEASED,
        deceasedId: linkedDeceasedId,
      }),
    );
    const linkBody =
      await responseJson<SuccessEnvelope<ResponsibleLinkDto>>(linkResponse);

    expect(linkResponse.status).toBe(HTTP_STATUS.CREATED);
    expect(linkBody).toMatchObject({
      success: true,
      data: {
        responsibleId: existingResponsibleId,
        linkType: RESPONSIBLE_LINK_TYPE.DECEASED,
        deceasedId: linkedDeceasedId,
        status: LINK_STATUS.ACTIVE,
      },
    });
    expectRequestId(linkBody);

    const endedAt = "2025-03-01T10:00:00.000Z";
    const endReason = "Integration T143 relationship ended";
    const endResponse = await routes.responsibleLinkEndPatch(
      jsonRequest(`/api/v1/responsible-links/${activeResponsibleLinkId}/end`, "PATCH", {
        endedAt,
        endReason,
        confirmation: true,
      }),
      routeContext(activeResponsibleLinkId),
    );
    const endBody =
      await responseJson<SuccessEnvelope<ResponsibleLinkDto>>(endResponse);

    expect(endResponse.status).toBe(HTTP_STATUS.OK);
    expect(endBody).toMatchObject({
      success: true,
      data: {
        id: activeResponsibleLinkId,
        responsibleId: linkedResponsibleId,
        linkType: RESPONSIBLE_LINK_TYPE.BURIAL_SPACE,
        burialSpaceId: linkedBurialSpaceId,
        status: LINK_STATUS.ENDED,
        endedAt,
        endReason,
      },
    });
    expectRequestId(endBody);

    await expect(
      prisma.responsibleLink.count({
        where: { id: activeResponsibleLinkId },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.responsibleLink.findUniqueOrThrow({
        where: { id: activeResponsibleLinkId },
      }),
    ).resolves.toMatchObject({
      status: LINK_STATUS.ENDED,
      endedAt: new Date(endedAt),
      endReason,
      responsibleId: linkedResponsibleId,
      burialSpaceId: linkedBurialSpaceId,
    });
  });
});
