"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowUpDown,
  ExternalLink,
  History,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
  Sheet as SheetIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { cn, formatResponsibleList } from "@/lib/utils";
import { formatToAppTimeZone } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/monitoring/status-badge";
import { MetricCard } from "@/components/monitoring/metric-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

// Presets de "Ocorrência de Atualização" — cada um vira `expectedInterval`
// (minutos) salvo em Schedule. "custom" usa o campo de dias digitado à mão.
const INTERVAL_PRESETS = [
  { key: "diaria-d0", label: "Diária (D-0)", days: 1 },
  { key: "diaria-d1", label: "Diária (D-1)", days: 1 },
  { key: "semanal", label: "Semanal", days: 7 },
  { key: "quinzenal", label: "Quinzenal", days: 15 },
  { key: "mensal", label: "Mensal", days: 31 },
  { key: "trimestral", label: "Trimestral (3 meses)", days: 90 },
] as const;

function presetKeyFromMinutes(minutes: number | null | undefined): string {
  if (!minutes) return "nenhum";
  const days = minutes / 1440;
  return INTERVAL_PRESETS.find((p) => p.days === days)?.key ?? "custom";
}

function minutesFromPreset(key: string, customDays: string): number | null {
  if (key === "nenhum") return null;
  if (key === "custom") {
    const days = Number(customDays);
    return days > 0 ? Math.round(days * 1440) : null;
  }
  const preset = INTERVAL_PRESETS.find((p) => p.key === key);
  return preset ? preset.days * 1440 : null;
}

function intervalLabel(minutes: number | null | undefined): string {
  if (!minutes) return "Sem intervalo definido";
  const days = minutes / 1440;
  const preset = INTERVAL_PRESETS.find((p) => p.days === days);
  if (preset) return preset.label;
  return Number.isInteger(days) ? `A cada ${days} dias` : `A cada ${Math.round(minutes / 60)}h`;
}

interface ResponsibleEntry {
  key: string;
  name: string;
  email: string;
}

function newResponsibleEntry(): ResponsibleEntry {
  return { key: crypto.randomUUID(), name: "", email: "" };
}

const sheetSchema = z.object({
  gid: z.string().trim().min(1, "GID é obrigatório"),
  name: z.string().trim().min(1, "Nome é obrigatório").max(200),
  friendlyName: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  url: z.string().trim().url("Informe a URL direta da aba"),
});
type SheetFormValues = z.infer<typeof sheetSchema>;

const editSheetSchema = z.object({
  friendlyName: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
});
type EditSheetFormValues = z.infer<typeof editSheetSchema>;

interface ScheduleData {
  expectedInterval: number | null;
  isActive: boolean;
}

interface ResponsibleRef {
  id: string;
  name: string;
  email: string;
}

interface SheetRow {
  id: string;
  gid: string;
  name: string;
  friendlyName: string | null;
  description: string | null;
  url: string;
  responsibles: ResponsibleRef[];
  schedule: ScheduleData | null;
}

interface SpreadsheetData {
  id: string;
  name: string;
  friendlyName: string | null;
  url: string;
  projectId: string;
  project: { id: string; name: string };
  sheets: SheetRow[];
}

interface LatestEventInfo {
  status: string;
  startedAt: string | Date;
  rowsProcessed: number | null;
}

// Filtra entradas vazias (usuário adicionou a linha e não preencheu) antes
// de mandar pro servidor — evita erro de validação bobo por linha em branco.
function cleanResponsibles(entries: ResponsibleEntry[]) {
  return entries
    .filter((e) => e.name.trim() || e.email.trim())
    .map((e) => ({ name: e.name.trim(), email: e.email.trim() }));
}

