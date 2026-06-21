import "server-only"

import { Prisma } from "@prisma/client"

import { prisma } from "./prisma"

const SERIALIZATION_CONFLICT_CODE = "P2034"

export const DEFAULT_MAX_TRANSACTION_RETRIES = 3
export const MAX_TRANSACTION_RETRIES = 5

export interface SerializableTransactionOptions {
  maxRetries?: number
  maxWait?: number
  timeout?: number
}

export type SerializableTransactionCallback<T> = (
  transaction: Prisma.TransactionClient,
) => Promise<T>

function validateMaxRetries(maxRetries: number): void {
  if (
    !Number.isInteger(maxRetries) ||
    maxRetries < 0 ||
    maxRetries > MAX_TRANSACTION_RETRIES
  ) {
    throw new RangeError(
      `maxRetries must be an integer between 0 and ${MAX_TRANSACTION_RETRIES}`,
    )
  }
}

export function isSerializationConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === SERIALIZATION_CONFLICT_CODE
  )
}

export async function withSerializableTransaction<T>(
  callback: SerializableTransactionCallback<T>,
  options: SerializableTransactionOptions = {},
): Promise<T> {
  const {
    maxRetries = DEFAULT_MAX_TRANSACTION_RETRIES,
    maxWait,
    timeout,
  } = options

  validateMaxRetries(maxRetries)

  for (let retryCount = 0; ; retryCount += 1) {
    try {
      return await prisma.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait,
        timeout,
      })
    } catch (error) {
      if (!isSerializationConflict(error) || retryCount >= maxRetries) {
        throw error
      }
    }
  }
}
