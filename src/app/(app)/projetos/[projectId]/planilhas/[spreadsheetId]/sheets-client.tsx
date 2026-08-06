"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/monitoring/status-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface SheetRow {
  id: string;
  gid: string;
  name: string;
  friendlyName: string | null;
  description: string | null;
  url: string;
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

export function SheetsClient({
  spreadsheet,
  projectId,
  canWrite,
  latestStatusBySheet,
}: {
  spreadsheet: SpreadsheetData;
  projectId: string;
  canWrite: boolean;
  latestStatusBySheet: Record<string, string>;
}) {
  const router = useRouter();
  const [sheets, setSheets] = useState(spreadsheet.sheets);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SheetRow | null>(null);

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
      body: JSON.stringify(values),
    });
    const body = await response.json();
    if (!response.ok) {
      toast.error(body.error ?? "Não foi possível criar a aba");
      return;
    }
    setSheets((prev) => [...prev, body.data]);
    toast.success("Aba cadastrada");
    setIsCreateOpen(false);
    reset();
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Abas</CardTitle>
            <CardDescription>Abas monitoradas dentro desta planilha</CardDescription>
          </div>
          {canWrite && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova aba
                </Button>
              </DialogTrigger>
              <DialogContent>
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
                  <TableHead>Nome</TableHead>
                  <TableHead>GID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sheets.map((sheet) => (
                  <TableRow key={sheet.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/projetos/${projectId}/planilhas/${spreadsheet.id}/abas/${sheet.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {sheet.friendlyName || sheet.name}
                      </Link>
                      {sheet.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs font-normal text-muted-foreground">
                          {sheet.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{sheet.gid}</TableCell>
                    <TableCell>
                      <StatusBadge status={latestStatusBySheet[sheet.id]} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <a href={sheet.url} target="_blank" rel="noreferrer" title="Abrir no Google Sheets">
                            <ExternalLink className="h-4 w-4" />
                          </a>
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
                ))}
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
    const response = await fetch(`/api/v1/sheets/${sheet.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = await response.json();
    if (!response.ok) {
      toast.error(body.error ?? "Não foi possível salvar a aba");
      return;
    }
    toast.success("Aba atualizada");
    onSuccess(body.data);
  }

  return (
    <DialogContent>
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
