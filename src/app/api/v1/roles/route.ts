import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api/error-response";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { listRolesWithPermissions } from "@/core/services/role.service";

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.ROLE_MANAGE);
    const roles = await listRolesWithPermissions();
    return NextResponse.json({ data: roles });
  } catch (error) {
    return handleApiError(error);
  }
}
