import "server-only";
import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Highly optimized serializer
function serializeResult(input: any): any {
  if (
    input === null ||
    input === undefined ||
    typeof input === "number" ||
    typeof input === "string" ||
    typeof input === "boolean"
  ) {
    return input;
  }

  // Handle Prisma Decimal and similar numeric wrapper types via duck-typing
  if (
    typeof input === "object" &&
    input !== null &&
    "toNumber" in input &&
    typeof (input as any).toNumber === "function"
  ) {
    return (input as any).toNumber();
  }

  if (input instanceof Date) {
    return input;
  }

  if (Array.isArray(input)) {
    const len = input.length;
    const result = new Array(len);
    for (let i = 0; i < len; i++) {
      result[i] = serializeResult(input[i]);
    }
    return result;
  }

  if (typeof input === "object") {
    const result: Record<string, any> = {};
    for (const key in input) {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        result[key] = serializeResult(input[key]);
      }
    }
    return result;
  }

  return input;
}

const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || "";

const adapter = new PrismaPg({ connectionString: databaseUrl });

// Extend Prisma to serialize Decimal in all model operations
const extendedPrisma = new PrismaClient({ adapter }).$extends({
  query: {
    $allModels: {
      $allOperations({ args, query }) {
        return query(args).then(serializeResult);
      },
    },
  },
});

// Prevent multiple instances in dev
const globalForPrisma = globalThis as unknown as {
  prisma: typeof extendedPrisma;
};

// Cast to PrismaClient so callers can use standard Prisma arg types (XxxFindManyArgs etc.)
// without TypeScript "Excessive stack depth" errors caused by the $extends() InternalArgs mismatch.
// The runtime still uses extendedPrisma (with Decimal serialization) via the cast.
export const db = (globalForPrisma.prisma ||
  extendedPrisma) as unknown as PrismaClient;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = extendedPrisma;
}

/**
 * Transaction-callback client type. Use to type the `tx` parameter of
 * `db.$transaction(async (tx) => ...)` callbacks.
 */
export type TransactionClient = Prisma.TransactionClient;

// import "server-only";
// import { PrismaClient } from "@prisma/client";

// // Prevent multiple instances of Prisma in development
// const globalForPrisma = globalThis as unknown as {
//   prisma: PrismaClient | undefined;
// };

// export const db = globalForPrisma.prisma ?? new PrismaClient();

// if (process.env.NODE_ENV !== "production") {
//   globalForPrisma.prisma = db;
// }
