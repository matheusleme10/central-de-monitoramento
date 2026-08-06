"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  Sheet as SheetIcon,
  ChevronDown,
  History,
  ArrowUpDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/monitoring/status-badge";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatToAppTimeZone } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import { ApiTokensSection } from "./api-tokens-section";
import { ObsidianLinksSection } from "./obsidian-links-section";

const spreadsheetSchema = z.object({
  url: z.string().trim().url("Informe uma URL válida"),
  name: z.string().trim().min(1, "Nome é obrigatório").max(200),
  friendlyName: z.string().trim().max(200).optional().or(z.literal("")),
});
type SpreadsheetFormValues = z.infer<typeof spreadsheetSchema>;

const ACCESS_LEVEL_LABELS: Record<string, string> = {
  VIEWER: "Visualizador",
  EDITOR: "Editor",
  MANAGER: "Gerente",
};

interface SheetSummary {
  id: string;
  gid: string;
  name: string;
  friendlyName: string | null;
  description: string | null;
  url: string;
  responsible: { id: string; name: string; email: string } | null;
}

interface LatestEventInfo {
  status: string;
  startedAt: string | Date;
  rowsProcessed: number | null;
}

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  spreadsheets: Array<{
    id: string;
    name: string;
    friendlyName: string | null;
    url: string;
    spreadsheetId: string;
    sheets: SheetSummary[];
    _count: { sheets: number };
  }>;
  members: Array<{
    userId: string;
    accessLevel: string;
    user: { id: string; name: string; email: string; image: string | null };
  }>;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface ApiTokenRow {
  id: string;
  name: string;
  tokenPreview: string;
  expiresAt: string | Date | null;
  lastUsedAt: string | Date | null;
  revokedAt: string | Date | null;
  createdAt: string | Date;
}

interface ObsidianLinkRow {
  id: string;
  type: "MARKDOWN" | "URI";
  value: string;
  createdAt: string | Date;
}

function aggregateStatus(
  sheets: SheetSummary[],
  latestEventBySheet: Record<string, LatestEventInfo>,
): { label: string; variant: "success" | "destructive" | "warning" | "info" | "secondary" } {
  if (sheets.length === 0) return { label: "Sem abas", variant: "secondary" };

  let hasError = false;
  let hasRunning = false;
  let hasPending = false;

  for (const sheet of sheets) {
    const event = latestEventBySheet[sheet.id];
    if (!event) {
      hasPending = true;
    } else if (event.status === "ERROR") {
      hasError = true;
    } else if (event.status === "RUNNING") {
      hasRunning = true;
    }
  }

  if (hasError) return { label: "Com erro", variant: "destructive" };
  if (hasPending) return { label: "Pendente", variant: "warning" };
  if (hasRunning) return { label: "Em andamento", variant: "info" };
  return { label: "Atualizado", variant: "success" };
}

