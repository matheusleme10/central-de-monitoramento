import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres").max(120),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const projectAccessLevelSchema = z.enum(["VIEWER", "EDITOR", "MANAGER"]);

export const addProjectMemberSchema = z.object({
  userId: z.string().uuid(),
  accessLevel: projectAccessLevelSchema.default("VIEWER"),
});

export const updateProjectMemberSchema = z.object({
  accessLevel: projectAccessLevelSchema,
});
