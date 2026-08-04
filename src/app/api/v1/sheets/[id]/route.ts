import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/auth/project-access";
import { handleApiError } from "@/lib/api/error-response";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { updateSheetSchema } from "@/lib/validations/sheet.schema";
import { getSheetById, updateSheet, softDeleteSheet } from "@/core/services/sheet.service";
import { recordAuditLog } from "@/core/services/audit-log.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission(PERMISSIONS.SHEET_READ);
    const { id } = await params;
    const sheet = await getSheetById(id);
    if (!sheet) {
      return NextResponse.json({ error: "Aba não encontrada" }, { status: 404 });
    }
    await assertProjectAccess(session, sheet.spreadsheet.projectId);
    return NextResponse.json({ data: sheet });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission(PERMISSIONS.SHEET_WRITE);
    const { id } = await params;
    const existing = await getSheetById(id);
    if (!existing) {
      return NextResponse.json({ error: "Aba não encontrada" }, { status: 404 });
    }
    await assertProjectAccess(session, existing.spreadsheet.projectId);
    const body = await request.json();
    const input = updateSheetSchema.parse(body);
    const sheet = await updateSheet(id, input);

    await recordAuditLog({
      userId: session.user.id,
      action: "sheet.update",
      entityType: "sheet",
      entityId: id,
      metadata: { changes: input },
      request,
    });

    return NextResponse.json({ data: sheet });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission(PERMISSIONS.SHEET_WRITE);
    const { id } = await params;
    const existing = await getSheetById(id);
    if (!existing) {
      return NextResponse.json({ error: "Aba não encontrada" }, { status: 404 });
    }
    await assertProjectAccess(session, existing.spreadsheet.projectId);
    await softDeleteSheet(id);

    await recordAuditLog({
      userId: session.user.id,
      action: "sheet.delete",
      entityType: "sheet",
      entityId: id,
      request,
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return handleApiError(error);
  }
}
