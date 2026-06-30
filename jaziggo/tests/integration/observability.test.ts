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

vi.mock("server-only", () => ({}));

type LiveGet = typeof import("../../app/api/v1/operations/health/live/route").GET;
type ReadyGet = typeof import("../../app/api/v1/operations/health/ready/route").GET;
type MetricsGet = typeof import("../../app/api/v1/operations/metrics/route").GET;
type MetricsSnapshot =
  Awaited<ReturnType<typeof import("../../lib/observability/metrics").collectMetricsSnapshot>>;

interface ObservabilityRoutes {
  liveGet: LiveGet;
  readyGet: ReadyGet;
  metricsGet: MetricsGet;
}

interface ObservabilityModules {
  metrics: typeof import("../../lib/observability/metrics");
  logger: typeof import("../../lib/observability/logger");
}

const metricsToken = "integration-observability-token";
const sensitiveValues = [
  "integration-secret-password",
  metricsToken,
  "14717099001",
  "119717099001",
  "person.integration@example.test",
  "Synthetic private address 170",
];

let prisma: PrismaClient;
let routes: ObservabilityRoutes;
let observability: ObservabilityModules;

function requestUrl(path: string): string {
  return `http://localhost${path}`;
}

async function responseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function authorizedRequest(path: string): NextRequest {
  return new NextRequest(requestUrl(path), {
    method: "GET",
    headers: {
      "x-metrics-token": metricsToken,
    },
  });
}

function unauthorizedRequest(path: string): NextRequest {
  return new NextRequest(requestUrl(path), { method: "GET" });
}

function expectRequestId(body: { requestId: string }): void {
  expect(body.requestId).toEqual(expect.any(String));
}

function expectNoSensitiveValues(value: unknown): void {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);

  for (const sensitiveValue of sensitiveValues) {
    expect(serialized).not.toContain(sensitiveValue);
  }
}

async function loadRoutes(): Promise<ObservabilityRoutes> {
  const [liveRoute, readyRoute, metricsRoute] = await Promise.all([
    import("../../app/api/v1/operations/health/live/route"),
    import("../../app/api/v1/operations/health/ready/route"),
    import("../../app/api/v1/operations/metrics/route"),
  ]);

  return {
    liveGet: liveRoute.GET,
    readyGet: readyRoute.GET,
    metricsGet: metricsRoute.GET,
  };
}

async function loadObservabilityModules(): Promise<ObservabilityModules> {
  const [metrics, logger] = await Promise.all([
    import("../../lib/observability/metrics"),
    import("../../lib/observability/logger"),
  ]);

  return { metrics, logger };
}

beforeAll(async () => {
  loadEnvConfig(process.cwd());

  const testDatabaseUrl = resolveIntegrationDatabaseUrl();

  process.env.AUTH_SECRET ??= "integration-test-auth-secret";
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.METRICS_TOKEN = metricsToken;

  const prismaModule = await import("../../lib/db/prisma");
  prisma = prismaModule.prisma;
  routes = await loadRoutes();
  observability = await loadObservabilityModules();
});

beforeEach(() => {
  process.env.METRICS_ENABLED = "true";
  process.env.METRICS_TOKEN = metricsToken;
  vi.restoreAllMocks();
});

afterAll(async () => {
  await prisma?.$disconnect();
});

