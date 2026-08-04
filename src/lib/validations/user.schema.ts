import { z } from "zod";
import { ROLES } from "@/lib/constants/roles";

const roleEnum = z.enum([
  ROLES.SUPERADMIN,
  ROLES.ADMIN,
  ROLES.GESTOR,
  ROLES.OPERADOR,
  ROLES.VISUALIZADOR,
]);

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres").max(120),
  email: z.string().trim().email("E-mail inválido"),
  role: roleEnum,
  password: z
    .string()
    .min(8, "A senha deve ter ao menos 8 caracteres")
    .max(72, "A senha deve ter no máximo 72 caracteres"),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  role: roleEnum.optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).max(72).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
