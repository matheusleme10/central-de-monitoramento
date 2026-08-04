import { z } from "zod";

export const updateRolePermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid()),
});

export type UpdateRolePermissionsInput = z.infer<typeof updateRolePermissionsSchema>;
