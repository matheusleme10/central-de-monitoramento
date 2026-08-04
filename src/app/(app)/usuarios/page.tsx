import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { listUsers } from "@/core/services/user.service";
import { UsersClient } from "./users-client";

export const metadata: Metadata = { title: "Usuários — Central de Monitoramento" };

export default async function UsuariosPage() {
  const session = await requirePermission(PERMISSIONS.USER_MANAGE);
  const users = await listUsers();

  return <UsersClient initialUsers={users} currentUserId={session.user.id} />;
}
