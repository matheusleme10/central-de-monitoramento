import { describe, expect, it } from "vitest";
import { createApiTokenSchema } from "./api-token.schema";

describe("createApiTokenSchema", () => {
  it("aceita apenas o nome (expiresInDays opcional)", () => {
    const result = createApiTokenSchema.safeParse({ name: "Apps Script — Vendas" });
    expect(result.success).toBe(true);
  });

  it("aceita expiresInDays como string numérica (coerção)", () => {
    const result = createApiTokenSchema.safeParse({ name: "Token", expiresInDays: "365" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expiresInDays).toBe(365);
    }
  });

  it("rejeita expiresInDays negativo", () => {
    const result = createApiTokenSchema.safeParse({ name: "Token", expiresInDays: -1 });
    expect(result.success).toBe(false);
  });

  it("rejeita nome vazio", () => {
    const result = createApiTokenSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});
