import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { listProjects } from "@/core/services/project.service";
import { getDashboardIndicators } from "@/core/services/dashboard.service";
import { ProjectsClient } from "./projects-client";

export const metadata: Metadata = { title: "Projetos — Central de Monitoramento" };

export default async function ProjetosPage() {
  const session = await requirePermission(PERMISSIONS.PROJECT_READ);
  // Sem projectId = agregado de todos os projetos visíveis pra esta sessão
  // (mesmo escopo/lógica usados no Dashboard).
  const [projects, indicators] = await Promise.all([
    listProjects(session),
    getDashboardIndicators(session),
  ]);

  const canWrite =
    session.user.role === "SUPERADMIN" ||
    session.user.permissions.includes(PERMISSIONS.PROJECT_WRITE);
  const canDelete =
    session.user.role === "SUPERADMIN" ||
    session.user.permissions.includes(PERMISSIONS.PROJECT_DELETE);

  return (
    <ProjectsClient
      initialProjects={projects}
      canWrite={canWrite}
      canDelete={canDelete}
      indicators={indicators}
    />
  );
}
