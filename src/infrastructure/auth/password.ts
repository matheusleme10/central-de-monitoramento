import argon2 from "argon2";

/**
 * Hash e verificação de senha com Argon2id. Nunca armazenar ou logar a
 * senha em texto puro — apenas o hash é persistido em `users.password_hash`.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return argon2.hash(plainPassword, { type: argon2.argon2id });
}

export async function verifyPassword(
  hash: string,
  plainPassword: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, plainPassword);
  } catch {
    // Hash malformado ou incompatível — trata como falha de autenticação,
    // nunca lança exceção para não vazar detalhes internos.
    return false;
  }
}
