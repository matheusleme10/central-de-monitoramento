// Stub para o pacote "server-only" em ambiente de testes (Vitest/Node).
// Em produção (build Next.js), o pacote real garante que o módulo nunca
// seja incluído em bundles de cliente. Nos testes, isso é irrelevante —
// substituímos por um módulo vazio via alias no vitest.config.mts.
export {};
