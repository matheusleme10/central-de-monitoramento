import { z } from "zod";

/**
 * Validação das variáveis de ambiente em tempo de inicialização.
 * Evita que a aplicação suba com configuração incompleta e evita
 * espalhar `process.env.X` sem tipagem pelo restante do código.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET é obrigatória"),
  AUTH_URL: z.string().url().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      "Variáveis de ambiente inválidas:",
      parsed.error.flatten().fieldErrors,
    );
    throw new Error("Configuração de ambiente inválida. Verifique o .env");
  }

  return parsed.data;
}

export const env = loadEnv();
