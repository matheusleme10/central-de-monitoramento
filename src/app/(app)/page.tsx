import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/auth/project-access";
import { PERMISSIONS } from "@/lib/constants/permissions";
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

  const [indicators, distribution, alerts] = await Promise.all([
    getDashboardIndicators(session, projectId),
    getStatusDistribution(session, projectId),
    getLiveAlerts(session, projectId),
  ]);

  return (
    <DashboardClient
      indicators={indicators}
      distribution={distribution}
      alerts={alerts}
      userName={session.user.name ?? ""}
    />
  );
}
