import { z } from "zod";

export const createSheetSchema = z.object({
  gid: z.string().trim().min(1, "GID é obrigatório"),
  name: z.string().trim().min(1, "Nome é obrigatório").max(200),
  friendlyName: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  responsibleName: z.string().trim().max(200).optional().or(z.literal("")),
  responsibleEmail: z.string().trim().email("E-mail inválido").optional().or(z.literal("")),
  url: z.string().trim().url("Informe a URL direta da aba"),
});

export const updateSheetSchema = createSheetSchema.partial();

export type CreateSheetInput = z.infer<typeof createSheetSchema>;
export type UpdateSheetInput = z.infer<typeof updateSheetSchema>;
