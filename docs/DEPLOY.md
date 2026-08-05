# Deploy — Central de Monitoramento de Atualizações

## Pré-requisito único: gerar a migração inicial do Prisma

Este projeto foi desenvolvido em um ambiente sandbox sem acesso à rede
usada pelo Prisma para baixar os binários do motor de query
(`binaries.prisma.sh`), então **nenhuma migração foi gerada ainda** —
`prisma/migrations/` não existe neste repositório.

Antes do primeiro deploy (ou do primeiro uso do `docker-compose.yml`),
rode uma vez em uma máquina com rede liberada para o Prisma:

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
```

Isso cria `prisma/migrations/<timestamp>_init/` e o `migration_lock.toml`.
Commite esses arquivos — a partir daí, `prisma migrate deploy` (usado no
CI e no runtime de produção) passa a funcionar normalmente.

## Variáveis de ambiente obrigatórias

Ver `.env.example` para a lista completa. Em produção, gere `AUTH_SECRET`
com `openssl rand -base64 33` e nunca reutilize o valor de desenvolvimento.

| Variável              | Obrigatória | Observação                                      |
| ---------------------- | ----------- | ------------------------------------------------ |
| `DATABASE_URL`         | sim         | string de conexão PostgreSQL                     |
| `AUTH_SECRET`          | sim         | segredo de assinatura de sessão do Auth.js        |
| `AUTH_URL`              | sim         | URL pública da aplicação (ex.: `https://...`)     |
| `SEED_SUPERADMIN_EMAIL`/`SEED_SUPERADMIN_PASSWORD` | opcional | usadas só por `npm run prisma:seed`, nunca em runtime — reaproveitadas também para resetar a senha do Superadmin (ver abaixo) |

## Opção 0 — Vercel (recomendado para este projeto)

O projeto é um app Next.js padrão (App Router + Route Handlers), então
roda na Vercel sem Dockerfile. O único cuidado é o Prisma, que precisa
gerar o client durante o build da Vercel — o script `postinstall: "prisma
generate"` do `package.json` já cuida disso automaticamente.

1. **Banco de dados**: crie um Postgres gerenciado acessível pela
   internet (Neon, Supabase, Vercel Postgres/Neon integration, Railway,
   RDS, etc.) — a Vercel não hospeda Postgres sozinha.
2. **Gerar a migração inicial** (uma vez, na sua máquina, com
   `DATABASE_URL` apontando para esse banco):
   ```bash
   cd central-monitoramento
   npm install
   npx prisma migrate dev --name init
   ```
   Isso cria `prisma/migrations/` e já aplica o schema no banco. Commite
   os arquivos gerados.
3. **Importar o repositório na Vercel** (dashboard → Add New → Project →
   selecione o repo). Se o projeto não estiver na raiz do repositório
   Git, configure o **Root Directory** como `central-monitoramento` nas
   configurações do projeto.
4. **Variáveis de ambiente** (Project Settings → Environment Variables),
   para Production (e Preview, se quiser testar PRs):
   - `DATABASE_URL` — string de conexão do banco do passo 1
   - `AUTH_SECRET` — gerar com `openssl rand -base64 33`
   - `AUTH_URL` — a URL pública do projeto na Vercel (ex.:
     `https://seu-projeto.vercel.app`)

   Login é só e-mail/senha (Credentials) — não há OAuth/Google configurado
   nesta versão, então não há URI de redirecionamento pra cadastrar.
5. **Deploy** — a Vercel roda `npm install` (dispara `postinstall` →
   `prisma generate`) e depois `next build` automaticamente. Não é
   preciso configurar Build Command customizado.
6. **Migrações futuras**: quando o schema mudar, rode
   `npx prisma migrate dev --name <nome>` localmente contra o banco de
   produção (ou um banco de homologação) e commite a nova pasta em
   `prisma/migrations/` antes do próximo deploy — a Vercel não roda
   `migrate deploy` sozinha.

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
