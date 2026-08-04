import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/auth/project-access";
import { handleApiError } from "@/lib/api/error-response";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createSheetSchema } from "@/lib/validations/sheet.schema";
import { getSpreadsheetById } from "@/core/services/spreadsheet.service";
import { listSheetsBySpreadsheet, createSheet } from "@/core/services/sheet.service";
import { recordAuditLog } from "@/core/services/audit-log.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission(PERMISSIONS.SHEET_READ);
    const { id } = await params;
    const spreadsheet = await getSpreadsheetById(id);
    if (!spreadsheet) {
      return NextResponse.json({ error: "Planilha não encontrada" }, { status: 404 });
    }
    await assertProjectAccess(session, spreadsheet.projectId);
    const sheets = await listSheetsBySpreadsheet(id);
    return NextResponse.json({ data: sheets });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission(PERMISSIONS.SHEET_WRITE);
    const { id } = await params;
    const spreadsheet = await getSpreadsheetById(id);
    if (!spreadsheet) {
      return NextResponse.json({ error: "Planilha não encontrada" }, { status: 404 });
    }
    await assertProjectAccess(session, spreadsheet.projectId);
    const body = await request.json();
    const input = createSheetSchema.parse(body);
    const sheet = await createSheet(id, input);

    await recordAuditLog({
      userId: session.user.id,
      action: "sheet.create",
      entityType: "sheet",
      entityId: sheet.id,
      metadata: { spreadsheetId: id, name: sheet.name },
      request,
    });

    return NextResponse.json({ data: sheet }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
