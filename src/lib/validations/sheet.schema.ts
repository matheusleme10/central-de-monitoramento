import { z } from "zod";

const responsibleEntrySchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(200),
  email: z.string().trim().email("E-mail inválido"),
});

export const createSheetSchema = z.object({
  gid: z.string().trim().min(1, "GID é obrigatório"),
  name: z.string().trim().min(1, "Nome é obrigatório").max(200),
  friendlyName: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  // Lista de responsáveis (nome + e-mail). Vazio = sem responsável definido.
  responsibles: z.array(responsibleEntrySchema).max(20).optional(),
  url: z.string().trim().url("Informe a URL direta da aba"),
});

export const updateSheetSchema = createSheetSchema.partial();

export type CreateSheetInput = z.infer<typeof createSheetSchema>;
export type UpdateSheetInput = z.infer<typeof updateSheetSchema>;
