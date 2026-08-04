import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api/error-response";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createProjectSchema } from "@/lib/validations/project.schema";
import { listProjects, createProject } from "@/core/services/project.service";
import { recordAuditLog } from "@/core/services/audit-log.service";

export async function GET() {
  try {
    const session = await requirePermission(PERMISSIONS.PROJECT_READ);
    const projects = await listProjects(session);
    return NextResponse.json({ data: projects });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(PERMISSIONS.PROJECT_WRITE);
    const body = await request.json();
    const input = createProjectSchema.parse(body);
    const project = await createProject(input);

    await recordAuditLog({
      userId: session.user.id,
      action: "project.create",
      entityType: "project",
      entityId: project.id,
      metadata: { name: project.name },
      request,
    });

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
