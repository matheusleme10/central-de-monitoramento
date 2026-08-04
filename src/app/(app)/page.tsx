import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/auth/project-access";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { listProjects } from "@/core/services/project.service";
import {
  getDashboardIndicators,
  getStatusDistribution,
  getUpdatesTimeseries,
  getLiveAlerts,
} from "@/core/services/dashboard.service";
import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = { title: "Dashboard — Central de Monitoramento" };

interface PageProps {
  searchParams: Promise<{ projectId?: string; days?: string }>;
}

const VALID_DAY_RANGES = [7, 14, 30];

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await requirePermission(PERMISSIONS.PROJECT_READ);
  const { projectId, days: daysParam } = await searchParams;

  const days = VALID_DAY_RANGES.includes(Number(daysParam)) ? Number(daysParam) : 14;

  if (projectId) {
    await assertProjectAccess(session, projectId);
  }

  const [indicators, distribution, timeseries, alerts, projects] = await Promise.all([
    getDashboardIndicators(session, projectId),
    getStatusDistribution(session, projectId),
    getUpdatesTimeseries(session, projectId, days),
    getLiveAlerts(session, projectId),
    listProjects(session),
  ]);

  return (
    <DashboardClient
      indicators={indicators}
      distribution={distribution}
      timeseries={timeseries}
      alerts={alerts}
      projects={projects.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))}
      currentProjectId={projectId ?? ""}
      currentDays={days}
      userName={session.user.name ?? ""}
    />
  );
}
