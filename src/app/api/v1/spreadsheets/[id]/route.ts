import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/auth/project-access";
import { handleApiError } from "@/lib/api/error-response";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { updateSpreadsheetSchema } from "@/lib/validations/spreadsheet.schema";
import {
  getSpreadsheetById,
  updateSpreadsheet,
  softDeleteSpreadsheet,
} from "@/core/services/spreadsheet.service";
import { recordAuditLog } from "@/core/services/audit-log.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission(PERMISSIONS.SPREADSHEET_READ);
    const { id } = await params;
    const spreadsheet = await getSpreadsheetById(id);
    if (!spreadsheet) {
      return NextResponse.json({ error: "Planilha não encontrada" }, { status: 404 });
    }
    await assertProjectAccess(session, spreadsheet.projectId);
    return NextResponse.json({ data: spreadsheet });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission(PERMISSIONS.SPREADSHEET_WRITE);
    const { id } = await params;
    const existing = await getSpreadsheetById(id);
    if (!existing) {
      return NextResponse.json({ error: "Planilha não encontrada" }, { status: 404 });
    }
    await assertProjectAccess(session, existing.projectId);
    const body = await request.json();
    const input = updateSpreadsheetSchema.parse(body);
    const spreadsheet = await updateSpreadsheet(id, input);

    await recordAuditLog({
      userId: session.user.id,
      action: "spreadsheet.update",
      entityType: "spreadsheet",
      entityId: id,
      metadata: { changes: input },
      request,
    });

    return NextResponse.json({ data: spreadsheet });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission(PERMISSIONS.SPREADSHEET_WRITE);
    const { id } = await params;
    const existing = await getSpreadsheetById(id);
    if (!existing) {
      return NextResponse.json({ error: "Planilha não encontrada" }, { status: 404 });
    }
    await assertProjectAccess(session, existing.projectId);
    await softDeleteSpreadsheet(id);

    await recordAuditLog({
      userId: session.user.id,
      action: "spreadsheet.delete",
      entityType: "spreadsheet",
      entityId: id,
      request,
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return handleApiError(error);
  }
}
