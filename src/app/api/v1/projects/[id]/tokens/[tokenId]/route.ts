import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api/error-response";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getProjectById } from "@/core/services/project.service";
import { revokeApiToken } from "@/core/services/api-token.service";
import { recordAuditLog } from "@/core/services/audit-log.service";

interface RouteParams {
  params: Promise<{ id: string; tokenId: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission(PERMISSIONS.API_TOKEN_MANAGE);
    const { id, tokenId } = await params;
    const existing = await getProjectById(session, id);
    if (!existing) {
      return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    }
    await revokeApiToken(id, tokenId);

    await recordAuditLog({
      userId: session.user.id,
      action: "api_token.revoke",
      entityType: "api_token",
      entityId: tokenId,
      metadata: { projectId: id },
      request,
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return handleApiError(error);
  }
}
