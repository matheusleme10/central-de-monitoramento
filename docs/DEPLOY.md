# Deploy — Central de Monitoramento de Atualizações

## Migração inicial

`prisma/migrations/00000000000000_init/` já está no repositório — escrita
manualmente (não gerada por `prisma migrate dev`, já que o ambiente de
desenvolvimento nunca teve rede liberada para
`binaries.prisma.sh`) e validada rodando de ponta a ponta contra um
Postgres real (WASM, via `@electric-sql/pglite`) antes de ser commitada:
cria as 19 tabelas, aplica as 20 foreign keys, e o fluxo completo do seed
(papéis → permissões → Superadmin) mais um upsert de `update_events`
funcionam exatamente como o código da aplicação espera. Você não precisa
gerar nem rodar migração nenhuma manualmente — a seção "Opção 0 — Vercel"
abaixo configura isso para acontecer sozinho a cada deploy.

## Variáveis de ambiente obrigatórias

Ver `.env.example` para a lista completa. Em produção, gere `AUTH_SECRET`
com `openssl rand -base64 33` e nunca reutilize o valor de desenvolvimento.

| Variável              | Obrigatória | Observação                                      |
| ---------------------- | ----------- | ------------------------------------------------ |
| `DATABASE_URL`         | sim         | string de conexão PostgreSQL                     |
| `AUTH_SECRET`          | sim         | segredo de assinatura de sessão do Auth.js        |
| `AUTH_URL`              | não         | opcional na Vercel (`trustHost: true` já resolve o host real da requisição); se definir, use a URL real de produção — **nunca** `http://localhost:3000` (causa redirect quebrado após login, já visto em produção) |
| `SEED_SUPERADMIN_EMAIL`/`SEED_SUPERADMIN_PASSWORD` | opcional | usadas só por `npm run prisma:seed`, nunca em runtime — reaproveitadas também para resetar a senha do Superadmin (ver abaixo) |

## Opção 0 — Vercel (recomendado para este projeto)

O projeto é um app Next.js padrão (App Router + Route Handlers), então
roda na Vercel sem Dockerfile. O único cuidado é o Prisma, que precisa
gerar o client durante o build da Vercel — o script `postinstall: "prisma
generate"` do `package.json` já cuida disso automaticamente.

1. **Banco de dados**: crie um Postgres gerenciado acessível pela
   internet (Neon, Supabase, Vercel Postgres/Neon integration, Railway,
   RDS, etc.) — a Vercel não hospeda Postgres sozinha.
2. **Importar o repositório na Vercel** (dashboard → Add New → Project →
   selecione o repo). Se o projeto não estiver na raiz do repositório
   Git, configure o **Root Directory** como `central-monitoramento` nas
   configurações do projeto.
4. **Variáveis de ambiente** (Project Settings → Environment Variables),
   para Production (e Preview, se quiser testar PRs):
   - `DATABASE_URL` — string de conexão do banco do passo 1
   - `AUTH_SECRET` — gerar com `openssl rand -base64 33`
   - `AUTH_URL` — **não crie essa variável** (ou, se já existir, apague-a).
     O `trustHost: true` em `auth.config.ts` já resolve o domínio correto
     a partir da própria requisição — definir `AUTH_URL` errado (ex.:
     copiado de `.env.example` como `http://localhost:3000`) é a causa
     mais comum de redirect pro localhost depois do login em produção.

   Login é senha única (sem e-mail, sem OAuth/Google) — ver seção
   "Autenticação" do README. A senha é a mesma de
   `SEED_SUPERADMIN_PASSWORD` abaixo: para trocá-la, edite essa variável
   na Vercel e redeploy — nenhum comando local necessário.
   - `SEED_SUPERADMIN_EMAIL` — qualquer e-mail válido (é só um
     identificador interno no banco; você nunca digita isso no login)
   - `SEED_SUPERADMIN_PASSWORD` — **esta é a senha do painel**. Trocar o
     valor aqui + redeploy é como você muda a senha sem tocar em código
     ou banco diretamente.
4. **Build Command customizado** (Project Settings → Build & Development
   Settings → Build Command → "Override"):
   ```
   npx prisma migrate deploy && npx tsx prisma/seed.ts && next build
   ```
   Isso faz a Vercel aplicar as migrações pendentes e resincronizar
   papéis/permissões/senha do Superadmin automaticamente **a cada
   deploy**, direto no ambiente da Vercel (que tem rede liberada para o
   Prisma, diferente do sandbox onde este projeto foi construído). Sem
   isso, o app builda mas as tabelas nunca são criadas no banco.
5. **Deploy** — clique em Deploy (ou dê `git push`, se o projeto já
   estiver conectado ao repo). A Vercel roda `npm install` (dispara
   `postinstall` → `prisma generate`), depois o Build Command do passo 4.
6. **Migrações futuras**: quando o schema mudar, adicione uma nova pasta
   em `prisma/migrations/<timestamp>_<nome>/migration.sql` com o SQL da
   mudança e commite — o Build Command do passo 4 aplica sozinho no
   próximo deploy.

O `Dockerfile`/`docker-compose.yml` abaixo são uma alternativa para quem
prefere self-host (VPS, servidor interno) em vez da Vercel — não são
necessários para o fluxo acima.

## Opção 1 — Docker Compose (desenvolvimento/homologação)

```bash
cp .env.example .env
# preencha AUTH_SECRET

docker compose up --build
```

Isso sobe um PostgreSQL local (serviço `db`) e a aplicação (serviço `app`,
build multi-stage via `Dockerfile`, saída `standalone` do Next.js). O
compose não roda migrações automaticamente — execute uma vez, com o banco
já de pé:

```bash
docker compose exec app npx prisma migrate deploy
```

Para produção real, substitua o serviço `db` por um PostgreSQL gerenciado
e mantenha apenas o serviço `app`, apontando `DATABASE_URL` para ele.

## Opção 2 — Build de imagem isolado

```bash
docker build -t central-monitoramento .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e AUTH_SECRET="..." \
  -e AUTH_URL="https://seu-dominio" \
  central-monitoramento
```

Rode `npx prisma migrate deploy` (localmente ou como job separado) contra
o mesmo `DATABASE_URL` antes de expor a aplicação ao tráfego.

## CI (GitHub Actions)

`.github/workflows/ci.yml` roda em todo push/PR para `main`: sobe um
Postgres de serviço, instala dependências, gera o client do Prisma, roda
lint, typecheck, os testes (Vitest) e o build do Next.js — falha o
pipeline se qualquer etapa falhar. O passo `prisma migrate deploy` só
funciona depois que a migração inicial (ver seção acima) estiver
commitada.

## Checklist antes de ir para produção

- [ ] Migração inicial do Prisma gerada e commitada.
- [ ] `AUTH_SECRET` de produção gerado e armazenado em um cofre de
      segredos (não em `.env` versionado).
- [ ] `DATABASE_URL` de produção aponta para um Postgres gerenciado com
      backup automático.
- [ ] Primeiro usuário Superadmin criado via `npm run prisma:seed`
      (com `SEED_SUPERADMIN_EMAIL`/`SEED_SUPERADMIN_PASSWORD` definidos
      apenas no momento do seed, nunca deixados como variável permanente).
- [ ] HTTPS obrigatório na frente da aplicação (a Strict-Transport-Security
      configurada em `next.config.ts` assume TLS).
- [ ] Revisar `docs/SECURITY.md`, em especial as pendências conhecidas
      (rate limiting em memória não é compartilhado entre instâncias —
      relevante se a aplicação rodar com mais de uma réplica).
