import "server-only";
import { prisma } from "@/infrastructure/database/prisma";
import { findOrCreateResponsible } from "@/core/services/responsible.service";
import type { UpdateSheetInput } from "@/lib/validations/sheet.schema";

export async function listSheetsBySpreadsheet(spreadsheetId: string) {
  return prisma.sheet.findMany({
    where: { spreadsheetId, deletedAt: null },
    orderBy: { name: "asc" },
    include: { _count: { select: { updateEvents: true } }, responsible: true },
  });
}

export async function getSheetById(sheetId: string) {
  return prisma.sheet.findFirst({
    where: { id: sheetId, deletedAt: null },
    include: {
      spreadsheet: {
        select: { id: true, name: true, projectId: true, project: { select: { name: true } } },
      },
      responsible: true,
    },
  });
}

interface SheetInput {
  gid: string;
  name: string;
  friendlyName?: string;
  description?: string;
  responsibleName?: string;
  responsibleEmail?: string;
  url: string;
}

/** Se veio nome+e-mail, reaproveita/cria o responsável; senão, mantém sem vínculo. */
async function resolveResponsibleId(name?: string, email?: string) {
  if (!name || !email) return null;
  const responsible = await findOrCreateResponsible(name, email);
  return responsible.id;
}

export async function createSheet(spreadsheetId: string, input: SheetInput) {
  const responsibleId = await resolveResponsibleId(input.responsibleName, input.responsibleEmail);
  return prisma.sheet.create({
    data: {
      spreadsheetId,
      gid: input.gid,
      name: input.name,
      friendlyName: input.friendlyName || null,
      description: input.description || null,
      responsibleId,
      url: input.url,
    },
    include: { responsible: true },
  });
}

export async function updateSheet(sheetId: string, input: UpdateSheetInput) {
  const responsibleId =
    input.responsibleName !== undefined || input.responsibleEmail !== undefined
      ? await resolveResponsibleId(input.responsibleName, input.responsibleEmail)
      : undefined;

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
      ...(responsibleId !== undefined ? { responsibleId } : {}),
      ...(input.url !== undefined ? { url: input.url } : {}),
    },
    include: { responsible: true },
  });
}

export async function softDeleteSheet(sheetId: string) {
  return prisma.sheet.update({
    where: { id: sheetId },
    data: { deletedAt: new Date() },
  });
}
