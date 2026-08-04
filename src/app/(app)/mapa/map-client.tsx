"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Node,
  type Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import { ExternalLink, History, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { GraphNode, type GraphNodeData } from "./graph-node";
import type { GraphNodeKind } from "@/core/services/graph.service";

const nodeTypes = { graphNode: GraphNode };

const KIND_LABELS: Record<GraphNodeKind, string> = {
  PROJECT: "Projeto",
  SPREADSHEET: "Planilha",
  SHEET: "Aba",
  APPSCRIPT: "Apps Script",
  DATABASE: "Banco",
  API: "API",
  DOCS: "Documentação",
};

const ALL_KINDS = Object.keys(KIND_LABELS) as GraphNodeKind[];

function MapCanvas({
  initialNodes,
  initialEdges,
}: {
  initialNodes: Node<GraphNodeData>[];
  initialEdges: Edge[];
}) {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const [query, setQuery] = useState("");
  const [visibleKinds, setVisibleKinds] = useState<Set<GraphNodeKind>>(new Set(ALL_KINDS));
  const [selected, setSelected] = useState<Node<GraphNodeData> | null>(null);

  const decoratedNodes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return nodes
      .filter((node) => visibleKinds.has(node.data.kind))
      .map((node) => ({
        ...node,
        data: {
          ...node.data,
          dimmed: q.length > 0 && !node.data.label.toLowerCase().includes(q),
          highlighted: q.length > 0 && node.data.label.toLowerCase().includes(q),
        },
      }));
  }, [nodes, visibleKinds, query]);

  const visibleIds = useMemo(() => new Set(decoratedNodes.map((n) => n.id)), [decoratedNodes]);
  const filteredEdges = useMemo(
    () => edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target)),
    [edges, visibleIds],
  );

  function toggleKind(kind: GraphNodeKind) {
    setVisibleKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<GraphNodeData>) => {
    setSelected(node);
  }, []);

  return (
    <div className="flex h-[calc(100vh-9rem)] gap-3">
      <div className="relative flex-1 rounded-lg border border-border">
        <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar no grafo..."
              className="w-56 bg-background pl-8"
            />
          </div>
          <div className="flex flex-wrap gap-2 rounded-md border border-border bg-background p-2 shadow-sm">
            {ALL_KINDS.map((kind) => (
              <label key={kind} className="flex items-center gap-1.5 text-xs">
                <Checkbox
                  checked={visibleKinds.has(kind)}
                  onCheckedChange={() => toggleKind(kind)}
                />
                {KIND_LABELS[kind]}
              </label>
            ))}
          </div>
        </div>

        <ReactFlow
          nodes={decoratedNodes}
          edges={filteredEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={() => setSelected(null)}
          fitView
          minZoom={0.2}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
          <MiniMap
            pannable
            zoomable
            nodeColor={() => "hsl(var(--primary))"}
            maskColor="hsl(var(--background) / 0.6)"
          />
        </ReactFlow>
      </div>

      {selected && <NodeDetailsPanel node={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function NodeDetailsPanel({
  node,
  onClose,
}: {
  node: Node<GraphNodeData>;
  onClose: () => void;
}) {
  const { kind, label, meta } = node.data;

  return (
    <aside className="w-80 shrink-0 overflow-y-auto rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {KIND_LABELS[kind]}
          </p>
          <h2 className="text-lg font-semibold">{label}</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3 text-sm">
        {kind === "PROJECT" && (
          <>
            {typeof meta.description === "string" && meta.description && (
              <p className="text-muted-foreground">{meta.description}</p>
            )}
            {Array.isArray(meta.tags) && meta.tags.length > 0 && (
              <p className="text-xs text-muted-foreground">Tags: {(meta.tags as string[]).join(", ")}</p>
            )}
            <Link href={`/projetos/${meta.projectId}`} className="text-primary hover:underline">
              Ver projeto →
            </Link>
          </>
        )}

        {kind === "SPREADSHEET" && (
          <>
            <Link
              href={`/projetos/${meta.projectId}/planilhas/${meta.spreadsheetId}`}
              className="block text-primary hover:underline"
            >
              Ver planilha →
            </Link>
            {typeof meta.url === "string" && (
              <a
                href={meta.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir no Google Sheets
              </a>
            )}
          </>
        )}

        {kind === "SHEET" && (
          <>
            <p className="text-muted-foreground">GID: {String(meta.gid)}</p>
            <p className="text-muted-foreground">
              Execuções registradas: {String(meta.updateCount ?? 0)}
            </p>
            <Link
              href={`/projetos/${meta.projectId}/planilhas/${meta.spreadsheetId}/abas/${meta.sheetId}`}
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <History className="h-3.5 w-3.5" />
              Ver histórico →
            </Link>
            {typeof meta.url === "string" && (
              <a
                href={meta.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir no Google Sheets
              </a>
            )}
          </>
        )}

        {(kind === "APPSCRIPT" || kind === "DATABASE" || kind === "API" || kind === "DOCS") && (
          <p className="text-muted-foreground">{String(meta.description ?? "")}</p>
        )}
      </div>
    </aside>
  );
}

export function MapClient({
  initialNodes,
  initialEdges,
  projects,
  currentProjectId,
}: {
  initialNodes: Node<GraphNodeData>[];
  initialEdges: Edge[];
  projects: Array<{ id: string; name: string }>;
  currentProjectId: string;
}) {
  const router = useRouter();

  function handleProjectChange(value: string) {
    if (!value || value === "ALL") {
      router.push("/mapa");
    } else {
      router.push(`/mapa?projectId=${value}`);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mapa</h1>
          <p className="text-sm text-muted-foreground">
            Projeto → Planilha → Aba, integração com Apps Script, Banco, API e Documentação
          </p>
        </div>
        <Select value={currentProjectId || "ALL"} onValueChange={handleProjectChange}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Todos os projetos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os projetos</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ReactFlowProvider>
        <MapCanvas initialNodes={initialNodes} initialEdges={initialEdges} />
      </ReactFlowProvider>
    </div>
  );
}
