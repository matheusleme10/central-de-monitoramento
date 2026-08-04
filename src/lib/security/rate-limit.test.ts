import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("permite requisições até o limite", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i += 1) {
      const result = checkRateLimit(key, 5);
      expect(result.allowed).toBe(true);
    }
  });

  it("bloqueia a requisição que excede o limite", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i += 1) {
      checkRateLimit(key, 5);
    }
    const result = checkRateLimit(key, 5);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("libera novamente após a janela de 60s expirar", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i += 1) {
      checkRateLimit(key, 5);
    }
    expect(checkRateLimit(key, 5).allowed).toBe(false);

    vi.advanceTimersByTime(61_000);

    expect(checkRateLimit(key, 5).allowed).toBe(true);
  });

  it("mantém contadores independentes por chave", () => {
    const keyA = `test-a-${Math.random()}`;
    const keyB = `test-b-${Math.random()}`;
    for (let i = 0; i < 5; i += 1) checkRateLimit(keyA, 5);

    expect(checkRateLimit(keyA, 5).allowed).toBe(false);
    expect(checkRateLimit(keyB, 5).allowed).toBe(true);
  });
});
