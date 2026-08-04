import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api/error-response";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createApiTokenSchema } from "@/lib/validations/api-token.schema";
import { getProjectById } from "@/core/services/project.service";
import { listApiTokensByProject, createApiToken } from "@/core/services/api-token.service";
import { recordAuditLog } from "@/core/services/audit-log.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission(PERMISSIONS.API_TOKEN_MANAGE);
    const { id } = await params;
    const existing = await getProjectById(session, id);
    if (!existing) {
      return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    }
    const tokens = await listApiTokensByProject(id);
    return NextResponse.json({ data: tokens });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission(PERMISSIONS.API_TOKEN_MANAGE);
    const { id } = await params;
    const existing = await getProjectById(session, id);
    if (!existing) {
      return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    }
    const body = await request.json();
    const input = createApiTokenSchema.parse(body);
    const token = await createApiToken(id, session.user.id, input);

    // Nunca inclua o token em texto puro no log de auditoria.
    await recordAuditLog({
      userId: session.user.id,
      action: "api_token.create",
      entityType: "api_token",
      entityId: token.id,
      metadata: { projectId: id, name: token.name, tokenPreview: token.tokenPreview },
      request,
    });

    return NextResponse.json({ data: token }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
