import { z } from "zod";

export const createApiTokenSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres").max(120),
  expiresInDays: z.coerce.number().int().positive().max(3650).optional(),
});

export type CreateApiTokenInput = z.infer<typeof createApiTokenSchema>;
