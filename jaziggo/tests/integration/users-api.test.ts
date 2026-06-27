import { argon2id, hash } from "argon2";
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

type UsersGet = typeof import("../../app/api/v1/users/route").GET;
type UsersPost = typeof import("../../app/api/v1/users/route").POST;
type UserGet = typeof import("../../app/api/v1/users/[id]/route").GET;
type UserPut = typeof import("../../app/api/v1/users/[id]/route").PUT;
type UserDeactivatePatch =
  typeof import("../../app/api/v1/users/[id]/deactivate/route").PATCH;

interface UserPageResponse extends PaginationMeta {
  data: UserDto[];
}

interface UserRoutes {
  usersGet: UsersGet;
  usersPost: UsersPost;
  userGet: UserGet;
  userPut: UserPut;
  userDeactivatePatch: UserDeactivatePatch;
}

interface UserRouteContext {
  params: Promise<{ id: string }>;
}

const INTEGRATION_USER_PASSWORD = "users-api-test-password";
const integrationAdminUser = {
  id: "00000000-0000-4000-8000-000000000101",
  name: "Users API Administrator",
  email: "admin@users-api.integration.test",
  role: USER_ROLE.ADMIN,
  status: USER_STATUS.ACTIVE,
} as const satisfies UserDto;
const integrationEmployeeUser = {
  id: "00000000-0000-4000-8000-000000000102",
  name: "Users API Employee",
  email: "employee@users-api.integration.test",
  role: USER_ROLE.EMPLOYEE,
  status: USER_STATUS.ACTIVE,
} as const satisfies UserDto;
const integrationInactiveEmployeeUser = {
  id: "00000000-0000-4000-8000-000000000103",
  name: "Users API Inactive Employee",
  email: "inactive.employee@users-api.integration.test",
  role: USER_ROLE.EMPLOYEE,
  status: USER_STATUS.INACTIVE,
} as const satisfies UserDto;

let prisma: PrismaClient;
let routes: UserRoutes;
let fixturePasswordHash: string;

function requestUrl(path: string): string {
  return `http://localhost${path}`;
}

