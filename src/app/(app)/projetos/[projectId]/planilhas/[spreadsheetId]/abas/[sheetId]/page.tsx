import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/auth/project-access";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getSheetById } from "@/core/services/sheet.service";
import { listUpdateEventsBySheet } from "@/core/services/update-event.service";
import { getScheduleBySheet } from "@/core/services/schedule.service";
import { SheetHistoryClient } from "./sheet-history-client";

export const metadata: Metadata = { title: "Histórico da Aba — Central de Monitoramento" };

interface PageProps {
  params: Promise<{ projectId: string; spreadsheetId: string; sheetId: string }>;
}

export default async function SheetHistoryPage({ params }: PageProps) {
  const session = await requirePermission(PERMISSIONS.UPDATE_EVENT_READ);
  const { projectId, spreadsheetId, sheetId } = await params;

  await assertProjectAccess(session, projectId);
  const sheet = await getSheetById(sheetId);
  if (!sheet || sheet.spreadsheet.projectId !== projectId || sheet.spreadsheetId !== spreadsheetId) {
    notFound();
  }

  const [events, schedule] = await Promise.all([
    listUpdateEventsBySheet(sheetId),
    getScheduleBySheet(sheetId),
  ]);

  const canWrite =
    session.user.role === "SUPERADMIN" ||
    session.user.permissions.includes(PERMISSIONS.SHEET_WRITE);

  return (
    <SheetHistoryClient
      sheet={sheet}
      projectId={projectId}
      events={events}
      schedule={schedule}
      canWrite={canWrite}
    />
  );
}
