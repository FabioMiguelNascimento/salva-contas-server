# Salva Contas — API (backend)

Backend do projeto **Salva Contas** — API REST construída com NestJS e Prisma para gerenciar workspaces, transações, assinaturas, orçamentos, cartões e anexos. Autenticação via Supabase; arquivos armazenados em R2 (S3‑compatible). Ideal para desenvolvimento local e deploy em containers.

---

## Principais tecnologias 🔧

- Node.js + TypeScript
- NestJS (modular)
- Prisma (PostgreSQL)
- Autenticação: Supabase
- Storage: Cloudflare R2 (S3-compatible)
- (Opcional) Google Generative AI — extração automática de recibos

---

## Recursos principais ✅

- Autenticação e gerenciamento de usuários (Supabase)
- Workspaces e permissões
- Transações (criação, busca, anexos)
- Subscriptions, Budgets, Credit Cards, Notifications
- Upload / presigned URLs para anexos (R2)
- Seed inicial com categorias globais
- Healthcheck: `GET /health`

---

## Quickstart — desenvolvimento local 🚀

1. Instale dependências:

```bash
pnpm install
```

2. Crie um `.env` (exemplo abaixo) e configure o PostgreSQL + Supabase + R2.

3. Gere o client Prisma e rode migrations:

```bash
pnpm prisma generate
pnpm prisma migrate dev
```

4. Rode o seed (categorias globais):

```bash
pnpm run seed
```

5. Inicie em modo desenvolvimento:

```bash
pnpm run dev
```

A aplicação ouvirá na porta configurada pela variável `PORT`.

---

## Variáveis de ambiente (essenciais / opcionais) ⚙️

- DATABASE_URL — string de conexão PostgreSQL (required)
- PORT — porta onde a API escuta (ex.: 3333)

Autenticação (Supabase):
- SUPABASE_URL (required)
- SUPABASE_ANON_KEY (required)
- SUPABASE_SERVICE_ROLE_KEY (opcional — necessário para operações administrativas)
- PASSWORD_RESET_REDIRECT_URL (opcional)

Storage (R2 / S3-compatible):
- R2_ACCESS_KEY_ID (required para uploads)
- R2_SECRET_ACCESS_KEY (required para uploads)
- R2_ENDPOINT (required)
- R2_BUCKET_NAME (required)
- AWS_REGION (opcional)

Recursos opcionais:
- GEMINI_API_KEY — chave Google Generative AI (opcional; habilita extração automática de recibos)

Exemplo mínimo `.env`:

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/salvacontas
PORT=3333
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_ANON_KEY=xxxxxxxx
R2_ACCESS_KEY_ID=xxxx
R2_SECRET_ACCESS_KEY=xxxx
R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com
R2_BUCKET_NAME=salva-contas
# GEMINI_API_KEY=seu-token-gemini (opcional)
```

> Nota: alguns módulos (ex.: upload de anexos ou lookup de usuários no Supabase admin) falham se as variáveis relacionadas não estiverem definidas.

---

## Scripts úteis (npm/pnpm) 📋

- `pnpm run dev` — modo desenvolvimento (watch)
- `pnpm run build` — build (NestJS)
- `pnpm run start:prod` — iniciar build em produção
- `pnpm prisma generate` — gerar Prisma Client
- `pnpm prisma migrate dev` — aplicar migrations localmente
- `pnpm prisma studio` — abrir Prisma Studio
- `pnpm run seed` — rodar seed de dados
- `pnpm run test` — executar testes
- `pnpm run lint` — lint
- `pnpm run format` — formatação (Prettier)

---

## Docker 🐳

O repositório contém um `dockerfile` preparado para build e execução.

Build:

```bash
docker build -t salva-contas-server .
```

Run (exemplo):

```bash
docker run -e DATABASE_URL="$DATABASE_URL" -e PORT=3333 -p 3333:3333 salva-contas-server
```

---

## Banco de dados / Prisma 📦

- Cliente gerado em `generated/prisma` (rodar `pnpm prisma generate` após alterar `schema.prisma`).
- Migrations estão em `prisma/migrations`.
- Use `pnpm prisma migrate dev` para rodar migrations em dev e `pnpm prisma migrate deploy` em produção.

---

## Endpoints úteis

- Health: `GET /health`
- Autenticação e outras rotas: consulte os controllers em `src/**/*.controller.ts`

---

## Observações finais 💡

- Recursos dependentes de serviços externos (Supabase, R2, GEMINI) são opcionais — a API funciona com o mínimo: `DATABASE_URL` + `SUPABASE_*`.
- Para desenvolvimento rápido, use um Postgres local + as variáveis acima.

---

Contribuições, dúvidas ou ajustes no README? Abra uma issue ou PR no repositório.
