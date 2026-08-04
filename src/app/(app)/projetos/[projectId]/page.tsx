import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getProjectById } from "@/core/services/project.service";
import { listUsers } from "@/core/services/user.service";
import { listApiTokensByProject } from "@/core/services/api-token.service";
import { listObsidianLinksByProject } from "@/core/services/obsidian-link.service";
import { ProjectDetailClient } from "./project-detail-client";

export const metadata: Metadata = { title: "Detalhe do Projeto — Central de Monitoramento" };

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjetoDetailPage({ params }: PageProps) {
  const session = await requirePermission(PERMISSIONS.PROJECT_READ);
  const { projectId } = await params;

  const project = await getProjectById(session, projectId);
  if (!project) notFound();

  const canWrite =
    session.user.role === "SUPERADMIN" ||
    session.user.permissions.includes(PERMISSIONS.PROJECT_WRITE);
  const canManageUsers =
    session.user.role === "SUPERADMIN" ||
    session.user.permissions.includes(PERMISSIONS.USER_MANAGE);
  const canManageTokens =
    session.user.role === "SUPERADMIN" ||
    session.user.permissions.includes(PERMISSIONS.API_TOKEN_MANAGE);

  const allUsers = canWrite && canManageUsers ? await listUsers() : [];
  const apiTokens = canManageTokens ? await listApiTokensByProject(projectId) : [];
  const obsidianLinks = await listObsidianLinksByProject(projectId);

  return (
    <ProjectDetailClient
      project={project}
      allUsers={allUsers}
      canWrite={canWrite}
      canManageTokens={canManageTokens}
      apiTokens={apiTokens}
      obsidianLinks={obsidianLinks}
    />
  );
}
