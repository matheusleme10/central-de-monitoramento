import type { Metadata } from "next";
import { Sheet as SheetIcon } from "lucide-react";
import { requirePermission } from "@/lib/auth/guards";
import { projectVisibilityWhere, isElevatedRole } from "@/lib/auth/project-access";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { prisma } from "@/infrastructure/database/prisma";
import { listAllSpreadsheets } from "@/core/services/spreadsheet.service";
import { PlanilhasTable } from "./planilhas-table";

export const metadata: Metadata = { title: "Planilhas — Central de Monitoramento" };

export default async function PlanilhasPage() {
  const session = await requirePermission(PERMISSIONS.SPREADSHEET_READ);

  let projectIds: string[] | undefined;
  if (!isElevatedRole(session.user.role)) {
    const accessible = await prisma.project.findMany({
      where: { deletedAt: null, ...projectVisibilityWhere(session) },
      select: { id: true },
    });
    projectIds = accessible.map((p: { id: string }) => p.id);
  }

  const spreadsheets = await listAllSpreadsheets(projectIds);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Planilhas</h1>
        <p className="text-sm text-muted-foreground">
          Todas as planilhas dos projetos autorizados para você
        </p>
      </div>

      {spreadsheets.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <SheetIcon className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Nenhuma planilha encontrada.
        </div>
      ) : (
        <PlanilhasTable spreadsheets={spreadsheets} />
      )}
    </div>
  );
}
