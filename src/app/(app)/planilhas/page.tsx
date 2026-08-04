import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Sheet as SheetIcon } from "lucide-react";
import { requirePermission } from "@/lib/auth/guards";
import { projectVisibilityWhere, isElevatedRole } from "@/lib/auth/project-access";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { prisma } from "@/infrastructure/database/prisma";
import { listAllSpreadsheets } from "@/core/services/spreadsheet.service";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Projeto</TableHead>
              <TableHead>Abas</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {spreadsheets.map(
              (sheet: {
                id: string;
                name: string;
                friendlyName: string | null;
                url: string;
                projectId: string;
                project: { name: string };
                _count: { sheets: number };
              }) => (
              <TableRow key={sheet.id}>
                <TableCell>
                  <Link
                    href={`/projetos/${sheet.projectId}/planilhas/${sheet.id}`}
                    className="font-medium hover:text-primary hover:underline"
                  >
                    {sheet.friendlyName || sheet.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/projetos/${sheet.projectId}`}
                    className="text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {sheet.project.name}
                  </Link>
                </TableCell>
                <TableCell>{sheet._count.sheets}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" asChild>
                    <a href={sheet.url} target="_blank" rel="noreferrer" title="Abrir no Google Sheets">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </TableCell>
              </TableRow>
              ),
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
