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

// Usado pela tela self-service "/perfil" — troca da própria senha,
// diferente de `updateUserSchema` (usado por um admin para editar outra
// pessoa, sem exigir a senha atual).
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual"),
    newPassword: z
      .string()
      .min(8, "A nova senha deve ter ao menos 8 caracteres")
      .max(72, "A nova senha deve ter no máximo 72 caracteres"),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "A nova senha deve ser diferente da atual",
    path: ["newPassword"],
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