export function ProjectDetailClient({
  project,
  allUsers,
  canWrite,
  canManageTokens,
  apiTokens,
  obsidianLinks,
  latestEventBySheet,
}: {
  project: ProjectData;
  allUsers: UserOption[];
  canWrite: boolean;
  canManageTokens: boolean;
  apiTokens: ApiTokenRow[];
  obsidianLinks: ObsidianLinkRow[];
  latestEventBySheet: Record<string, LatestEventInfo>;
}) {
  const router = useRouter();
  const [spreadsheets, setSpreadsheets] = useState(project.spreadsheets);
  const [members, setMembers] = useState(project.members);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMemberOpen, setIsMemberOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggleCollapsed(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const [sortAsc, setSortAsc] = useState(true);

  function byName(a: { name: string; friendlyName: string | null }, b: { name: string; friendlyName: string | null }) {
    const nameA = (a.friendlyName || a.name).toLowerCase();
    const nameB = (b.friendlyName || b.name).toLowerCase();
    return sortAsc ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
  }

  const sortedSpreadsheets = [...spreadsheets].sort(byName);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SpreadsheetFormValues>({ resolver: zodResolver(spreadsheetSchema) });

  async function onCreateSpreadsheet(values: SpreadsheetFormValues) {
    const response = await fetch(`/api/v1/projects/${project.id}/spreadsheets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = await response.json();
    if (!response.ok) {
      toast.error(body.error ?? "Não foi possível criar a planilha");
      return;
    }
    setSpreadsheets((prev) => [...prev, { ...body.data, sheets: [], _count: { sheets: 0 } }]);
    toast.success("Planilha cadastrada");
    setIsCreateOpen(false);
    reset();
    router.refresh();
  }

  async function handleDeleteSpreadsheet(id: string) {
    const response = await fetch(`/api/v1/spreadsheets/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body.error ?? "Não foi possível excluir a planilha");
      return;
    }
    setSpreadsheets((prev) => prev.filter((s) => s.id !== id));
    toast.success("Planilha removida");
    router.refresh();
  }

  async function handleRemoveMember(userId: string) {
    const response = await fetch(`/api/v1/projects/${project.id}/members/${userId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body.error ?? "Não foi possível remover o membro");
      return;
    }
    setMembers((prev) => prev.filter((m) => m.userId !== userId));
    toast.success("Membro removido");
    router.refresh();
  }

  async function handleChangeAccessLevel(userId: string, accessLevel: string) {
    const response = await fetch(`/api/v1/projects/${project.id}/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessLevel }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body.error ?? "Não foi possível atualizar o acesso");
      return;
    }
    setMembers((prev) =>
      prev.map((m) => (m.userId === userId ? { ...m, accessLevel } : m)),
    );
    toast.success("Acesso atualizado");
  }

  const availableUsers = allUsers.filter(
    (u) => !members.some((m) => m.userId === u.id),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
        {project.description && (
          <p className="text-sm text-muted-foreground">{project.description}</p>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Planilhas</CardTitle>
            <CardDescription>Planilhas do Google Sheets vinculadas a este projeto</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setSortAsc((prev) => !prev)}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              Nome
            </Button>
            {canWrite && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova planilha
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova planilha</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onCreateSpreadsheet)} className="space-y-4" noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="url">URL do Google Sheets</Label>
                    <Input
                      id="url"
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      {...register("url")}
                    />
                    {errors.url && <p className="text-xs text-destructive">{errors.url.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input id="name" {...register("name")} />
                    {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="friendlyName">Nome amigável (opcional)</Label>
                    <Input id="friendlyName" {...register("friendlyName")} />
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
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {spreadsheets.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma planilha cadastrada.
            </p>
          ) : (
            sortedSpreadsheets.map((spreadsheet) => {
              const sortedSheets = [...spreadsheet.sheets].sort(byName);
              const status = aggregateStatus(spreadsheet.sheets, latestEventBySheet);
              const isCollapsed = collapsed.has(spreadsheet.id);
              const toneVar =
                status.variant === "destructive"
                  ? "var(--destructive)"
                  : status.variant === "warning"
                    ? "var(--warning)"
                    : status.variant === "info"
                      ? "var(--info)"
                      : status.variant === "success"
                        ? "var(--success)"
                        : "var(--border)";
              const barClass =
                status.variant === "destructive"
                  ? "from-destructive"
                  : status.variant === "warning"
                    ? "from-warning"
                    : status.variant === "info"
                      ? "from-info"
                      : status.variant === "success"
                        ? "from-success"
                        : "from-border";
              return (
                <div
                  key={spreadsheet.id}
                  style={{ "--glow": toneVar } as React.CSSProperties}
                  className="glow-card group relative overflow-hidden rounded-xl border bg-card transition-all duration-200"
                >
                  <span
                    className={cn(
                      "absolute inset-x-0 top-0 h-1 bg-gradient-to-r to-transparent",
                      barClass,
                    )}
                  />
                  <div className="flex flex-wrap items-center gap-3 p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <SheetIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/projetos/${project.id}/planilhas/${spreadsheet.id}`}
                        className="truncate font-medium hover:text-primary hover:underline"
                      >
                        {spreadsheet.friendlyName || spreadsheet.name}
                      </Link>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        ID: {spreadsheet.spreadsheetId} · {spreadsheet._count.sheets} aba(s)
                      </p>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                    <Button variant="ghost" size="icon" asChild>
                      <a href={spreadsheet.url} target="_blank" rel="noreferrer" title="Abrir no Google Sheets">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    {canWrite && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Excluir planilha">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir planilha?</AlertDialogTitle>
                            <AlertDialogDescription>
                              As abas e o histórico vinculados deixarão de aparecer nas listagens.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteSpreadsheet(spreadsheet.id)}>
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleCollapsed(spreadsheet.id)}
                      aria-label={isCollapsed ? "Expandir abas" : "Recolher abas"}
                    >
                      <ChevronDown
                        className={cn("h-4 w-4 transition-transform", isCollapsed && "-rotate-90")}
                      />
                    </Button>
                  </div>

                  {!isCollapsed &&
                    (spreadsheet.sheets.length === 0 ? (
                      <p className="border-t border-border px-4 py-4 text-center text-sm text-muted-foreground">
                        Nenhuma aba cadastrada nesta planilha.
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-t border-border hover:bg-transparent">
                            <TableHead>
                              <button
                                type="button"
                                onClick={() => setSortAsc((prev) => !prev)}
                                className="inline-flex items-center gap-1 hover:text-foreground"
                              >
                                Aba
                                <ArrowUpDown className="h-3.5 w-3.5" />
                              </button>
                            </TableHead>
                            <TableHead>Responsável</TableHead>
                            <TableHead>Linhas</TableHead>
                            <TableHead>Atualização</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Histórico</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedSheets.map((sheet) => {
                            const event = latestEventBySheet[sheet.id];
                            return (
                              <TableRow key={sheet.id}>
                                <TableCell className="font-medium">
                                  {sheet.friendlyName || sheet.name}
                                  {sheet.description && (
                                    <p className="mt-0.5 line-clamp-1 text-xs font-normal text-muted-foreground">
                                      {sheet.description}
                                    </p>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {sheet.responsible ? sheet.responsible.name : "—"}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {event?.rowsProcessed ?? "—"}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {event ? formatToAppTimeZone(event.startedAt, "dd/MM/yyyy HH:mm") : "—"}
                                </TableCell>
                                <TableCell>
                                  <StatusBadge status={event?.status} />
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="icon" asChild aria-label="Ver histórico">
                                    <Link
                                      href={`/projetos/${project.id}/planilhas/${spreadsheet.id}/abas/${sheet.id}`}
                                    >
                                      <History className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    ))}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {canWrite && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Membros do projeto</CardTitle>
              <CardDescription>
                Controla quais usuários (além de Superadmin/Admin) podem ver este projeto
              </CardDescription>
            </div>
            <Dialog open={isMemberOpen} onOpenChange={setIsMemberOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2" disabled={availableUsers.length === 0}>
                  <Plus className="h-4 w-4" />
                  Adicionar membro
                </Button>
              </DialogTrigger>
              <AddMemberDialog
                projectId={project.id}
                users={availableUsers}
                onSuccess={(member) => {
                  setMembers((prev) => [...prev, member]);
                  setIsMemberOpen(false);
                  router.refresh();
                }}
              />
            </Dialog>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum membro adicionado — apenas Superadmin/Admin veem este projeto.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Nível de acesso</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.userId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={member.user.image ?? undefined} />
                            <AvatarFallback className="text-xs">
                              {member.user.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{member.user.name}</p>
                            <p className="text-xs text-muted-foreground">{member.user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={member.accessLevel}
                          onValueChange={(value) => handleChangeAccessLevel(member.userId, value)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ACCESS_LEVEL_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(member.userId)}
                          aria-label="Remover membro"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {canManageTokens && (
        <ApiTokensSection projectId={project.id} initialTokens={apiTokens} />
      )}

      <ObsidianLinksSection projectId={project.id} initialLinks={obsidianLinks} />
    </div>
  );
}

function AddMemberDialog({
  projectId,
  users,
  onSuccess,
}: {
  projectId: string;
  users: UserOption[];
  onSuccess: (member: {
    userId: string;
    accessLevel: string;
    user: { id: string; name: string; email: string; image: string | null };
  }) => void;
}) {
  const [userId, setUserId] = useState<string>("");
  const [accessLevel, setAccessLevel] = useState<string>("VIEWER");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!userId) {
      toast.error("Selecione um usuário");
      return;
    }
    setIsSubmitting(true);
    const response = await fetch(`/api/v1/projects/${projectId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, accessLevel }),
    });
    const body = await response.json();
    setIsSubmitting(false);
    if (!response.ok) {
      toast.error(body.error ?? "Não foi possível adicionar o membro");
      return;
    }
    const user = users.find((u) => u.id === userId)!;
    toast.success("Membro adicionado");
    onSuccess({
      userId,
      accessLevel,
      user: { id: user.id, name: user.name, email: user.email, image: null },
    });
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Adicionar membro</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Usuário</Label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um usuário" />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Nível de acesso</Label>
          <Select value={accessLevel} onValueChange={setAccessLevel}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ACCESS_LEVEL_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Adicionar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
