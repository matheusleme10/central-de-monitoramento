import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api/error-response";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { updateProjectMemberSchema } from "@/lib/validations/project.schema";
import {
  updateProjectMember,
  removeProjectMember,
  getProjectById,
} from "@/core/services/project.service";
import { recordAuditLog } from "@/core/services/audit-log.service";

interface RouteParams {
  params: Promise<{ id: string; userId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission(PERMISSIONS.PROJECT_WRITE);
    const { id, userId } = await params;
    const existing = await getProjectById(session, id);
    if (!existing) {
      return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    }
    const body = await request.json();
    const input = updateProjectMemberSchema.parse(body);
    const member = await updateProjectMember(id, userId, input.accessLevel);

    await recordAuditLog({
      userId: session.user.id,
      action: "project.member.update",
      entityType: "project",
      entityId: id,
      metadata: { targetUserId: userId, accessLevel: input.accessLevel },
      request,
    });

    return NextResponse.json({ data: member });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission(PERMISSIONS.PROJECT_WRITE);
    const { id, userId } = await params;
    const existing = await getProjectById(session, id);
    if (!existing) {
      return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    }
    await removeProjectMember(id, userId);

    await recordAuditLog({
      userId: session.user.id,
      action: "project.member.remove",
      entityType: "project",
      entityId: id,
      metadata: { targetUserId: userId },
      request,
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return handleApiError(error);
  }
}
