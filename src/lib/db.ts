import "server-only";
import { Prisma, PrismaClient } from "@prisma/client";

const globalForDb = globalThis as unknown as { db: PrismaClient };

export const db =
  globalForDb.db ||
  new PrismaClient({
    transactionOptions: {
      timeout: 15000,
      maxWait: 30000,
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  });

if (process.env.NODE_ENV !== "production") globalForDb.db = db;
