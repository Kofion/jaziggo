import { existsSync, readdirSync, readFileSync, type Dirent } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"
import YAML from "yaml"

const APP_API_ROOT = path.resolve("app/api/v1")
const OPENAPI_PATH = path.resolve(
  "../specs/001-cemetery-management/contracts/openapi.yaml",
)
const HTTP_METHODS = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
])
const PUBLIC_PATHS = new Set([
  "/auth/login",
  "/operations/health/live",
])
const METRICS_TOKEN_PATHS = new Set([
  "/operations/health/ready",
  "/operations/metrics",
])
const ALLOWED_ROLES = new Set(["ADMIN", "EMPLOYEE"])

interface OpenApiDocument {
  paths: Record<string, Record<string, OperationObject | unknown>>
  components?: {
    responses?: Record<string, ResponseObject>
    schemas?: Record<string, SchemaObject>
  }
}

interface OperationObject {
  operationId?: string
  security?: SecurityRequirement[]
  "x-roles"?: string[]
  responses?: Record<string, ResponseObject | ReferenceObject>
}

interface ResponseObject {
  content?: Record<string, { schema?: SchemaObject | ReferenceObject }>
}

interface SchemaObject {
  allOf?: Array<SchemaObject | ReferenceObject>
  properties?: Record<string, SchemaObject | ReferenceObject>
  required?: string[]
}

interface ReferenceObject {
  $ref: string
}

type SecurityRequirement = Record<string, string[]>

type RouteContract = Record<string, Set<string>>

function isReferenceObject(value: unknown): value is ReferenceObject {
  return (
    typeof value === "object" &&
    value !== null &&
    "$ref" in value &&
    typeof (value as ReferenceObject).$ref === "string"
  )
}

function loadOpenApi(): OpenApiDocument {
  return YAML.parse(readFileSync(OPENAPI_PATH, "utf8")) as OpenApiDocument
}

function pathFromRouteFile(filePath: string): string {
  const relative = path
    .relative(APP_API_ROOT, filePath)
    .replaceAll(path.sep, "/")
    .replace(/\/route\.ts$/, "")
  const segments = relative.split("/").map((segment) => {
    const match = /^\[(.+)]$/.exec(segment)

    return match ? `{${match[1]}}` : segment
  })

  return `/${segments.join("/")}`
}

function exportedMethods(source: string): Set<string> {
  const matches = source.matchAll(
    /export\s+async\s+function\s+([A-Z]+)\s*\(/g,
  )

  return new Set(
    Array.from(matches, ([, method]) => method.toLowerCase()).filter(
      (method) => HTTP_METHODS.has(method),
    ),
  )
}

function collectRouteFiles(directory = APP_API_ROOT): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(
    (entry: Dirent) => {
      const entryPath = path.join(directory, entry.name)

      if (entry.isDirectory()) {
        return collectRouteFiles(entryPath)
      }

      return entry.isFile() && entry.name === "route.ts" ? [entryPath] : []
    },
  )
}

function collectImplementedRoutes(): RouteContract {
  return Object.fromEntries(
    collectRouteFiles().map((filePath) => [
      pathFromRouteFile(filePath),
      exportedMethods(readFileSync(filePath, "utf8")),
    ]),
  )
}

function collectContractRoutes(openApi: OpenApiDocument): RouteContract {
  return Object.fromEntries(
    Object.entries(openApi.paths).map(([apiPath, pathItem]) => [
      apiPath,
      new Set(
        Object.keys(pathItem).filter((key) => HTTP_METHODS.has(key)),
      ),
    ]),
  )
}

function sortedContractEntries(contract: RouteContract): string[] {
  return Object.entries(contract)
    .flatMap(([apiPath, methods]) =>
      Array.from(methods).map((method) => `${method.toUpperCase()} ${apiPath}`),
    )
    .sort()
}

function operationFor(
  openApi: OpenApiDocument,
  apiPath: string,
  method: string,
): OperationObject {
  return openApi.paths[apiPath][method] as OperationObject
}

