import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api/error-response";
import { ROLES } from "@/lib/constants/roles";
import { updateRolePermissionsSchema } from "@/lib/validations/role.schema";
import { setRolePermissions } from "@/core/services/role.service";
import { recordAuditLog } from "@/core/services/audit-log.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Apenas Superadmin pode redefinir a matriz de permissões de um papel —
 * ação sensível o suficiente para exigir o papel mais alto, não apenas a
 * permissão `role:manage` (que Admin também possui).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole(ROLES.SUPERADMIN as "SUPERADMIN");
    const { id } = await params;
    const body = await request.json();
    const input = updateRolePermissionsSchema.parse(body);
    await setRolePermissions(id, input.permissionIds);

    await recordAuditLog({
      userId: session.user.id,
      action: "role.permissions.update",
      entityType: "role",
      entityId: id,
      metadata: { permissionIds: input.permissionIds },
      request,
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return handleApiError(error);
  }
}
