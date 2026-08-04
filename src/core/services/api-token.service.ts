import "server-only";
import { prisma } from "@/infrastructure/database/prisma";
import { generateApiToken } from "@/infrastructure/auth/api-token";
import type { CreateApiTokenInput } from "@/lib/validations/api-token.schema";

const SELECT_SAFE_FIELDS = {
  id: true,
  name: true,
  tokenPreview: true,
  expiresAt: true,
  lastUsedAt: true,
  revokedAt: true,
  createdAt: true,
} as const;

export async function listApiTokensByProject(projectId: string) {
  return prisma.apiToken.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: SELECT_SAFE_FIELDS,
  });
}

/** Retorna o token em texto puro apenas uma vez, na criação — nunca mais depois disso. */
export async function createApiToken(
  projectId: string,
  createdById: string,
  input: CreateApiTokenInput,
) {
  const { token, tokenHash, preview } = generateApiToken();

  const expiresAt = input.expiresInDays
    ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const record = await prisma.apiToken.create({
    data: {
      name: input.name,
      tokenHash,
      tokenPreview: preview,
      projectId,
      createdById,
      expiresAt,
    },
    select: SELECT_SAFE_FIELDS,
  });

  return { ...record, token };
}

export async function revokeApiToken(projectId: string, tokenId: string) {
  return prisma.apiToken.updateMany({
    where: { id: tokenId, projectId },
    data: { revokedAt: new Date() },
  });
}
