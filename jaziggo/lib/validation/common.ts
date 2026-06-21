import { z } from "zod"

import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "../../types/api"

export { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE }

export const uuidSchema = z.uuid()

export const requiredTrimmedStringSchema = z
  .string()
  .trim()
  .min(1)

export const optionalTrimmedStringSchema =
  requiredTrimmedStringSchema.optional()

export const optionalEmailSchema = z
  .string()
  .trim()
  .pipe(z.email())
  .optional()

export const isoDateSchema = z.iso.date()
export const optionalIsoDateSchema = isoDateSchema.optional()

export const requestIdSchema = requiredTrimmedStringSchema.max(128)

function parseSafeInteger(value: unknown): unknown {
  if (typeof value !== "string") return value

  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) return value

  const parsed = Number(trimmed)
  return Number.isSafeInteger(parsed) ? parsed : value
}

export const positiveIntegerQuerySchema = z.preprocess(
  parseSafeInteger,
  z.number().int().positive().safe(),
)

export const pageSizeQuerySchema = z.preprocess(
  parseSafeInteger,
  z.number().int().positive().max(MAX_PAGE_SIZE).safe(),
)

export const paginationSchema = z
  .object({
    page: positiveIntegerQuerySchema.default(DEFAULT_PAGE),
    pageSize: pageSizeQuerySchema.default(DEFAULT_PAGE_SIZE),
  })
  .strict()

export const sortDirectionSchema = z.enum(["asc", "desc"])

export const basicSortSchema = z
  .object({
    sortBy: optionalTrimmedStringSchema,
    sortDirection: sortDirectionSchema.optional(),
  })
  .strict()

export const commonSearchParamsSchema = paginationSchema.extend({
  search: optionalTrimmedStringSchema,
  sortBy: optionalTrimmedStringSchema,
  sortDirection: sortDirectionSchema.optional(),
})

export type PaginationInput = z.input<typeof paginationSchema>
export type Pagination = z.output<typeof paginationSchema>
export type BasicSort = z.infer<typeof basicSortSchema>
export type CommonSearchParams = z.infer<
  typeof commonSearchParamsSchema
>