function ResponsiblesEditor({
  value,
  onChange,
}: {
  value: ResponsibleEntry[];
  onChange: (next: ResponsibleEntry[]) => void;
}) {
  function updateEntry(key: string, patch: Partial<ResponsibleEntry>) {
    onChange(value.map((entry) => (entry.key === key ? { ...entry, ...patch } : entry)));
  }
  function removeEntry(key: string) {
    onChange(value.filter((entry) => entry.key !== key));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Responsáveis</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => onChange([...value, newResponsibleEntry()])}
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar
        </Button>
      </div>
      {value.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhum responsável adicionado.</p>
      )}
      <div className="space-y-2">
        {value.map((entry) => (
          <div key={entry.key} className="flex gap-2">
            <Input
              placeholder="Nome"
              value={entry.name}
              onChange={(e) => updateEntry(entry.key, { name: e.target.value })}
            />
            <Input
              placeholder="email@empresa.com"
              value={entry.email}
              onChange={(e) => updateEntry(entry.key, { email: e.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => removeEntry(entry.key)}
              aria-label="Remover responsável"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SheetsClient({
  spreadsheet,
  projectId,
  canWrite,
  latestEventBySheet,
}: {
  spreadsheet: SpreadsheetData;
  projectId: string;
  canWrite: boolean;
  latestEventBySheet: Record<string, LatestEventInfo>;
}) {
  const router = useRouter();
  const [sheets, setSheets] = useState(spreadsheet.sheets);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SheetRow | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [createResponsibles, setCreateResponsibles] = useState<ResponsibleEntry[]>([]);

  const sortedSheets = [...sheets].sort((a, b) => {
    const nameA = (a.friendlyName || a.name).toLowerCase();
    const nameB = (b.friendlyName || b.name).toLowerCase();
    return sortAsc ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
  });

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const metrics = sheets.reduce(
    (acc, sheet) => {
      const event = latestEventBySheet[sheet.id];
      if (!event) acc.neverUpdated += 1;
      else if (event.status === "ERROR") acc.withError += 1;

      const expected = sheet.schedule?.isActive ? sheet.schedule.expectedInterval : null;
      if (expected) {
        if (!event) {
          acc.overdue += 1;
        } else {
          const ageMinutes = (Date.now() - new Date(event.startedAt).getTime()) / 60000;
          if (ageMinutes > expected) acc.overdue += 1;
          else acc.onTime += 1;
        }
      }
      return acc;
    },
    { neverUpdated: 0, withError: 0, overdue: 0, onTime: 0 },
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SheetFormValues>({ resolver: zodResolver(sheetSchema) });

  async function onCreate(values: SheetFormValues) {
    const response = await fetch(`/api/v1/spreadsheets/${spreadsheet.id}/sheets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, responsibles: cleanResponsibles(createResponsibles) }),
    });
    const body = await response.json();
    if (!response.ok) {
      toast.error(body.error ?? "Não foi possível criar a aba");
      return;
    }
    setSheets((prev) => [...prev, { ...body.data, schedule: null }]);
    toast.success("Aba cadastrada");
    setIsCreateOpen(false);
    reset();
    setCreateResponsibles([]);
    router.refresh();
  }

  async function handleDelete(id: string) {
    const response = await fetch(`/api/v1/sheets/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body.error ?? "Não foi possível excluir a aba");
      return;
    }
    setSheets((prev) => prev.filter((s) => s.id !== id));
    toast.success("Aba removida");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/projetos/${projectId}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {spreadsheet.project.name}
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">
            {spreadsheet.friendlyName || spreadsheet.name}
          </h1>
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <a href={spreadsheet.url} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
              Abrir no Google Sheets
            </a>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard icon={SheetIcon} label="Total de abas" value={sheets.length} />
        <MetricCard icon={CheckCircle2} label="Dentro do prazo" value={metrics.onTime} tone="success" />
        <MetricCard icon={Clock} label="Atrasadas" value={metrics.overdue} tone="warning" />
        <MetricCard icon={AlertTriangle} label="Nunca atualizadas" value={metrics.neverUpdated} tone="warning" />
        <MetricCard icon={XCircle} label="Com erro" value={metrics.withError} tone="destructive" />
      </div>

      <Card className="glow-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Abas</CardTitle>
            <CardDescription>Abas monitoradas dentro desta planilha</CardDescription>
          </div>
          {canWrite && (
            <Dialog
              open={isCreateOpen}
              onOpenChange={(open) => {
                setIsCreateOpen(open);
                if (!open) setCreateResponsibles([]);
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova aba
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nova aba</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onCreate)} className="space-y-4" noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input id="name" {...register("name")} />
                    {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="friendlyName">Nome amigável (opcional)</Label>
                    <Input id="friendlyName" {...register("friendlyName")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição (o que esta aba contém)</Label>
                    <Textarea
                      id="description"
                      rows={3}
                      placeholder="Ex.: Base de pedidos consolidada, atualizada diariamente pelo job do Coalesce..."
                      {...register("description")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gid">GID</Label>
                    <Input id="gid" placeholder="0" {...register("gid")} />
                    {errors.gid && <p className="text-xs text-destructive">{errors.gid.message}</p>}
                  </div>
                  <ResponsiblesEditor value={createResponsibles} onChange={setCreateResponsibles} />
                  <div className="space-y-2">
                    <Label htmlFor="url">URL direta da aba</Label>
                    <Input
                      id="url"
                      placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=0"
                      {...register("url")}
                    />
                    {errors.url && <p className="text-xs text-destructive">{errors.url.message}</p>}
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      Salvar
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {sheets.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma aba cadastrada.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => setSortAsc((prev) => !prev)}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      Nome
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </TableHead>
                  <TableHead>GID</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Ocorrência</TableHead>
                  <TableHead>Atualização</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSheets.map((sheet) => {
                  const isExpanded = expandedIds.has(sheet.id);
                  const canExpand = (sheet.description?.length ?? 0) > 80;
                  const event = latestEventBySheet[sheet.id];
                  return (
                    <TableRow key={sheet.id} className="transition-colors hover:bg-muted/40">
                      <TableCell className="font-medium">
                        <a
                          href={sheet.url}
                          target="_blank"
                          rel="noreferrer"
                          title="Abrir no Google Sheets"
                          className="inline-flex items-center gap-1.5 hover:text-primary hover:underline"
                        >
                          {sheet.friendlyName || sheet.name}
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                        </a>
                        {sheet.description && (
                          <div className="mt-0.5 max-w-md">
                            <p
                              className={cn(
                                "text-xs font-normal text-muted-foreground",
                                !isExpanded && "line-clamp-1",
                              )}
                            >
                              {sheet.description}
                            </p>
                            {canExpand && (
                              <button
                                type="button"
                                onClick={() => toggleExpanded(sheet.id)}
                                className="text-xs font-medium text-primary hover:underline"
                              >
                                {isExpanded ? "ver menos" : "ver mais"}
                              </button>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{sheet.gid}</TableCell>
                      <TableCell>
                        <span
                          className="text-sm"
                          title={sheet.responsibles.map((r) => `${r.name} <${r.email}>`).join(", ")}
                        >
                          {formatResponsibleList(sheet.responsibles)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={sheet.schedule?.expectedInterval ? "outline" : "secondary"}
                          className="whitespace-nowrap font-normal"
                        >
                          {intervalLabel(sheet.schedule?.expectedInterval)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {event ? formatToAppTimeZone(event.startedAt, "dd/MM/yyyy HH:mm") : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={event?.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild>
                            <Link
                              href={`/projetos/${projectId}/planilhas/${spreadsheet.id}/abas/${sheet.id}`}
                              title="Ver histórico de atualizações"
                            >
                              <History className="h-4 w-4" />
                            </Link>
                          </Button>
                          {canWrite && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditing(sheet)}
                              aria-label="Editar aba"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canWrite && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Excluir aba">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir aba?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    O histórico de atualizações vinculado deixará de aparecer nas
                                    listagens.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(sheet.id)}>
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editing && (
        <Dialog open onOpenChange={(open) => !open && setEditing(null)}>
          <EditSheetDialogContent
            sheet={editing}
            onSuccess={(updated) => {
              setSheets((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
              setEditing(null);
              router.refresh();
            }}
          />
        </Dialog>
      )}
    </div>
  );
}

function EditSheetDialogContent({
  sheet,
  onSuccess,
}: {
  sheet: SheetRow;
  onSuccess: (sheet: SheetRow) => void;
}) {
  const [intervalKey, setIntervalKey] = useState(
    presetKeyFromMinutes(sheet.schedule?.expectedInterval),
  );
  const [customDays, setCustomDays] = useState(
    sheet.schedule?.expectedInterval && intervalKey === "custom"
      ? String(sheet.schedule.expectedInterval / 1440)
      : "",
  );
  const [scheduleActive, setScheduleActive] = useState(sheet.schedule?.isActive ?? true);
  const [responsibles, setResponsibles] = useState<ResponsibleEntry[]>(
    sheet.responsibles.map((r) => ({ key: crypto.randomUUID(), name: r.name, email: r.email })),
  );

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<EditSheetFormValues>({
    resolver: zodResolver(editSheetSchema),
    defaultValues: {
      friendlyName: sheet.friendlyName ?? "",
      description: sheet.description ?? "",
    },
  });

  async function onSubmit(values: EditSheetFormValues) {
    const [sheetRes, scheduleRes] = await Promise.all([
      fetch(`/api/v1/sheets/${sheet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, responsibles: cleanResponsibles(responsibles) }),
      }),
      fetch(`/api/v1/sheets/${sheet.id}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedInterval: minutesFromPreset(intervalKey, customDays),
          isActive: scheduleActive,
        }),
      }),
    ]);

    const sheetBody = await sheetRes.json();
    if (!sheetRes.ok) {
      toast.error(sheetBody.error ?? "Não foi possível salvar a aba");
      return;
    }
    const scheduleBody = await scheduleRes.json();
    if (!scheduleRes.ok) {
      toast.error(scheduleBody.error ?? "Aba salva, mas a ocorrência não foi atualizada");
      onSuccess(sheetBody.data);
      return;
    }

    toast.success("Aba atualizada");
    onSuccess({ ...sheetBody.data, schedule: scheduleBody.data });
  }

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Editar aba</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="edit-friendlyName">Nome amigável</Label>
          <Input id="edit-friendlyName" {...register("friendlyName")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-description">Descrição (o que esta aba contém)</Label>
          <Textarea
            id="edit-description"
            rows={4}
            placeholder="Ex.: Base de pedidos consolidada, atualizada diariamente pelo job do Coalesce..."
            {...register("description")}
          />
        </div>

        <ResponsiblesEditor value={responsibles} onChange={setResponsibles} />

        <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="edit-interval">Ocorrência de Atualização</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Monitorar prazo</span>
              <Switch checked={scheduleActive} onCheckedChange={setScheduleActive} />
            </div>
          </div>
          <Select value={intervalKey} onValueChange={setIntervalKey}>
            <SelectTrigger id="edit-interval">
              <SelectValue placeholder="Selecione a frequência esperada" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nenhum">Sem intervalo definido</SelectItem>
              {INTERVAL_PRESETS.map((preset) => (
                <SelectItem key={preset.key} value={preset.key}>
                  {preset.label}
                </SelectItem>
              ))}
              <SelectItem value="custom">Personalizado (dias)</SelectItem>
            </SelectContent>
          </Select>
          {intervalKey === "custom" && (
            <Input
              type="number"
              min={1}
              placeholder="Quantidade de dias entre atualizações"
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value)}
            />
          )}
          <p className="text-xs text-muted-foreground">
            Define o intervalo esperado (Intervalo esperado) usado para sinalizar atraso nesta aba.
          </p>
        </div>

        <DialogFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
