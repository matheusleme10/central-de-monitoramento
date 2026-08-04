import { PrismaClient } from "@prisma/client";

/**
 * Singleton do Prisma Client. Em desenvolvimento, o Next.js recarrega
 * módulos a cada alteração (HMR), o que criaria uma nova conexão a cada
 * reload sem este cache em `globalThis`.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
