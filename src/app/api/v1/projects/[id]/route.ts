import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api/error-response";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { updateProjectSchema } from "@/lib/validations/project.schema";
import {
  getProjectById,
  updateProject,
  softDeleteProject,
} from "@/core/services/project.service";
import { recordAuditLog } from "@/core/services/audit-log.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission(PERMISSIONS.PROJECT_READ);
    const { id } = await params;
    const project = await getProjectById(session, id);
    if (!project) {
      return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ data: project });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission(PERMISSIONS.PROJECT_WRITE);
    const { id } = await params;
    const existing = await getProjectById(session, id);
    if (!existing) {
      return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    }
    const body = await request.json();
    const input = updateProjectSchema.parse(body);
    const project = await updateProject(id, input);

    await recordAuditLog({
      userId: session.user.id,
      action: "project.update",
      entityType: "project",
      entityId: id,
      metadata: { changes: input },
      request,
    });

    return NextResponse.json({ data: project });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission(PERMISSIONS.PROJECT_DELETE);
    const { id } = await params;
    const existing = await getProjectById(session, id);
    if (!existing) {
      return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    }
    await softDeleteProject(id);

    await recordAuditLog({
      userId: session.user.id,
      action: "project.delete",
      entityType: "project",
      entityId: id,
      request,
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return handleApiError(error);
  }
}
