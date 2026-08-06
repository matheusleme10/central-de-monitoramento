import "server-only";
import { prisma } from "@/infrastructure/database/prisma";
import type {
  UpdateSpreadsheetInput,
} from "@/lib/validations/spreadsheet.schema";

export async function listSpreadsheetsByProject(projectId: string) {
  return prisma.spreadsheet.findMany({
    where: { projectId, deletedAt: null },
    orderBy: { name: "asc" },
    include: { _count: { select: { sheets: true } } },
  });
}

export async function listAllSpreadsheets(projectIds?: string[]) {
  return prisma.spreadsheet.findMany({
    where: {
      deletedAt: null,
      ...(projectIds ? { projectId: { in: projectIds } } : {}),
    },
    orderBy: { name: "asc" },
    include: {
      project: { select: { id: true, name: true } },
      _count: { select: { sheets: true } },
    },
  });
}

export async function getSpreadsheetById(spreadsheetId: string) {
  return prisma.spreadsheet.findFirst({
    where: { id: spreadsheetId, deletedAt: null },
    include: {
      project: { select: { id: true, name: true } },
      sheets: { where: { deletedAt: null }, orderBy: { name: "asc" }, include: { responsible: true } },
    },
  });
}

export async function createSpreadsheet(
  projectId: string,
  input: { spreadsheetId: string; url: string; name: string; friendlyName?: string },
) {
  return prisma.spreadsheet.create({
    data: {
      projectId,
      spreadsheetId: input.spreadsheetId,
      url: input.url,
      name: input.name,
      friendlyName: input.friendlyName || null,
    },
  });
}

export async function updateSpreadsheet(
  spreadsheetId: string,
  input: UpdateSpreadsheetInput,
) {
  return prisma.spreadsheet.update({
    where: { id: spreadsheetId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.friendlyName !== undefined
        ? { friendlyName: input.friendlyName || null }
        : {}),
      ...(input.url !== undefined ? { url: input.url } : {}),
    },
  });
}

export async function softDeleteSpreadsheet(spreadsheetId: string) {
  return prisma.spreadsheet.update({
    where: { id: spreadsheetId },
    data: { deletedAt: new Date() },
  });
}
