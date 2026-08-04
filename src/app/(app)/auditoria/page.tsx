import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { listAuditLogs } from "@/core/services/audit-log.service";
import { formatToAppTimeZone } from "@/lib/timezone";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Auditoria — Central de Monitoramento" };

interface PageProps {
  searchParams: Promise<{ entityType?: string }>;
}

const ENTITY_TYPES = [
  "project",
  "spreadsheet",
  "sheet",
  "schedule",
  "user",
  "role",
  "api_token",
  "obsidian_link",
];

export default async function AuditoriaPage({ searchParams }: PageProps) {
  await requirePermission(PERMISSIONS.AUDIT_LOG_READ);
  const { entityType } = await searchParams;

  const logs = await listAuditLogs({ entityType, take: 100 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Auditoria</h1>
        <p className="text-sm text-muted-foreground">
          Últimos 100 eventos {entityType ? `— filtrado por "${entityType}"` : ""}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href="/auditoria"
          className={`rounded-md border px-3 py-1 text-xs ${!entityType ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
        >
          Todos
        </a>
        {ENTITY_TYPES.map((type) => (
          <a
            key={type}
            href={`/auditoria?entityType=${type}`}
            className={`rounded-md border px-3 py-1 text-xs ${entityType === type ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
          >
            {type}
          </a>
        ))}
      </div>

      {logs.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <ScrollText className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Nenhum evento registrado ainda.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Entidade</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log: {
              id: string;
              createdAt: Date | string;
              user: { name: string; email: string } | null;
              action: string;
              entityType: string;
              entityId: string | null;
              ipAddress: string | null;
            }) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatToAppTimeZone(log.createdAt, "dd/MM/yyyy HH:mm:ss")}
                </TableCell>
                <TableCell className="text-sm">
                  {log.user ? (
                    <>
                      <p className="font-medium">{log.user.name}</p>
                      <p className="text-xs text-muted-foreground">{log.user.email}</p>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Sistema</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {log.entityType}
                  {log.entityId && (
                    <span className="ml-1 font-mono text-[10px]">
                      #{log.entityId.slice(0, 8)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {log.ipAddress ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
