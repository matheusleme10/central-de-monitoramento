"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { ROLE_LABELS, type RoleKey } from "@/lib/constants/roles";
import { PERMISSION_LABELS, type PermissionKey } from "@/lib/constants/permissions";

interface Permission {
  id: string;
  key: string;
  description: string | null;
}

interface RoleWithPermissions {
  id: string;
  name: RoleKey;
  permissions: Array<{ permissionId: string }>;
}

export function PermissionsMatrixClient({
  roles,
  permissions,
  canEdit,
}: {
  roles: RoleWithPermissions[];
  permissions: Permission[];
  canEdit: boolean;
}) {
  const [matrix, setMatrix] = useState<Record<string, Set<string>>>(() =>
    Object.fromEntries(
      roles.map((role) => [role.id, new Set(role.permissions.map((p) => p.permissionId))]),
    ),
  );
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);

  async function togglePermission(role: RoleWithPermissions, permissionId: string) {
    if (!canEdit || role.name === "SUPERADMIN") return;

    const current = new Set(matrix[role.id]);
    const willEnable = !current.has(permissionId);
    if (willEnable) current.add(permissionId);
    else current.delete(permissionId);

    setMatrix((prev) => ({ ...prev, [role.id]: current }));
    setSavingRoleId(role.id);

    const response = await fetch(`/api/v1/roles/${role.id}/permissions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissionIds: Array.from(current) }),
    });

    setSavingRoleId(null);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body.error ?? "Não foi possível atualizar a permissão");
      // reverte
      setMatrix((prev) => ({
        ...prev,
        [role.id]: new Set(role.permissions.map((p) => p.permissionId)),
      }));
      return;
    }

    toast.success(`Permissões de ${ROLE_LABELS[role.name]} atualizadas`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Permissões</h1>
        <p className="text-sm text-muted-foreground">
          {canEdit
            ? "Edite a matriz de permissões por papel. Superadmin sempre tem acesso total."
            : "Somente o Superadmin pode editar esta matriz."}
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-56">Permissão</TableHead>
            {roles.map((role) => (
              <TableHead key={role.id} className="text-center">
                {ROLE_LABELS[role.name]}
                {savingRoleId === role.id && (
                  <Loader2 className="ml-1 inline h-3 w-3 animate-spin" />
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {permissions.map((permission) => (
            <TableRow key={permission.id}>
              <TableCell>
                <p className="text-sm font-medium">
                  {PERMISSION_LABELS[permission.key as PermissionKey] ?? permission.key}
                </p>
                <p className="text-xs text-muted-foreground">
                  {permission.description || permission.key}
                </p>
              </TableCell>
              {roles.map((role) => {
                const isSuperadmin = role.name === "SUPERADMIN";
                const checked = isSuperadmin || matrix[role.id]?.has(permission.id);
                return (
                  <TableCell key={role.id} className="text-center">
                    <Checkbox
                      checked={checked}
                      disabled={!canEdit || isSuperadmin}
                      onCheckedChange={() => togglePermission(role, permission.id)}
                    />
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