function jsonRequest(path: string, method: "POST" | "PUT", body: unknown): NextRequest {
  return new NextRequest(requestUrl(path), {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function routeContext(id: string): UserRouteContext {
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

function expectNoSensitiveUserFields(user: UserDto): void {
  expect(user).not.toHaveProperty("password");
  expect(user).not.toHaveProperty("passwordHash");
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

async function seedUsers(): Promise<void> {
  fixturePasswordHash ??= await hash(INTEGRATION_USER_PASSWORD, {
    type: argon2id,
    memoryCost: 65_536,
    timeCost: 3,
    parallelism: 1,
  });

  await prisma.user.deleteMany({
    where: {
      email: { endsWith: "@users-api.integration.test" },
    },
  });

  await prisma.user.createMany({
    data: [
      {
        id: integrationAdminUser.id,
        name: integrationAdminUser.name,
        email: integrationAdminUser.email,
        passwordHash: fixturePasswordHash,
        role: USER_ROLE.ADMIN,
        status: USER_STATUS.ACTIVE,
      },
      {
        id: integrationEmployeeUser.id,
        name: integrationEmployeeUser.name,
        email: integrationEmployeeUser.email,
        passwordHash: fixturePasswordHash,
        role: USER_ROLE.EMPLOYEE,
        status: USER_STATUS.ACTIVE,
      },
      {
        id: integrationInactiveEmployeeUser.id,
        name: integrationInactiveEmployeeUser.name,
        email: integrationInactiveEmployeeUser.email,
        passwordHash: fixturePasswordHash,
        role: USER_ROLE.EMPLOYEE,
        status: USER_STATUS.INACTIVE,
      },
    ],
  });
}

async function loadRoutes(): Promise<UserRoutes> {
  const [usersRoute, userRoute, deactivateRoute] = await Promise.all([
    import("../../app/api/v1/users/route"),
    import("../../app/api/v1/users/[id]/route"),
    import("../../app/api/v1/users/[id]/deactivate/route"),
  ]);

  return {
    usersGet: usersRoute.GET,
    usersPost: usersRoute.POST,
    userGet: userRoute.GET,
    userPut: userRoute.PUT,
    userDeactivatePatch: deactivateRoute.PATCH,
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
  await seedUsers();
});

afterAll(async () => {
  await prisma?.$disconnect();
});

describe("users API integration", () => {
  it("lets ADMIN create, list, read, update and deactivate persisted users", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor(integrationAdminUser));

    const createResponse = await routes.usersPost(
      jsonRequest("/api/v1/users", "POST", {
        name: " Created Integration User ",
        email: "CREATED.USER@users-api.integration.test",
        password: "created-user-password",
        role: USER_ROLE.EMPLOYEE,
      }),
    );
    const createBody = await responseJson<SuccessEnvelope<UserDto>>(createResponse);

    expect(createResponse.status).toBe(HTTP_STATUS.CREATED);
    expect(createBody).toMatchObject({
      success: true,
      data: {
        name: "Created Integration User",
        email: "created.user@users-api.integration.test",
        role: USER_ROLE.EMPLOYEE,
        status: USER_STATUS.ACTIVE,
      },
    });
    expectRequestId(createBody);
    expectNoSensitiveUserFields(createBody.data);

    const persistedCreatedUser = await prisma.user.findUniqueOrThrow({
      where: { id: createBody.data.id },
    });

    expect(persistedCreatedUser.email).toBe("created.user@users-api.integration.test");
    expect(persistedCreatedUser.passwordHash).toEqual(expect.any(String));
    expect(persistedCreatedUser.passwordHash).not.toBe("created-user-password");

    const listResponse = await routes.usersGet(
      new NextRequest(requestUrl("/api/v1/users?role=EMPLOYEE&status=ACTIVE"), {
        method: "GET",
      }),
    );
    const listBody = await responseJson<SuccessEnvelope<UserPageResponse>>(listResponse);

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
          id: integrationEmployeeUser.id,
          role: USER_ROLE.EMPLOYEE,
          status: USER_STATUS.ACTIVE,
        }),
        expect.objectContaining({
          id: createBody.data.id,
          role: USER_ROLE.EMPLOYEE,
          status: USER_STATUS.ACTIVE,
        }),
      ]),
    );
    listBody.data.data.forEach(expectNoSensitiveUserFields);

    const detailResponse = await routes.userGet(
      new NextRequest(requestUrl(`/api/v1/users/${createBody.data.id}`), {
        method: "GET",
      }),
      routeContext(createBody.data.id),
    );
    const detailBody = await responseJson<SuccessEnvelope<UserDto>>(detailResponse);

    expect(detailResponse.status).toBe(HTTP_STATUS.OK);
    expect(detailBody.data).toMatchObject({
      id: createBody.data.id,
      email: "created.user@users-api.integration.test",
      status: USER_STATUS.ACTIVE,
    });
    expectNoSensitiveUserFields(detailBody.data);

    const updateResponse = await routes.userPut(
      jsonRequest(`/api/v1/users/${createBody.data.id}`, "PUT", {
        name: "Updated Integration Admin",
        email: "updated.admin@users-api.integration.test",
        role: USER_ROLE.ADMIN,
      }),
      routeContext(createBody.data.id),
    );
    const updateBody = await responseJson<SuccessEnvelope<UserDto>>(updateResponse);

    expect(updateResponse.status).toBe(HTTP_STATUS.OK);
    expect(updateBody.data).toMatchObject({
      id: createBody.data.id,
      name: "Updated Integration Admin",
      email: "updated.admin@users-api.integration.test",
      role: USER_ROLE.ADMIN,
      status: USER_STATUS.ACTIVE,
    });
    expectNoSensitiveUserFields(updateBody.data);

    await expect(
      prisma.user.findUniqueOrThrow({
        where: { id: createBody.data.id },
      }),
    ).resolves.toMatchObject({
      name: "Updated Integration Admin",
      email: "updated.admin@users-api.integration.test",
      role: USER_ROLE.ADMIN,
      status: USER_STATUS.ACTIVE,
    });

    const deactivateResponse = await routes.userDeactivatePatch(
      new NextRequest(requestUrl(`/api/v1/users/${createBody.data.id}/deactivate`), {
        method: "PATCH",
      }),
      routeContext(createBody.data.id),
    );
    const deactivateBody =
      await responseJson<SuccessEnvelope<{ acknowledged: true }>>(deactivateResponse);

    expect(deactivateResponse.status).toBe(HTTP_STATUS.OK);
    expect(deactivateBody).toMatchObject({
      success: true,
      data: { acknowledged: true },
    });
    expectRequestId(deactivateBody);

    await expect(
      prisma.user.findUniqueOrThrow({
        where: { id: createBody.data.id },
      }),
    ).resolves.toMatchObject({
      status: USER_STATUS.INACTIVE,
    });
  });

  it("returns 409 and preserves the original user when ADMIN creates a duplicate email", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor(integrationAdminUser));

    const response = await routes.usersPost(
      jsonRequest("/api/v1/users", "POST", {
        name: "Duplicate Administrator",
        email: integrationAdminUser.email.toUpperCase(),
        password: "duplicate-password",
        role: USER_ROLE.ADMIN,
      }),
    );
    const body = await responseJson<ErrorEnvelope>(response);

    expect(response.status).toBe(HTTP_STATUS.CONFLICT);
    expectErrorEnvelope(body, DOMAIN_ERROR_CODE.CONFLICT);

    await expect(
      prisma.user.count({
        where: { email: integrationAdminUser.email },
      }),
    ).resolves.toBe(1);
  });

  it("returns 403 when EMPLOYEE attempts user management endpoints", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor(integrationEmployeeUser));

    const listResponse = await routes.usersGet(
      new NextRequest(requestUrl("/api/v1/users"), { method: "GET" }),
    );
    const createResponse = await routes.usersPost(
      jsonRequest("/api/v1/users", "POST", {
        name: "Forbidden User",
        email: "forbidden.user@users-api.integration.test",
        password: "forbidden-password",
        role: USER_ROLE.EMPLOYEE,
      }),
    );
    const detailResponse = await routes.userGet(
      new NextRequest(requestUrl(`/api/v1/users/${integrationAdminUser.id}`), {
        method: "GET",
      }),
      routeContext(integrationAdminUser.id),
    );
    const updateResponse = await routes.userPut(
      jsonRequest(`/api/v1/users/${integrationAdminUser.id}`, "PUT", {
        name: "Forbidden Rename",
      }),
      routeContext(integrationAdminUser.id),
    );
    const deactivateResponse = await routes.userDeactivatePatch(
      new NextRequest(requestUrl(`/api/v1/users/${integrationAdminUser.id}/deactivate`), {
        method: "PATCH",
      }),
      routeContext(integrationAdminUser.id),
    );

    for (const response of [
      listResponse,
      createResponse,
      detailResponse,
      updateResponse,
      deactivateResponse,
    ]) {
      const body = await responseJson<ErrorEnvelope>(response);

      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
      expectErrorEnvelope(body, DOMAIN_ERROR_CODE.FORBIDDEN);
    }

    await expect(
      prisma.user.findUniqueOrThrow({
        where: { id: integrationAdminUser.id },
      }),
    ).resolves.toMatchObject({
      name: integrationAdminUser.name,
      status: USER_STATUS.ACTIVE,
    });
    await expect(
      prisma.user.findUnique({
        where: { email: "forbidden.user@users-api.integration.test" },
      }),
    ).resolves.toBeNull();
  });
});


