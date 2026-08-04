import "server-only";
import { auth } from "@/auth";
import type { PermissionKey } from "@/lib/constants/permissions";
import type { RoleKey } from "@/lib/constants/roles";

/**
 * Helpers de autorização para uso exclusivo no servidor (Server Components,
 * Route Handlers, Server Actions). O front-end nunca deve ser a única
 * camada que decide o que o usuário pode ver ou fazer.
 */

export class UnauthorizedError extends Error {
  constructor(message = "Não autenticado") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Sem permissão para esta ação") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthorizedError();
  }
  return session;
}

export async function requireRole(...roles: RoleKey[]) {
  const session = await requireAuth();
  if (!roles.includes(session.user.role)) {
    throw new ForbiddenError();
  }
  return session;
}

export async function requirePermission(permission: PermissionKey) {
  const session = await requireAuth();
  const hasPermission =
    session.user.role === "SUPERADMIN" ||
    session.user.permissions.includes(permission);

  if (!hasPermission) {
    throw new ForbiddenError();
  }
  return session;
}
