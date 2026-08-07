"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  FolderKanban,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  Sheet as SheetIcon,
  Clock,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/monitoring/metric-card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { formatToAppTimeZone } from "@/lib/timezone";

const projectSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres").max(120),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  tagsInput: z.string().trim().max(400).optional().or(z.literal("")),
});
type ProjectFormValues = z.infer<typeof projectSchema>;

function parseTagsInput(value?: string): string[] {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );
}

interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  createdAt: string | Date;
  _count: { spreadsheets: number; members: number };
}

interface Indicators {
  spreadsheetsCount: number;
  sheetsCount: number;
  updatesOverdue: number;
  updatesError: number;
  neverUpdated: number;
}

export function ProjectsClient({
  initialProjects,
  canWrite,
  canDelete,
  indicators,
}: {
  initialProjects: ProjectRow[];
  canWrite: boolean;
  canDelete: boolean;
  indicators: Indicators;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectRow | null>(null);

  function refresh() {
    router.refresh();
  }

  async function handleDelete(id: string) {
    const response = await fetch(`/api/v1/projects/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body.error ?? "Não foi possível excluir o projeto");
      return;
    }
    setProjects((prev) => prev.filter((p) => p.id !== id));
    toast.success("Projeto removido");
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projetos</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} projeto(s) autorizado(s) para você
          </p>
        </div>

        {canWrite && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo projeto
              </Button>
            </DialogTrigger>
            <ProjectFormDialogContent
              onSuccess={(project) => {
                setProjects((prev) => [...prev, { ...project, _count: { spreadsheets: 0, members: 0 } }]);
                setIsCreateOpen(false);
                refresh();
              }}
            />
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard icon={FolderKanban} label="Projetos" value={projects.length} />
        <MetricCard icon={SheetIcon} label="Abas monitoradas" value={indicators.sheetsCount} />
        <MetricCard icon={Clock} label="Atrasadas" value={indicators.updatesOverdue} tone="warning" />
        <MetricCard icon={AlertTriangle} label="Nunca atualizadas" value={indicators.neverUpdated} tone="warning" />
        <MetricCard icon={XCircle} label="Com erro" value={indicators.updatesError} tone="destructive" />
      </div>

      {projects.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <FolderKanban className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Nenhum projeto encontrado.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Planilhas</TableHead>
              <TableHead>Membros</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell>
                  <Link
                    href={`/projetos/${project.id}`}
                    className="font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {project.name}
                  </Link>
                  {project.description && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {project.description}
                    </p>
                  )}
                  {project.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {project.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell>{project._count.spreadsheets}</TableCell>
                <TableCell>{project._count.members}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatToAppTimeZone(project.createdAt, "dd/MM/yyyy")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {canWrite && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditing(project)}
                        aria-label="Editar projeto"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Excluir projeto">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
                            <AlertDialogDescription>
                              &ldquo;{project.name}&rdquo; será removido (soft delete) e deixará de
                              aparecer nas listagens. Esta ação pode ser revertida apenas no banco de
                              dados.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(project.id)}>
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

      {editing && (
        <Dialog open onOpenChange={(open) => !open && setEditing(null)}>
          <ProjectFormDialogContent
            project={editing}
            onSuccess={(project) => {
              setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, ...project } : p)));
              setEditing(null);
              refresh();
            }}
          />
        </Dialog>
      )}
    </div>
  );
}

function ProjectFormDialogContent({
  project,
  onSuccess,
}: {
  project?: ProjectRow;
  onSuccess: (project: ProjectRow) => void;
}) {
  const isEditing = Boolean(project);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name ?? "",
      description: project?.description ?? "",
      tagsInput: project?.tags.join(", ") ?? "",
    },
  });

  async function onSubmit(values: ProjectFormValues) {
    const url = isEditing ? `/api/v1/projects/${project!.id}` : "/api/v1/projects";
    const response = await fetch(url, {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        description: values.description,
        tags: parseTagsInput(values.tagsInput),
      }),
    });

    const body = await response.json();
    if (!response.ok) {
      toast.error(body.error ?? "Não foi possível salvar o projeto");
      return;
    }

    toast.success(isEditing ? "Projeto atualizado" : "Projeto criado");
    onSuccess(body.data);
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Editar projeto" : "Novo projeto"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" {...register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea id="description" rows={3} {...register("description")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tagsInput">Tags (separadas por vírgula)</Label>
          <Input id="tagsInput" placeholder="financeiro, mensal, crítico" {...register("tagsInput")} />
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
