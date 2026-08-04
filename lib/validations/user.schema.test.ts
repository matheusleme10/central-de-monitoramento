import { describe, expect, it } from "vitest";
import { createUserSchema, updateUserSchema } from "./user.schema";

describe("createUserSchema", () => {
  it("aceita um usuário válido", () => {
    const result = createUserSchema.safeParse({
      name: "Maria Silva",
      email: "maria@empresa.com",
      role: "OPERADOR",
      password: "senha-forte-123",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita e-mail inválido", () => {
    const result = createUserSchema.safeParse({
      name: "Maria Silva",
      email: "não-é-email",
      role: "OPERADOR",
      password: "senha-forte-123",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita senha curta demais", () => {
    const result = createUserSchema.safeParse({
      name: "Maria Silva",
      email: "maria@empresa.com",
      role: "OPERADOR",
      password: "1234567",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita papel inexistente", () => {
    const result = createUserSchema.safeParse({
      name: "Maria Silva",
      email: "maria@empresa.com",
      role: "SUPERUSUARIO",
      password: "senha-forte-123",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateUserSchema", () => {
  it("permite atualizar apenas o status", () => {
    const result = updateUserSchema.safeParse({ isActive: false });
    expect(result.success).toBe(true);
  });

  it("rejeita senha vazia quando enviada", () => {
    const result = updateUserSchema.safeParse({ password: "" });
    expect(result.success).toBe(false);
  });
});
