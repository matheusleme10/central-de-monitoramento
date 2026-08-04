import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança aplicados a todas as respostas. Complementam
 * (não substituem) a validação Zod, o CSRF do Auth.js e o RBAC no servidor.
 */
// CSP sem nonces: pragmática para uma primeira versão (Next.js precisa de
// 'unsafe-inline' em script-src para os scripts de hidratação sem uma
// implementação de nonce por requisição via middleware). Ainda bloqueia a
// classe mais comum de XSS: injeção de <script src="https://dominio-malicioso...">.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://lh3.googleusercontent.com https://*.googleusercontent.com",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
];

const nextConfig: NextConfig = {
  // "standalone" gera um bundle mínimo em .next/standalone, usado pelo
  // Dockerfile multi-stage (ver docs/DEPLOY.md) — evita copiar node_modules
  // inteiro para a imagem final.
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