describe("observability integration", () => {
  it("returns minimal health envelopes without environment, secrets or personal data", async () => {
    const liveResponse = await routes.liveGet();
    const liveBody = await responseJson<SuccessEnvelope<{ status: "ok" }>>(
      liveResponse,
    );

    expect(liveResponse.status).toBe(HTTP_STATUS.OK);
    expect(liveResponse.headers.get("cache-control")).toBe("no-store");
    expect(liveBody).toEqual({
      success: true,
      data: { status: "ok" },
      requestId: expect.any(String),
    });
    expectNoSensitiveValues(liveBody);

    const readyResponse = await routes.readyGet(
      authorizedRequest("/api/v1/operations/health/ready"),
    );
    const readyBody = await responseJson<SuccessEnvelope<{ status: "ready" }>>(
      readyResponse,
    );

    expect(readyResponse.status).toBe(HTTP_STATUS.OK);
    expect(readyResponse.headers.get("cache-control")).toBe("no-store");
    expect(readyBody).toEqual({
      success: true,
      data: { status: "ready" },
      requestId: expect.any(String),
    });
    expectNoSensitiveValues(readyBody);
  });

  it("protects readiness and metrics endpoints with safe error envelopes", async () => {
    const readyResponse = await routes.readyGet(
      unauthorizedRequest("/api/v1/operations/health/ready"),
    );
    const readyBody = await responseJson<ErrorEnvelope>(readyResponse);

    expect(readyResponse.status).toBe(503);
    expect(readyBody).toMatchObject({
      success: false,
      error: {
        code: DOMAIN_ERROR_CODE.INTERNAL_ERROR,
        message: "Service unavailable",
      },
    });
    expectRequestId(readyBody);
    expectNoSensitiveValues(readyBody);

    const metricsResponse = await routes.metricsGet(
      unauthorizedRequest("/api/v1/operations/metrics"),
    );
    const metricsBody = await responseJson<ErrorEnvelope>(metricsResponse);

    expect(metricsResponse.status).toBe(HTTP_STATUS.FORBIDDEN);
    expect(metricsBody).toMatchObject({
      success: false,
      error: {
        code: DOMAIN_ERROR_CODE.FORBIDDEN,
        message: "Forbidden",
      },
    });
    expectRequestId(metricsBody);
    expectNoSensitiveValues(metricsBody);
  });

  it("returns aggregate technical metrics without labels for documents, contacts or tokens", async () => {
    observability.metrics.recordLocationSearchObservation({
      operation: observability.metrics.LOCATION_SEARCH_OPERATION.SEARCH,
      result: observability.metrics.LOCATION_SEARCH_RESULT.FOUND,
      durationMs: 125,
      resultCount: 2,
      userId: "00000000-0000-4000-8000-000000009170",
    });
    observability.metrics.recordReportObservation({
      type: observability.metrics.REPORT_TYPE.DECEASED,
      result: observability.metrics.REPORT_RESULT.EMPTY,
      durationMs: 250,
      resultCount: 0,
      userId: "00000000-0000-4000-8000-000000009170",
    });

    const response = await routes.metricsGet(
      authorizedRequest("/api/v1/operations/metrics"),
    );
    const body = await responseJson<SuccessEnvelope<MetricsSnapshot>>(response);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({ format: "prometheus" });
    expect(body.data.content).toContain("jaziggo_location_search_total");
    expect(body.data.content).toContain("jaziggo_reports_generated_total");
    expect(body.data.content).toContain('result="found"');
    expect(body.data.content).toContain('type="deceased"');
    expect(body.data.content).not.toContain("00000000-0000-4000-8000-000000009170");
    expectNoSensitiveValues(body);
  });

  it("writes structured logs with safe technical metadata only", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    observability.logger.writeStructuredLog({
      level: observability.logger.LOG_LEVEL.INFO,
      module: "auth",
      operation: "login",
      event: "auth.login.succeeded",
      requestId: "00000000-0000-4000-8000-000000009171",
      userId: "00000000-0000-4000-8000-000000009172",
      message: "Authentication succeeded",
      metadata: {
        result: observability.logger.LOG_RESULT.SUCCESS,
        durationMs: 42.4,
        role: "ADMIN",
      },
    });
    observability.metrics.recordLocationSearchObservation({
      operation: observability.metrics.LOCATION_SEARCH_OPERATION.SEARCH_BY_DOCUMENT,
      result: observability.metrics.LOCATION_SEARCH_RESULT.EMPTY,
      durationMs: 13,
      resultCount: 0,
      userId: "00000000-0000-4000-8000-000000009173",
    });
    observability.metrics.recordReportObservation({
      type: observability.metrics.REPORT_TYPE.SPACE_STATUS,
      result: observability.metrics.REPORT_RESULT.ERROR,
      durationMs: Number.NaN,
      userId: "00000000-0000-4000-8000-000000009174",
    });

    const serializedLogs = [
      ...infoSpy.mock.calls,
      ...warnSpy.mock.calls,
      ...errorSpy.mock.calls,
    ]
      .flat()
      .join("\n");

    expect(serializedLogs).toContain('"module":"auth"');
    expect(serializedLogs).toContain('"module":"location-search"');
    expect(serializedLogs).toContain('"module":"report"');
    expect(serializedLogs).toContain('"operation":"login"');
    expect(serializedLogs).toContain('"operation":"search_by_document"');
    expect(serializedLogs).toContain('"operation":"generate"');
    expect(serializedLogs).toContain('"requestId"');
    expect(serializedLogs).toContain('"durationMs"');
    expectNoSensitiveValues(serializedLogs);
  });
});
