import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { listRolesWithPermissions, listAllPermissions } from "@/core/services/role.service";
import { PermissionsMatrixClient } from "./permissions-matrix-client";

export const metadata: Metadata = { title: "Permissões — Central de Monitoramento" };

export default async function PermissoesPage() {
  const session = await requirePermission(PERMISSIONS.ROLE_MANAGE);
  const [roles, permissions] = await Promise.all([
    listRolesWithPermissions(),
    listAllPermissions(),
  ]);

  return (
    <PermissionsMatrixClient
      roles={roles}
      permissions={permissions}
      canEdit={session.user.role === "SUPERADMIN"}
    />
  );
}
