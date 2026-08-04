import "server-only";
import type { Session } from "next-auth";
import { prisma } from "@/infrastructure/database/prisma";
import { ForbiddenError } from "@/lib/auth/guards";

const ELEVATED_ROLES = new Set(["SUPERADMIN", "ADMIN"]);

/** Superadmin/Admin enxergam todos os projetos; os demais, apenas onde são membros. */
export function isElevatedRole(role: string): boolean {
  return ELEVATED_ROLES.has(role);
}

/**
 * Cláusula Prisma `where` para restringir a listagem de projetos aos que o
 * usuário está autorizado a ver — nunca confiar em filtro feito no cliente.
 */
export function projectVisibilityWhere(session: Session) {
  if (isElevatedRole(session.user.role)) {
    return {};
  }
  return {
    members: { some: { userId: session.user.id } },
  };
}

export async function assertProjectAccess(
  session: Session,
  projectId: string,
): Promise<void> {
  if (isElevatedRole(session.user.role)) return;

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: session.user.id } },
  });

  if (!membership) {
    throw new ForbiddenError("Você não tem acesso a este projeto");
  }
}

/**
 * Cláusula Prisma `where` de Project combinando visibilidade com um filtro
 * opcional de projeto específico (usado pelos filtros do Dashboard/busca).
 * Se `projectId` for informado, a checagem de acesso deve ter sido feita
 * separadamente com `assertProjectAccess` antes de chamar esta função.
 */
export function buildProjectFilter(session: Session, projectId?: string) {
  return {
    deletedAt: null,
    ...projectVisibilityWhere(session),
    ...(projectId ? { id: projectId } : {}),
  };
}
