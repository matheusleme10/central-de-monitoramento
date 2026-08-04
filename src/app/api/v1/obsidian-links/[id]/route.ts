import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api/error-response";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { deleteObsidianLink } from "@/core/services/obsidian-link.service";
import { recordAuditLog } from "@/core/services/audit-log.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission(PERMISSIONS.PROJECT_WRITE);
    const { id } = await params;
    await deleteObsidianLink(id);

    await recordAuditLog({
      userId: session.user.id,
      action: "obsidian_link.delete",
      entityType: "obsidian_link",
      entityId: id,
      request,
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return handleApiError(error);
  }
}