function responseSchemaName(
  openApi: OpenApiDocument,
  response: ResponseObject | ReferenceObject,
): string | undefined {
  if (isReferenceObject(response)) {
    const responseName = response.$ref.split("/").at(-1)
    const referencedResponse = responseName
      ? openApi.components?.responses?.[responseName]
      : undefined

    return referencedResponse
      ? responseSchemaName(openApi, referencedResponse)
      : responseName
  }

  const schema = response.content?.["application/json"]?.schema

  if (isReferenceObject(schema)) {
    return schema.$ref.split("/").at(-1)
  }

  if (schema?.allOf?.some((item) => referencesSchema(item, "SuccessEnvelopeBase"))) {
    return "InlineSuccessEnvelope"
  }

  return undefined
}

function referencesSchema(
  schema: SchemaObject | ReferenceObject,
  expectedName: string,
): boolean {
  return isReferenceObject(schema) && schema.$ref.endsWith(`/${expectedName}`)
}

function hasMetricsTokenSecurity(operation: OperationObject): boolean {
  return operation.security?.some((entry) => "metricsToken" in entry) ?? false
}

function hasPublicSecurity(operation: OperationObject): boolean {
  return Array.isArray(operation.security) && operation.security.length === 0
}

describe("OpenAPI contract adherence", () => {
  const openApi = loadOpenApi()
  const contractRoutes = collectContractRoutes(openApi)
  const implementedRoutes = collectImplementedRoutes()

  it("keeps implemented route paths and methods aligned with OpenAPI", () => {
    expect(sortedContractEntries(implementedRoutes)).toEqual(
      sortedContractEntries(contractRoutes),
    )
  })

  it("declares only supported security modes and roles", () => {
    for (const [apiPath, methods] of Object.entries(contractRoutes)) {
      for (const method of methods) {
        const operation = operationFor(openApi, apiPath, method)
        const roles = operation["x-roles"] ?? []

        expect(operation.operationId).toEqual(expect.any(String))
        expect(roles.every((role) => ALLOWED_ROLES.has(role))).toBe(true)
        expect(roles).not.toContain("ATTENDANT")

        if (PUBLIC_PATHS.has(apiPath)) {
          expect(hasPublicSecurity(operation)).toBe(true)
          expect(roles).toEqual([])
          continue
        }

        if (METRICS_TOKEN_PATHS.has(apiPath)) {
          expect(hasMetricsTokenSecurity(operation)).toBe(true)
          expect(roles).toEqual([])
          continue
        }

        expect(roles.length).toBeGreaterThan(0)
      }
    }
  })

  it("keeps success and error responses on the standard envelopes", () => {
    for (const [apiPath, methods] of Object.entries(contractRoutes)) {
      for (const method of methods) {
        const operation = operationFor(openApi, apiPath, method)
        const responses = operation.responses ?? {}

        for (const [statusCode, response] of Object.entries(responses)) {
          const schemaName = responseSchemaName(openApi, response)

          if (statusCode.startsWith("2")) {
            expect(schemaName).toMatch(/SuccessEnvelope$/)
            continue
          }

          expect(schemaName).toBe("ErrorResponse")
        }
      }
    }
  })

  it("keeps route files using matching operational protections and envelopes", () => {
    for (const [apiPath, methods] of Object.entries(implementedRoutes)) {
      const routeFile = path.join(
        APP_API_ROOT,
        apiPath
          .slice(1)
          .split("/")
          .map((segment) => segment.replace(/^{(.+)}$/, "[$1]"))
          .join(path.sep),
        "route.ts",
      )
      const source = readFileSync(routeFile, "utf8")

      expect(methods.size).toBeGreaterThan(0)
      expect(source).toContain("SuccessEnvelope")

      if (!PUBLIC_PATHS.has(apiPath)) {
        expect(source).toContain("ErrorEnvelope")
      }

      if (METRICS_TOKEN_PATHS.has(apiPath)) {
        expect(source).toContain("x-metrics-token")
        expect(source).toContain("timingSafeEqual")
      }

      expect(source).not.toContain("DATABASE_URL")
      expect(source).not.toContain("AUTH_SECRET")
      expect(source).not.toContain("ATTENDANT")
      expect(existsSync(routeFile)).toBe(true)
    }
  })
})