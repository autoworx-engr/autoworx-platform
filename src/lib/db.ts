import "server-only";
import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

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

  if (input instanceof Decimal) {
    return input.toNumber();
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

// Extend Prisma to serialize Decimal in all model operations
const extendedPrisma = new PrismaClient({
  log: ["query", "error", "warn"],
}).$extends({
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
  prisma: PrismaClient;
};

export const db = globalForPrisma.prisma || extendedPrisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
