import "server-only";
import { prisma } from "@/infrastructure/database/prisma";
import { formatToAppTimeZone } from "@/lib/timezone";

/**
 * Gera a documentação de um projeto em Markdown puro — compatível com
 * qualquer editor, incluindo Obsidian (que trata cada arquivo .md como uma
 * nota). Não depende de nenhuma configuração do Obsidian para funcionar.
 */
export async function generateProjectMarkdown(projectId: string): Promise<string | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: {
      spreadsheets: {
        where: { deletedAt: null },
        orderBy: { name: "asc" },
        include: {
          sheets: { where: { deletedAt: null }, orderBy: { name: "asc" } },
        },
      },
      members: { include: { user: { select: { name: true, email: true } } } },
    },
  });

  if (!project) return null;

  const lines: string[] = [];
  lines.push(`# ${project.name}`);
  lines.push("");
  if (project.description) {
    lines.push(project.description);
    lines.push("");
  }
  if (project.tags.length > 0) {
    lines.push(`**Tags:** ${project.tags.map((t: string) => `#${t.replace(/\s+/g, "-")}`).join(" ")}`);
    lines.push("");
  }
  lines.push(`_Exportado em ${formatToAppTimeZone(new Date())} (America/Sao_Paulo)_`);
  lines.push("");

  if (project.members.length > 0) {
    lines.push("## Responsáveis");
    lines.push("");
    for (const member of project.members) {
      lines.push(`- ${member.user.name} (${member.user.email}) — ${member.accessLevel}`);
    }
    lines.push("");
  }

  lines.push("## Planilhas");
  lines.push("");

  if (project.spreadsheets.length === 0) {
    lines.push("_Nenhuma planilha cadastrada._");
  }

  for (const spreadsheet of project.spreadsheets) {
    lines.push(`### ${spreadsheet.friendlyName || spreadsheet.name}`);
    lines.push("");
    lines.push(`- URL: ${spreadsheet.url}`);
    lines.push(`- Spreadsheet ID: \`${spreadsheet.spreadsheetId}\``);
    lines.push("");
    if (spreadsheet.sheets.length === 0) {
      lines.push("_Nenhuma aba cadastrada._");
    } else {
      lines.push("| Aba | GID | URL |");
      lines.push("|---|---|---|");
      for (const sheet of spreadsheet.sheets) {
        lines.push(
          `| ${sheet.friendlyName || sheet.name} | ${sheet.gid} | ${sheet.url} |`,
        );
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}
