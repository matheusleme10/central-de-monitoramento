import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/auth/project-access";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { buildGraphData } from "@/core/services/graph.service";
import { listProjects } from "@/core/services/project.service";
import { MapClient } from "./map-client";

export const metadata: Metadata = { title: "Mapa — Central de Monitoramento" };

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

export default async function MapaPage({ searchParams }: PageProps) {
  const session = await requirePermission(PERMISSIONS.PROJECT_READ);
  const { projectId } = await searchParams;

  if (projectId) {
    await assertProjectAccess(session, projectId);
  }

  const [{ nodes, edges }, projects] = await Promise.all([
    buildGraphData(session, projectId),
    listProjects(session),
  ]);

  const isSuperadmin = session.user.role === "SUPERADMIN";

  return (
    <MapClient
      initialNodes={nodes}
      initialEdges={edges}
      projects={projects.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))}
      currentProjectId={projectId ?? ""}
      isSuperadmin={isSuperadmin}
    />
  );
}
