import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api/error-response";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { listAllPermissions } from "@/core/services/role.service";

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.ROLE_MANAGE);
    const permissions = await listAllPermissions();
    return NextResponse.json({ data: permissions });
  } catch (error) {
    return handleApiError(error);
  }
}
