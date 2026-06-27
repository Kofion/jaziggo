import { argon2id, hash } from "argon2";
import { loadEnvConfig } from "@next/env";
import type { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { resolveIntegrationDatabaseUrl } from "./setup-database";
import {
  activeEmployeeUserFixture,
  adminUserFixture,
  inactiveEmployeeUserFixture,
  TEST_USER_PASSWORD,
} from "../fixtures/users";
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type ErrorEnvelope,
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

type LoginPost = typeof import("../../app/api/v1/auth/login/route").POST;
type LogoutPost = typeof import("../../app/api/v1/auth/logout/route").POST;
type MeGet = typeof import("../../app/api/v1/auth/me/route").GET;
type UsersGet = typeof import("../../app/api/v1/users/route").GET;

interface AuthRoutes {
  loginPost: LoginPost;
  logoutPost: LogoutPost;
  meGet: MeGet;
  usersGet: UsersGet;
}

let prisma: PrismaClient;
let routes: AuthRoutes;
let fixturePasswordHash: string;

function requestUrl(path: string): string {
  return `http://localhost${path}`;
}

function jsonRequest(path: string, body: unknown): Request {
  return new Request(requestUrl(path), {
    method: "POST",
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

function expectErrorEnvelope(
  body: ErrorEnvelope,
  code: ErrorEnvelope["error"]["code"],
): void {
  expect(body).toMatchObject({
    success: false,
    error: { code },
  });
  expect(body.requestId).toEqual(expect.any(String));
}

async function seedAuthUsers(): Promise<void> {
  fixturePasswordHash ??= await hash(TEST_USER_PASSWORD, {
    type: argon2id,
    memoryCost: 65_536,
    timeCost: 3,
    parallelism: 1,
  });

  const fixtureIds = [
    adminUserFixture.id,
    activeEmployeeUserFixture.id,
    inactiveEmployeeUserFixture.id,
  ];
  const fixtureEmails = [
    adminUserFixture.email,
    activeEmployeeUserFixture.email,
    inactiveEmployeeUserFixture.email,
  ];

  await prisma.user.deleteMany({
    where: {
      OR: [
        { id: { in: fixtureIds } },
        { email: { in: fixtureEmails } },
      ],
    },
  });

  await prisma.user.createMany({
    data: [
      {
        id: adminUserFixture.id,
        name: adminUserFixture.name,
        email: adminUserFixture.email,
        passwordHash: fixturePasswordHash,
        role: USER_ROLE.ADMIN,
        status: USER_STATUS.ACTIVE,
      },
      {
        id: activeEmployeeUserFixture.id,
        name: activeEmployeeUserFixture.name,
        email: activeEmployeeUserFixture.email,
        passwordHash: fixturePasswordHash,
        role: USER_ROLE.EMPLOYEE,
        status: USER_STATUS.ACTIVE,
      },
      {
        id: inactiveEmployeeUserFixture.id,
        name: inactiveEmployeeUserFixture.name,
        email: inactiveEmployeeUserFixture.email,
        passwordHash: fixturePasswordHash,
        role: USER_ROLE.EMPLOYEE,
        status: USER_STATUS.INACTIVE,
      },
    ],
  });
}

async function loadRoutes(): Promise<AuthRoutes> {
  const [loginRoute, logoutRoute, meRoute, usersRoute] = await Promise.all([
    import("../../app/api/v1/auth/login/route"),
    import("../../app/api/v1/auth/logout/route"),
    import("../../app/api/v1/auth/me/route"),
    import("../../app/api/v1/users/route"),
  ]);

  return {
    loginPost: loginRoute.POST,
    logoutPost: logoutRoute.POST,
    meGet: meRoute.GET,
    usersGet: usersRoute.GET,
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
  await seedAuthUsers();
});

afterAll(async () => {
  await prisma?.$disconnect();
});

describe("auth API integration", () => {
  it("logs in active users with a safe 200 envelope and session cookie", async () => {
    const response = await routes.loginPost(
      jsonRequest("/api/v1/auth/login", {
        email: adminUserFixture.email,
        password: TEST_USER_PASSWORD,
      }),
    );
    const body = await responseJson<SuccessEnvelope<UserDto>>(response);
    const setCookie = response.headers.get("set-cookie");

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(body).toMatchObject({
      success: true,
      data: {
        id: adminUserFixture.id,
        name: adminUserFixture.name,
        email: adminUserFixture.email,
        role: USER_ROLE.ADMIN,
        status: USER_STATUS.ACTIVE,
      },
    });
    expect(body.requestId).toEqual(expect.any(String));
    expect(body.data).not.toHaveProperty("password");
    expect(body.data).not.toHaveProperty("passwordHash");
    expect(setCookie).toContain("next-auth.session-token=");
    expect(setCookie).toContain("HttpOnly");
  });

  it("rejects invalid and inactive credentials with safe 401 envelopes", async () => {
    const invalidResponse = await routes.loginPost(
      jsonRequest("/api/v1/auth/login", {
        email: adminUserFixture.email,
        password: "wrong-password",
      }),
    );
    const invalidBody = await responseJson<ErrorEnvelope>(invalidResponse);

    expect(invalidResponse.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    expectErrorEnvelope(invalidBody, DOMAIN_ERROR_CODE.UNAUTHORIZED);

    const inactiveResponse = await routes.loginPost(
      jsonRequest("/api/v1/auth/login", {
        email: inactiveEmployeeUserFixture.email,
        password: TEST_USER_PASSWORD,
      }),
    );
    const inactiveBody = await responseJson<ErrorEnvelope>(inactiveResponse);

    expect(inactiveResponse.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    expectErrorEnvelope(inactiveBody, DOMAIN_ERROR_CODE.UNAUTHORIZED);
  });

  it("returns me for active sessions and rejects the same session after deactivation", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor(adminUserFixture));

    const activeResponse = await routes.meGet();
    const activeBody = await responseJson<SuccessEnvelope<UserDto>>(activeResponse);

    expect(activeResponse.status).toBe(HTTP_STATUS.OK);
    expect(activeBody).toMatchObject({
      success: true,
      data: {
        id: adminUserFixture.id,
        role: USER_ROLE.ADMIN,
        status: USER_STATUS.ACTIVE,
      },
    });
    expect(activeBody.data).not.toHaveProperty("passwordHash");

    await prisma.user.update({
      where: { id: adminUserFixture.id },
      data: { status: USER_STATUS.INACTIVE },
    });

    const inactiveResponse = await routes.meGet();
    const inactiveBody = await responseJson<ErrorEnvelope>(inactiveResponse);

    expect(inactiveResponse.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    expectErrorEnvelope(inactiveBody, DOMAIN_ERROR_CODE.UNAUTHORIZED);
  });

  it("logs out authenticated users and clears the session cookie", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor(activeEmployeeUserFixture));

    const response = await routes.logoutPost(
      new NextRequest(requestUrl("/api/v1/auth/logout"), {
        method: "POST",
        headers: {
          cookie: "next-auth.session-token=test-session",
        },
      }),
    );
    const body = await responseJson<SuccessEnvelope<{ acknowledged: true }>>(response);
    const setCookie = response.headers.get("set-cookie");

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(body).toMatchObject({
      success: true,
      data: { acknowledged: true },
    });
    expect(body.requestId).toEqual(expect.any(String));
    expect(setCookie).toContain("next-auth.session-token=");
    expect(setCookie).toContain("Max-Age=0");
  });

  it("returns 403 when an EMPLOYEE accesses an ADMIN-only endpoint", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor(activeEmployeeUserFixture));

    const response = await routes.usersGet(
      new NextRequest(requestUrl("/api/v1/users"), {
        method: "GET",
      }),
    );
    const body = await responseJson<ErrorEnvelope>(response);

    expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
    expectErrorEnvelope(body, DOMAIN_ERROR_CODE.FORBIDDEN);
  });
});
