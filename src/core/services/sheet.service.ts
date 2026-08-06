import "server-only";
import { prisma } from "@/infrastructure/database/prisma";
import type { UpdateSheetInput } from "@/lib/validations/sheet.schema";

export async function listSheetsBySpreadsheet(spreadsheetId: string) {
  return prisma.sheet.findMany({
    where: { spreadsheetId, deletedAt: null },
    orderBy: { name: "asc" },
    include: { _count: { select: { updateEvents: true } } },
  });
}

export async function getSheetById(sheetId: string) {
  return prisma.sheet.findFirst({
    where: { id: sheetId, deletedAt: null },
    include: {
      spreadsheet: {
        select: { id: true, name: true, projectId: true, project: { select: { name: true } } },
      },
    },
  });
}

export async function createSheet(
  spreadsheetId: string,
  input: { gid: string; name: string; friendlyName?: string; description?: string; url: string },
) {
  return prisma.sheet.create({
    data: {
      spreadsheetId,
      gid: input.gid,
      name: input.name,
      friendlyName: input.friendlyName || null,
      description: input.description || null,
      url: input.url,
    },
  });
}

export async function updateSheet(sheetId: string, input: UpdateSheetInput) {
  return prisma.sheet.update({
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
}

export async function softDeleteSheet(sheetId: string) {
  return prisma.sheet.update({
    where: { id: sheetId },
    data: { deletedAt: new Date() },
  });
}
