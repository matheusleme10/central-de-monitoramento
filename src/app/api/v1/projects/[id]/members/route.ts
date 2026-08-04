import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api/error-response";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { addProjectMemberSchema } from "@/lib/validations/project.schema";
import { addProjectMember, getProjectById } from "@/core/services/project.service";
import { recordAuditLog } from "@/core/services/audit-log.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission(PERMISSIONS.PROJECT_WRITE);
    const { id } = await params;
    const existing = await getProjectById(session, id);
    if (!existing) {
      return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    }
    const body = await request.json();
    const input = addProjectMemberSchema.parse(body);
    const member = await addProjectMember(id, input.userId, input.accessLevel);

    await recordAuditLog({
      userId: session.user.id,
      action: "project.member.add",
      entityType: "project",
      entityId: id,
      metadata: { targetUserId: input.userId, accessLevel: input.accessLevel },
      request,
    });

    return NextResponse.json({ data: member }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
