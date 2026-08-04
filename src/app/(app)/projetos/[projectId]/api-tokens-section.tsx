"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Copy, Key, Loader2, Plus, Trash2 } from "lucide-react";

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
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatToAppTimeZone } from "@/lib/timezone";

const tokenSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres").max(120),
  expiresInDays: z.coerce.number().int().positive().max(3650).optional(),
});
type TokenFormValues = z.infer<typeof tokenSchema>;

interface ApiTokenRow {
  id: string;
  name: string;
  tokenPreview: string;
  expiresAt: string | Date | null;
  lastUsedAt: string | Date | null;
  revokedAt: string | Date | null;
  createdAt: string | Date;
}

export function ApiTokensSection({
  projectId,
  initialTokens,
}: {
  projectId: string;
  initialTokens: ApiTokenRow[];
}) {
  const [tokens, setTokens] = useState(initialTokens);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TokenFormValues>({ resolver: zodResolver(tokenSchema) });

  async function onCreate(values: TokenFormValues) {
    const response = await fetch(`/api/v1/projects/${projectId}/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = await response.json();
    if (!response.ok) {
      toast.error(body.error ?? "Não foi possível criar o token");
      return;
    }
    const { token, ...safeToken } = body.data;
    setTokens((prev) => [safeToken, ...prev]);
    setNewToken(token);
    reset();
  }

  async function handleRevoke(tokenId: string) {
    const response = await fetch(`/api/v1/projects/${projectId}/tokens/${tokenId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body.error ?? "Não foi possível revogar o token");
      return;
    }
    setTokens((prev) =>
      prev.map((t) => (t.id === tokenId ? { ...t, revokedAt: new Date().toISOString() } : t)),
    );
    toast.success("Token revogado");
  }

  function copyToken() {
    if (!newToken) return;
    navigator.clipboard.writeText(newToken);
    toast.success("Token copiado");
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Tokens de API</CardTitle>
          <CardDescription>
            Usados pela biblioteca do Apps Script para enviar atualizações a este projeto
          </CardDescription>
        </div>
        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) setNewToken(null);
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Novo token
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo token de API</DialogTitle>
            </DialogHeader>

            {newToken ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Copie o token agora — ele não será exibido novamente.
                </p>
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-3 font-mono text-xs">
                  <span className="flex-1 break-all">{newToken}</span>
                  <Button variant="ghost" size="icon" onClick={copyToken} aria-label="Copiar token">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => {
                      setIsCreateOpen(false);
                      setNewToken(null);
                    }}
                  >
                    Concluir
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onCreate)} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" placeholder="Apps Script — Planilha Vendas" {...register("name")} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiresInDays">Expira em (dias, opcional)</Label>
                  <Input id="expiresInDays" type="number" placeholder="365" {...register("expiresInDays")} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Gerar token
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {tokens.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            <Key className="mx-auto mb-2 h-6 w-6 opacity-40" />
            Nenhum token gerado ainda.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Token</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último uso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((token) => {
                const isExpired = token.expiresAt && new Date(token.expiresAt) < new Date();
                const isRevoked = Boolean(token.revokedAt);
                return (
                  <TableRow key={token.id}>
                    <TableCell className="font-medium">{token.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {token.tokenPreview}
                    </TableCell>
                    <TableCell>
                      {isRevoked ? (
                        <Badge variant="secondary">Revogado</Badge>
                      ) : isExpired ? (
                        <Badge variant="destructive">Expirado</Badge>
                      ) : (
                        <Badge variant="success">Ativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {token.lastUsedAt
                        ? formatToAppTimeZone(token.lastUsedAt, "dd/MM/yyyy HH:mm")
                        : "Nunca usado"}
                    </TableCell>
                    <TableCell className="text-right">
                      {!isRevoked && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Revogar token">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Revogar token?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Qualquer Apps Script usando &ldquo;{token.name}&rdquo; deixará de
                                conseguir enviar atualizações imediatamente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRevoke(token.id)}>
                                Revogar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
