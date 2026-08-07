import "server-only";
import { prisma } from "@/infrastructure/database/prisma";
import { syncSheetResponsibles } from "@/core/services/responsible.service";
import type { UpdateSheetInput } from "@/lib/validations/sheet.schema";

// Normaliza `sheet.responsibles` (SheetResponsible[] com o Responsible
// aninhado) pra uma lista plana de Responsible — formato que o front-end
// consome, sem precisar saber que existe uma tabela de junção por baixo.
function flattenResponsibles<T extends { responsibles: { responsible: unknown }[] }>({
  responsibles,
  ...sheet
}: T) {
  return { ...sheet, responsibles: responsibles.map((link) => link.responsible) };
}

const RESPONSIBLES_INCLUDE = {
  responsibles: { include: { responsible: true }, orderBy: { responsible: { name: "asc" as const } } },
} as const;

export async function listSheetsBySpreadsheet(spreadsheetId: string) {
  const sheets = await prisma.sheet.findMany({
    where: { spreadsheetId, deletedAt: null },
    orderBy: { name: "asc" },
    include: { _count: { select: { updateEvents: true } }, ...RESPONSIBLES_INCLUDE },
  });
  return sheets.map(flattenResponsibles);
}

export async function getSheetById(sheetId: string) {
  const sheet = await prisma.sheet.findFirst({
    where: { id: sheetId, deletedAt: null },
    include: {
      spreadsheet: {
        select: { id: true, name: true, projectId: true, project: { select: { name: true } } },
      },
      ...RESPONSIBLES_INCLUDE,
    },
  });
  return sheet ? flattenResponsibles(sheet) : null;
}

interface SheetInput {
  gid: string;
  name: string;
  friendlyName?: string;
  description?: string;
  responsibles?: { name: string; email: string }[];
  url: string;
}

export async function createSheet(spreadsheetId: string, input: SheetInput) {
  const sheet = await prisma.sheet.create({
    data: {
      spreadsheetId,
      gid: input.gid,
      name: input.name,
      friendlyName: input.friendlyName || null,
      description: input.description || null,
      url: input.url,
    },
  });

  if (input.responsibles && input.responsibles.length > 0) {
    await syncSheetResponsibles(sheet.id, input.responsibles);
  }

  // getSheetById nunca retorna null aqui: acabamos de criar essa linha
  // agora mesmo, na mesma requisição.
  return (await getSheetById(sheet.id))!;
}

export async function updateSheet(sheetId: string, input: UpdateSheetInput) {
  await prisma.sheet.update({
    where: { id: sheetId },
    data: {
      ...(input.gid !== undefined ? { gid: input.gid } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.friendlyName !== undefined
        ? { friendlyName: input.friendlyName || null }
        : {}),
      ...(input.description !== undefined
        ? { description: input.description || null }
        : {}),
      ...(input.url !== undefined ? { url: input.url } : {}),
    },
  });

  if (input.responsibles !== undefined) {
    await syncSheetResponsibles(sheetId, input.responsibles);
  }

  // getSheetById nunca retorna null aqui: acabamos de dar update nessa
  // linha agora mesmo, na mesma requisição.
  return (await getSheetById(sheetId))!;
}

export async function softDeleteSheet(sheetId: string) {
  return prisma.sheet.update({
    where: { id: sheetId },
    data: { deletedAt: new Date() },
  });
}
