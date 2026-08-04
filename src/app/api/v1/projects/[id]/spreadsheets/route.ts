import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api/error-response";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createSpreadsheetInputSchema } from "@/lib/validations/spreadsheet.schema";
import { getProjectById } from "@/core/services/project.service";
import {
  listSpreadsheetsByProject,
  createSpreadsheet,
} from "@/core/services/spreadsheet.service";
import { recordAuditLog } from "@/core/services/audit-log.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission(PERMISSIONS.SPREADSHEET_READ);
    const { id } = await params;
    const existing = await getProjectById(session, id);
    if (!existing) {
      return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    }
    const spreadsheets = await listSpreadsheetsByProject(id);
    return NextResponse.json({ data: spreadsheets });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission(PERMISSIONS.SPREADSHEET_WRITE);
    const { id } = await params;
    const existing = await getProjectById(session, id);
    if (!existing) {
      return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    }
    const body = await request.json();
    const input = createSpreadsheetInputSchema.parse(body);
    const spreadsheet = await createSpreadsheet(id, input);

    await recordAuditLog({
      userId: session.user.id,
      action: "spreadsheet.create",
      entityType: "spreadsheet",
      entityId: spreadsheet.id,
      metadata: { projectId: id, name: spreadsheet.name },
      request,
    });

    return NextResponse.json({ data: spreadsheet }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
