"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

interface SpreadsheetRow {
  id: string;
  name: string;
  friendlyName: string | null;
  url: string;
  projectId: string;
  project: { name: string };
  _count: { sheets: number };
}

export function PlanilhasTable({ spreadsheets }: { spreadsheets: SpreadsheetRow[] }) {
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = [...spreadsheets].sort((a, b) => {
    const nameA = (a.friendlyName || a.name).toLowerCase();
    const nameB = (b.friendlyName || b.name).toLowerCase();
    return sortAsc ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <button
              type="button"
              onClick={() => setSortAsc((prev) => !prev)}
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              Nome
              <ArrowUpDown className="h-3.5 w-3.5" />
            </button>
          </TableHead>
          <TableHead>Projeto</TableHead>
          <TableHead>Abas</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((sheet) => (
          <TableRow key={sheet.id}>
            <TableCell>
              <Link
                href={`/projetos/${sheet.projectId}/planilhas/${sheet.id}`}
                className="font-medium hover:text-primary hover:underline"
              >
                {sheet.friendlyName || sheet.name}
              </Link>
            </TableCell>
            <TableCell>
              <Link
                href={`/projetos/${sheet.projectId}`}
                className="text-muted-foreground hover:text-foreground hover:underline"
              >
                {sheet.project.name}
              </Link>
            </TableCell>
            <TableCell>{sheet._count.sheets}</TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="icon" asChild>
                <a href={sheet.url} target="_blank" rel="noreferrer" title="Abrir no Google Sheets">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
