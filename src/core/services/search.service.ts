import "server-only";
import type { Session } from "next-auth";
import { prisma } from "@/infrastructure/database/prisma";
import { buildProjectFilter } from "@/lib/auth/project-access";

const TAKE = 8;

/**
 * Pesquisa global (Ctrl+K), no estilo Obsidian: busca por projeto,
 * planilha, aba, responsável (membros do projeto), descrição, erro e tags
 * — sempre restrita aos projetos visíveis ao usuário.
 */
export async function globalSearch(session: Session, rawQuery: string) {
  const query = rawQuery.trim();
  if (query.length < 2) {
    return { projects: [], spreadsheets: [], sheets: [], members: [], errors: [] };
  }

  const projectFilter = buildProjectFilter(session);
  const insensitive = { contains: query, mode: "insensitive" as const };
  const sheetScope = {
    deletedAt: null,
    spreadsheet: { deletedAt: null, project: projectFilter },
  };

  const [projects, spreadsheets, sheets, members, errorEvents] = await Promise.all([
    prisma.project.findMany({
      where: {
        ...projectFilter,
        OR: [{ name: insensitive }, { description: insensitive }, { tags: { has: query } }],
      },
      select: { id: true, name: true, description: true, tags: true },
      take: TAKE,
    }),
    prisma.spreadsheet.findMany({
      where: {
        deletedAt: null,
        project: projectFilter,
        OR: [{ name: insensitive }, { friendlyName: insensitive }],
      },
      select: {
        id: true,
        name: true,
        friendlyName: true,
        projectId: true,
        project: { select: { name: true } },
      },
      take: TAKE,
    }),
    prisma.sheet.findMany({
      where: {
        ...sheetScope,
        OR: [{ name: insensitive }, { friendlyName: insensitive }, { description: insensitive }],
      },
      select: {
        id: true,
        name: true,
        friendlyName: true,
        description: true,
        spreadsheetId: true,
        spreadsheet: { select: { id: true, name: true, projectId: true, project: { select: { name: true } } } },
      },
      take: TAKE,
    }),
    prisma.projectMember.findMany({
      where: {
        project: projectFilter,
        user: { OR: [{ name: insensitive }, { email: insensitive }] },
      },
      select: {
        userId: true,
        projectId: true,
        user: { select: { name: true, email: true } },
        project: { select: { name: true } },
      },
      take: TAKE,
    }),
    prisma.updateEvent.findMany({
      where: { sheet: sheetScope, OR: [{ message: insensitive }, { errorCode: insensitive }] },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        message: true,
        errorCode: true,
        status: true,
        sheetId: true,
        sheet: {
          select: {
            name: true,
            friendlyName: true,
            spreadsheetId: true,
            spreadsheet: { select: { id: true, projectId: true } },
          },
        },
      },
      take: TAKE,
    }),
  ]);

  return { projects, spreadsheets, sheets, members, errors: errorEvents };
}
