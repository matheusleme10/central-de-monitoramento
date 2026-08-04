import "server-only";
import type { Session } from "next-auth";
import { prisma } from "@/infrastructure/database/prisma";
import { buildProjectFilter } from "@/lib/auth/project-access";

export type GraphNodeKind =
  | "PROJECT"
  | "SPREADSHEET"
  | "SHEET"
  | "APPSCRIPT"
  | "DATABASE"
  | "API"
  | "DOCS";

export interface GraphNode {
  id: string;
  type: "graphNode";
  position: { x: number; y: number };
  data: {
    kind: GraphNodeKind;
    label: string;
    subtitle?: string;
    meta: Record<string, unknown>;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
  style?: Record<string, unknown>;
}

const COLUMN_WIDTH = 220;
const ROW_Y = { system: 0, project: 180, spreadsheet: 340, sheet: 500 };

/**
 * Monta o grafo (nós + arestas) combinando dados reais do banco (Projeto →
 * Planilha → Aba, restritos aos projetos visíveis ao usuário) com os nós
 * de sistema exigidos pela especificação (Apps Script, Banco, API,
 * Documentação). As arestas Aba→Apps Script só existem para abas que já
 * receberam ao menos uma execução real — o grafo reflete integração de
 * fato, não um diagrama estático fixo.
 */
export async function buildGraphData(
  session: Session,
  projectId?: string,
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const projects = await prisma.project.findMany({
    where: buildProjectFilter(session, projectId),
    orderBy: { name: "asc" },
    include: {
      spreadsheets: {
        where: { deletedAt: null },
        orderBy: { name: "asc" },
        include: {
          sheets: {
            where: { deletedAt: null },
            orderBy: { name: "asc" },
            include: { _count: { select: { updateEvents: true } } },
          },
        },
      },
      obsidianLinks: true,
    },
  });

  const sheetIds = projects.flatMap((p: { spreadsheets: { sheets: { id: string }[] }[] }) =>
    p.spreadsheets.flatMap((s) => s.sheets.map((sheet) => sheet.id)),
  );
  const sheetObsidianLinks = await prisma.obsidianLink.findMany({
    where: { sheetId: { in: sheetIds } },
  });
  const sheetLinksBySheet = new Map<string, typeof sheetObsidianLinks>();
  for (const link of sheetObsidianLinks) {
    if (!link.sheetId) continue;
    const list = sheetLinksBySheet.get(link.sheetId) ?? [];
    list.push(link);
    sheetLinksBySheet.set(link.sheetId, list);
  }

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let hasAnyIntegration = false;
  let hasAnyDocs = false;

  let cursorX = 0;
  const projectCenters: number[] = [];

  for (const project of projects) {
    const spreadsheetCenters: number[] = [];
    const spreadsheets = project.spreadsheets.length > 0 ? project.spreadsheets : [null];

    for (const spreadsheet of spreadsheets) {
      const sheets = spreadsheet?.sheets.length ? spreadsheet.sheets : [null];
      const sheetXs: number[] = [];

      for (const sheet of sheets) {
        const x = cursorX;
        sheetXs.push(x);

        if (sheet) {
          nodes.push({
            id: `sheet:${sheet.id}`,
            type: "graphNode",
            position: { x, y: ROW_Y.sheet },
            data: {
              kind: "SHEET",
              label: sheet.friendlyName || sheet.name,
              subtitle: `GID ${sheet.gid}`,
              meta: {
                sheetId: sheet.id,
                projectId: project.id,
                spreadsheetId: spreadsheet!.id,
                gid: sheet.gid,
                url: sheet.url,
                updateCount: sheet._count.updateEvents,
              },
            },
          });

          if (sheet._count.updateEvents > 0) {
            hasAnyIntegration = true;
            edges.push({
              id: `e-sheet-appscript:${sheet.id}`,
              source: `sheet:${sheet.id}`,
              target: "system:appscript",
              animated: true,
              style: { stroke: "#f59e0b" },
            });
          }

          if (sheetLinksBySheet.has(sheet.id)) {
            hasAnyDocs = true;
            edges.push({
              id: `e-sheet-docs:${sheet.id}`,
              source: `sheet:${sheet.id}`,
              target: "system:docs",
              style: { strokeDasharray: "4 4" },
            });
          }
        }

        cursorX += COLUMN_WIDTH;
      }

      const spreadsheetX =
        sheetXs.reduce((sum, x) => sum + x, 0) / sheetXs.length;
      spreadsheetCenters.push(spreadsheetX);

      if (spreadsheet) {
        nodes.push({
          id: `spreadsheet:${spreadsheet.id}`,
          type: "graphNode",
          position: { x: spreadsheetX, y: ROW_Y.spreadsheet },
          data: {
            kind: "SPREADSHEET",
            label: spreadsheet.friendlyName || spreadsheet.name,
            subtitle: `${spreadsheet.sheets.length} aba(s)`,
            meta: {
              spreadsheetId: spreadsheet.id,
              projectId: project.id,
              url: spreadsheet.url,
            },
          },
        });
        edges.push({
          id: `e-project-spreadsheet:${spreadsheet.id}`,
          source: `project:${project.id}`,
          target: `spreadsheet:${spreadsheet.id}`,
        });
        for (const sheet of spreadsheet.sheets) {
          edges.push({
            id: `e-spreadsheet-sheet:${sheet.id}`,
            source: `spreadsheet:${spreadsheet.id}`,
            target: `sheet:${sheet.id}`,
          });
        }
      }
    }

    const projectX =
      spreadsheetCenters.reduce((sum, x) => sum + x, 0) / spreadsheetCenters.length;
    projectCenters.push(projectX);

    nodes.push({
      id: `project:${project.id}`,
      type: "graphNode",
      position: { x: projectX, y: ROW_Y.project },
      data: {
        kind: "PROJECT",
        label: project.name,
        subtitle: `${project.spreadsheets.length} planilha(s)`,
        meta: {
          projectId: project.id,
          description: project.description,
          tags: project.tags,
        },
      },
    });
    edges.push({
      id: `e-project-api:${project.id}`,
      source: `project:${project.id}`,
      target: "system:api",
      style: { strokeDasharray: "4 4" },
    });

    if (project.obsidianLinks.length > 0) {
      hasAnyDocs = true;
      edges.push({
        id: `e-project-docs:${project.id}`,
        source: `project:${project.id}`,
        target: "system:docs",
        style: { strokeDasharray: "4 4" },
      });
    }
  }

  const centerX =
    projectCenters.length > 0
      ? projectCenters.reduce((sum, x) => sum + x, 0) / projectCenters.length
      : 0;

  nodes.push({
    id: "system:api",
    type: "graphNode",
    position: { x: centerX, y: ROW_Y.system },
    data: {
      kind: "API",
      label: "API",
      subtitle: "Route Handlers /api/v1",
      meta: { description: "Back-end da Central de Monitoramento (Next.js Route Handlers)." },
    },
  });
  nodes.push({
    id: "system:database",
    type: "graphNode",
    position: { x: centerX - COLUMN_WIDTH, y: ROW_Y.system },
    data: {
      kind: "DATABASE",
      label: "Banco",
      subtitle: "PostgreSQL",
      meta: { description: "PostgreSQL + Prisma ORM — armazena todo o domínio da aplicação." },
    },
  });
  nodes.push({
    id: "system:appscript",
    type: "graphNode",
    position: { x: centerX + COLUMN_WIDTH, y: ROW_Y.system },
    data: {
      kind: "APPSCRIPT",
      label: "Apps Script",
      subtitle: hasAnyIntegration ? "Enviando execuções" : "Nenhuma execução recebida ainda",
      meta: {
        description:
          "Biblioteca reutilizável (apps-script/central-monitoramento.gs.js) que reporta execuções via POST /api/v1/updates.",
      },
    },
  });
  nodes.push({
    id: "system:docs",
    type: "graphNode",
    position: { x: centerX + COLUMN_WIDTH * 2, y: ROW_Y.system },
    data: {
      kind: "DOCS",
      label: "Documentação",
      subtitle: hasAnyDocs ? "Links Obsidian configurados" : "Nenhum link configurado",
      meta: { description: "Documentação externa (Markdown/Obsidian) — integração opcional." },
    },
  });

  edges.push({ id: "e-api-database", source: "system:api", target: "system:database" });
  edges.push({
    id: "e-appscript-api",
    source: "system:appscript",
    target: "system:api",
    style: { strokeDasharray: "4 4" },
  });

  return { nodes, edges };
}
