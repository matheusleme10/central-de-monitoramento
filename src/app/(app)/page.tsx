import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/auth/project-access";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { listProjects } from "@/core/services/project.service";
import {
  getDashboardIndicators,
  getStatusDistribution,
  getLiveAlerts,
} from "@/core/services/dashboard.service";
import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = { title: "Dashboard — Central de Monitoramento" };

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await requirePermission(PERMISSIONS.PROJECT_READ);
  const { projectId } = await searchParams;

  if (projectId) {
    await assertProjectAccess(session, projectId);
  }

  const [indicators, distribution, alerts, projects] = await Promise.all([
    getDashboardIndicators(session, projectId),
    getStatusDistribution(session, projectId),
    getLiveAlerts(session, projectId),
    listProjects(session),
  ]);

  return (
    <DashboardClient
      indicators={indicators}
      distribution={distribution}
      alerts={alerts}
      projects={projects.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))}
      currentProjectId={projectId ?? ""}
      userName={session.user.name ?? ""}
    />
  );
}
