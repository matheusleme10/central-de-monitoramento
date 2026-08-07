import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/auth/project-access";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getSpreadsheetById } from "@/core/services/spreadsheet.service";
import { getLatestEventPerSheet } from "@/core/services/update-event.service";
import { SheetsClient } from "./sheets-client";

export const metadata: Metadata = { title: "Abas da Planilha — Central de Monitoramento" };

interface PageProps {
  params: Promise<{ projectId: string; spreadsheetId: string }>;
}

export default async function PlanilhaDetailPage({ params }: PageProps) {
  const session = await requirePermission(PERMISSIONS.SHEET_READ);
  const { projectId, spreadsheetId } = await params;

  await assertProjectAccess(session, projectId);
  const spreadsheet = await getSpreadsheetById(spreadsheetId);
  if (!spreadsheet || spreadsheet.projectId !== projectId) notFound();

  const canWrite =
    session.user.role === "SUPERADMIN" ||
    session.user.permissions.includes(PERMISSIONS.SHEET_WRITE);

  const latestEvents = await getLatestEventPerSheet(spreadsheet.sheets.map((s: { id: string }) => s.id));
  const latestEventBySheet = Object.fromEntries(
    Array.from(latestEvents.entries()).map(([sheetId, event]) => [
      sheetId,
      {
        status: event.status as string,
        startedAt: event.startedAt as Date,
        rowsProcessed: event.rowsProcessed as number | null,
      },
    ]),
  );

  return (
    <SheetsClient
      spreadsheet={spreadsheet}
      projectId={projectId}
      canWrite={canWrite}
      latestEventBySheet={latestEventBySheet}
    />
  );
}
