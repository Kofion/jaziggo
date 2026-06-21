export const DEFAULT_PAGE = 1
export const DEFAULT_PAGE_SIZE = 25
export const MAX_PAGE_SIZE = 100

export interface PaginationParams {
  page?: number
  pageSize?: number
}

export interface PaginationMeta {
  page: number
  pageSize: number
  totalRecords: number
  totalPages: number
}

export interface PaginatedData<T> {
  items: T[]
  pagination: PaginationMeta
}

export interface SuccessEnvelope<T> {
  success: true
  data: T
  requestId: string
}

export const DOMAIN_ERROR_CODE = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const

export type DomainErrorCode =
  (typeof DOMAIN_ERROR_CODE)[keyof typeof DOMAIN_ERROR_CODE]

export type FieldErrors = Record<string, string[]>

export interface ApiError<
  TCode extends DomainErrorCode = DomainErrorCode,
> {
  code: TCode
  message: string
  fieldErrors?: FieldErrors
}

export interface ErrorEnvelope<
  TCode extends DomainErrorCode = DomainErrorCode,
> {
  success: false
  error: ApiError<TCode>
  requestId: string
}

export type ApiEnvelope<
  TData,
  TCode extends DomainErrorCode = DomainErrorCode,
> = SuccessEnvelope<TData> | ErrorEnvelope<TCode>

export type PaginatedSuccessEnvelope<T> = SuccessEnvelope<PaginatedData<T>>

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const

export type HttpStatus = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS]

export const DOMAIN_ERROR_HTTP_STATUS = {
  UNAUTHORIZED: HTTP_STATUS.UNAUTHORIZED,
  FORBIDDEN: HTTP_STATUS.FORBIDDEN,
  NOT_FOUND: HTTP_STATUS.NOT_FOUND,
  VALIDATION_ERROR: HTTP_STATUS.UNPROCESSABLE_ENTITY,
  CONFLICT: HTTP_STATUS.CONFLICT,
  INTERNAL_ERROR: HTTP_STATUS.INTERNAL_SERVER_ERROR,
} as const satisfies Record<DomainErrorCode, HttpStatus>
