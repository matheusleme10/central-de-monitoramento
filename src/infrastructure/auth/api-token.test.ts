import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { generateApiToken, hashApiToken } from "./api-token";

describe("generateApiToken", () => {
  it("gera um token no formato cma_<64 hex>", () => {
    const { token } = generateApiToken();
    expect(token).toMatch(/^cma_[0-9a-f]{64}$/);
  });

  it("gera tokens únicos a cada chamada", () => {
    const a = generateApiToken();
    const b = generateApiToken();
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).not.toBe(b.tokenHash);
  });

  it("retorna o hash SHA-256 correspondente ao token em texto puro", () => {
    const { token, tokenHash } = generateApiToken();
    const expected = createHash("sha256").update(token).digest("hex");
    expect(tokenHash).toBe(expected);
  });

  it("nunca inclui o token completo no preview", () => {
    const { token, preview } = generateApiToken();
    expect(preview).not.toBe(token);
    expect(preview).toContain("…");
    expect(preview.startsWith("cma_")).toBe(true);
    // apenas os 4 primeiros e 4 últimos caracteres do segredo aparecem
    const secret = token.slice(4);
    expect(preview).toBe(`cma_${secret.slice(0, 4)}…${secret.slice(-4)}`);
  });
});

describe("hashApiToken", () => {
  it("é determinístico para a mesma entrada", () => {
    expect(hashApiToken("cma_abc")).toBe(hashApiToken("cma_abc"));
  });

  it("produz saídas diferentes para entradas diferentes", () => {
    expect(hashApiToken("cma_abc")).not.toBe(hashApiToken("cma_abd"));
  });

  it("retorna um hex de 64 caracteres (SHA-256)", () => {
    expect(hashApiToken("qualquer-valor")).toMatch(/^[0-9a-f]{64}$/);
  });
});
