"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { BookOpen, Download, ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const linkSchema = z.object({
  type: z.enum(["MARKDOWN", "URI"]),
  value: z.string().trim().min(1, "Informe o valor").max(500),
});
type LinkFormValues = z.infer<typeof linkSchema>;

interface ObsidianLinkRow {
  id: string;
  type: "MARKDOWN" | "URI";
  value: string;
  createdAt: string | Date;
}

export function ObsidianLinksSection({
  projectId,
  initialLinks,
}: {
  projectId: string;
  initialLinks: ObsidianLinkRow[];
}) {
  const [links, setLinks] = useState(initialLinks);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LinkFormValues>({
    resolver: zodResolver(linkSchema),
    defaultValues: { type: "URI" },
  });

  async function onCreate(values: LinkFormValues) {
    const response = await fetch("/api/v1/obsidian-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, projectId }),
    });
    const body = await response.json();
    if (!response.ok) {
      toast.error(body.error ?? "Não foi possível salvar o link");
      return;
    }
    setLinks((prev) => [body.data, ...prev]);
    toast.success("Link adicionado");
    setIsCreateOpen(false);
    reset({ type: "URI", value: "" });
  }

  async function handleDelete(id: string) {
    const response = await fetch(`/api/v1/obsidian-links/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body.error ?? "Não foi possível remover o link");
      return;
    }
    setLinks((prev) => prev.filter((l) => l.id !== id));
    toast.success("Link removido");
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Documentação (Obsidian — opcional)</CardTitle>
          <CardDescription>
            Exportação em Markdown funciona sempre; o link para o Obsidian é opcional
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <a href={`/api/v1/projects/${projectId}/export/markdown`} download>
              <Download className="h-4 w-4" />
              Baixar Markdown
            </a>
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Novo link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo link de documentação</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onCreate)} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={watch("type")} onValueChange={(v) => setValue("type", v as "MARKDOWN" | "URI")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="URI">URI obsidian://</SelectItem>
                      <SelectItem value="MARKDOWN">Caminho de arquivo Markdown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="value">Valor</Label>
                  <Input
                    id="value"
                    placeholder={
                      watch("type") === "URI"
                        ? "obsidian://open?vault=MeuVault&file=Projetos%2FNome"
                        : "Projetos/Nome-do-projeto.md"
                    }
                    {...register("value")}
                  />
                  {errors.value && <p className="text-xs text-destructive">{errors.value.message}</p>}
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
        </div>
      </CardHeader>
      <CardContent>
        {links.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            <BookOpen className="mx-auto mb-2 h-6 w-6 opacity-40" />
            Nenhum link configurado — a exportação em Markdown continua disponível.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => (
                <TableRow key={link.id}>
                  <TableCell>
                    <Badge variant="outline">{link.type === "URI" ? "URI" : "Markdown"}</Badge>
                  </TableCell>
                  <TableCell className="max-w-96 truncate font-mono text-xs text-muted-foreground">
                    {link.value}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {link.type === "URI" && (
                        <Button variant="ghost" size="icon" asChild>
                          <a href={link.value} title="Abrir no Obsidian">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Remover link">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover link?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita pela interface.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(link.id)}>
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
