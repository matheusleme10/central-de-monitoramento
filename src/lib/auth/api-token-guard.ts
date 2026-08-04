import "server-only";
import type { NextRequest } from "next/server";
import { prisma } from "@/infrastructure/database/prisma";
import { hashApiToken } from "@/infrastructure/auth/api-token";
import { UnauthorizedError } from "@/lib/auth/guards";

/**
 * Autentica requisições feitas pelo Apps Script (sem sessão de navegador).
 * Espera o header `Authorization: Bearer <token>`. Nunca loga o token em
 * texto puro — apenas seu hash é comparado com o valor armazenado.
 */
export async function authenticateApiToken(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new UnauthorizedError("Token de API ausente ou mal formatado");
  }

  const tokenHash = hashApiToken(token);
  const apiToken = await prisma.apiToken.findUnique({ where: { tokenHash } });

  if (!apiToken || apiToken.revokedAt) {
    throw new UnauthorizedError("Token de API inválido ou revogado");
  }

  if (apiToken.expiresAt && apiToken.expiresAt < new Date()) {
    throw new UnauthorizedError("Token de API expirado");
  }

  // Best-effort — não bloqueia a resposta ao Apps Script.
  void prisma.apiToken
    .update({ where: { id: apiToken.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);

  return apiToken;
}
