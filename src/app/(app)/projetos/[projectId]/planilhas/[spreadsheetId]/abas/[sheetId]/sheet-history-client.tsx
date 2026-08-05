"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, History, Loader2, Save } from "lucide-react";

import { StatusBadge } from "@/components/monitoring/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { formatToAppTimeZone } from "@/lib/timezone";

interface SheetData {
  id: string;
  name: string;
  friendlyName: string | null;
  gid: string;
  spreadsheet: {
    id: string;
    name: string;
    projectId: string;
    project: { name: string };
  };
}

interface ScheduleData {
  id: string;
  expectedInterval: number | null;
  isActive: boolean;
}

interface UpdateEventRow {
  id: string;
  executionId: string;
  startedAt: string | Date;
  finishedAt: string | Date | null;
  durationMs: number | null;
  rowsProcessed: number | null;
  status: string;
  message: string | null;
  errorCode: string | null;
}

function formatDuration(ms: number | null) {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export function SheetHistoryClient({
  sheet,
  projectId,
  events,
  schedule,
  canWrite,
}: {
  sheet: SheetData;
  projectId: string;
  events: UpdateEventRow[];
  schedule: ScheduleData | null;
  canWrite: boolean;
}) {
  const [expectedInterval, setExpectedInterval] = useState(
    schedule?.expectedInterval ? String(schedule.expectedInterval) : "",
  );
  const [isActive, setIsActive] = useState(schedule?.isActive ?? true);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSaveSchedule() {
    setIsSaving(true);
    const response = await fetch(`/api/v1/sheets/${sheet.id}/schedule`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expectedInterval: expectedInterval ? Number(expectedInterval) : null,
        isActive,
      }),
    });
    setIsSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body.error ?? "Não foi possível salvar o intervalo esperado");
      return;
    }
    toast.success("Intervalo esperado atualizado");
  }
  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/projetos/${projectId}/planilhas/${sheet.spreadsheet.id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {sheet.spreadsheet.name}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {sheet.friendlyName || sheet.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Status da última atualização — {sheet.spreadsheet.project.name}
        </p>
      </div>

      {canWrite && (
        <Card>
          <CardHeader>
            <CardTitle>Intervalo esperado</CardTitle>
            <CardDescription>
              Usado para calcular &ldquo;atualizações atrasadas&rdquo; no Dashboard e nos alertas
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="expectedInterval">Minutos entre execuções</Label>
              <Input
                id="expectedInterval"
                type="number"
                min={1}
                placeholder="ex.: 60"
                className="w-40"
                value={expectedInterval}
                onChange={(e) => setExpectedInterval(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Ativo</Label>
            </div>
            <Button onClick={handleSaveSchedule} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
          </CardContent>
        </Card>
      )}

      {events.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <History className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Nenhuma execução registrada ainda. Esta aba será atualizada automaticamente assim
          que o Apps Script enviar o primeiro evento para{" "}
          <code className="rounded bg-muted px-1 py-0.5">POST /api/v1/updates</code>.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Linhas</TableHead>
              <TableHead>Execução</TableHead>
              <TableHead>Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell>
                  <StatusBadge status={event.status} />
                </TableCell>
                <TableCell className="text-sm">
                  {formatToAppTimeZone(event.startedAt, "dd/MM/yyyy HH:mm:ss")}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDuration(event.durationMs)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {event.rowsProcessed ?? "—"}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {event.executionId}
                </TableCell>
                <TableCell className="max-w-64 text-sm text-muted-foreground">
                  {event.message || event.errorCode ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="line-clamp-1 cursor-default">
                          {event.errorCode ? `[${event.errorCode}] ` : ""}
                          {event.message}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-80">
                        {event.errorCode ? `[${event.errorCode}] ` : ""}
                        {event.message}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
