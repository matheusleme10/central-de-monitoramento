import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/auth/project-access";
import { handleApiError } from "@/lib/api/error-response";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { upsertScheduleSchema } from "@/lib/validations/schedule.schema";
import { getSheetById } from "@/core/services/sheet.service";
import { upsertSchedule } from "@/core/services/schedule.service";
import { recordAuditLog } from "@/core/services/audit-log.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission(PERMISSIONS.SHEET_WRITE);
    const { id } = await params;
    const sheet = await getSheetById(id);
    if (!sheet) {
      return NextResponse.json({ error: "Aba não encontrada" }, { status: 404 });
    }
    await assertProjectAccess(session, sheet.spreadsheet.projectId);
    const body = await request.json();
    const input = upsertScheduleSchema.parse(body);
    const schedule = await upsertSchedule(id, input);

    await recordAuditLog({
      userId: session.user.id,
      action: "sheet.schedule.update",
      entityType: "schedule",
      entityId: id,
      metadata: { expectedInterval: input.expectedInterval, isActive: input.isActive },
      request,
    });

    return NextResponse.json({ data: schedule });
  } catch (error) {
    return handleApiError(error);
  }
}
