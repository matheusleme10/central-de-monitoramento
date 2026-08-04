import "server-only";
import { prisma } from "@/infrastructure/database/prisma";
import type { CreateObsidianLinkInput } from "@/lib/validations/obsidian-link.schema";

export async function listObsidianLinksByProject(projectId: string) {
  return prisma.obsidianLink.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createObsidianLink(input: CreateObsidianLinkInput) {
  return prisma.obsidianLink.create({
    data: {
      projectId: input.projectId,
      sheetId: input.sheetId,
      type: input.type,
      value: input.value,
    },
  });
}

export async function deleteObsidianLink(id: string) {
  return prisma.obsidianLink.delete({ where: { id } });
}
