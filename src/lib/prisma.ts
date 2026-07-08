import { PrismaClient } from "@prisma/client";

/**
 * Prisma singleton optimized for serverless (Vercel).
 * - In production: each cold start creates one client, warm instances reuse it.
 * - connection_limit=1 should be set in DATABASE_URL for pgbouncer compatibility.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

// Persist across hot-reloads in dev; in prod each instance is already isolated
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
