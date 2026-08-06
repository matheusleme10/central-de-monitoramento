import "server-only";
import type { Session } from "next-auth";
import { prisma } from "@/infrastructure/database/prisma";
import { projectVisibilityWhere, assertProjectAccess } from "@/lib/auth/project-access";
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "@/lib/validations/project.schema";

export async function listProjects(session: Session) {
  return prisma.project.findMany({
    where: { deletedAt: null, ...projectVisibilityWhere(session) },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { spreadsheets: true, members: true } },
    },
  });
}

export async function getProjectById(session: Session, projectId: string) {
  await assertProjectAccess(session, projectId);

  return prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: {
      spreadsheets: {
        where: { deletedAt: null },
        orderBy: { name: "asc" },
        include: {
          _count: { select: { sheets: true } },
          sheets: {
            where: { deletedAt: null },
            orderBy: { name: "asc" },
            include: { responsible: true },
          },
        },
      },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
    },
  });
}

export async function createProject(input: CreateProjectInput) {
  return prisma.project.create({
    data: {
      name: input.name,
      description: input.description || null,
      tags: input.tags ?? [],
    },
  });
}

export async function updateProject(projectId: string, input: UpdateProjectInput) {
  return prisma.project.update({
    where: { id: projectId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined
        ? { description: input.description || null }
        : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
    },
  });
}

export async function softDeleteProject(projectId: string) {
  return prisma.project.update({
    where: { id: projectId },
    data: { deletedAt: new Date() },
  });
}

export async function addProjectMember(
  projectId: string,
  userId: string,
  accessLevel: "VIEWER" | "EDITOR" | "MANAGER",
) {
  return prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId } },
    update: { accessLevel },
    create: { projectId, userId, accessLevel },
  });
}

export async function updateProjectMember(
  projectId: string,
  userId: string,
  accessLevel: "VIEWER" | "EDITOR" | "MANAGER",
) {
  return prisma.projectMember.update({
    where: { projectId_userId: { projectId, userId } },
    data: { accessLevel },
  });
}

export async function removeProjectMember(projectId: string, userId: string) {
  return prisma.projectMember.delete({
    where: { projectId_userId: { projectId, userId } },
  });
}
