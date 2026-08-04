import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/auth/project-access";
import { handleApiError } from "@/lib/api/error-response";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createObsidianLinkSchema } from "@/lib/validations/obsidian-link.schema";
import {
  listObsidianLinksByProject,
  createObsidianLink,
} from "@/core/services/obsidian-link.service";
import { recordAuditLog } from "@/core/services/audit-log.service";

export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission(PERMISSIONS.PROJECT_READ);
    const projectId = request.nextUrl.searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json({ error: "projectId é obrigatório" }, { status: 400 });
    }
    await assertProjectAccess(session, projectId);
    const links = await listObsidianLinksByProject(projectId);
    return NextResponse.json({ data: links });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(PERMISSIONS.PROJECT_WRITE);
    const body = await request.json();
    const input = createObsidianLinkSchema.parse(body);
    const targetProjectId = input.projectId;
    if (targetProjectId) {
      await assertProjectAccess(session, targetProjectId);
    }
    const link = await createObsidianLink(input);

    await recordAuditLog({
      userId: session.user.id,
      action: "obsidian_link.create",
      entityType: "obsidian_link",
      entityId: link.id,
      metadata: { projectId: input.projectId, sheetId: input.sheetId, type: input.type },
      request,
    });

    return NextResponse.json({ data: link }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
