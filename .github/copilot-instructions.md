# Copilot Instructions for salva-contas-server

## Project Overview

**Salva Contas** is a personal finance management REST API backend built with **NestJS** and **TypeScript**. It provides endpoints for managing workspaces, transactions, subscriptions, budgets, credit cards, notifications, and file attachments. Authentication is handled via **Supabase** (JWT), data persistence via **Prisma ORM** on **PostgreSQL**, and file storage via **Cloudflare R2** (S3-compatible API).

## Tech Stack

| Category | Technology |
|---|---|
| Language | TypeScript 5.7 |
| Runtime | Node.js |
| Framework | NestJS 11 |
| ORM | Prisma 7 (PostgreSQL) |
| Authentication | Supabase (JWT) |
| File Storage | Cloudflare R2 via AWS SDK v3 |
| AI (optional) | Google Generative AI (Gemini) |
| Testing | Jest 29 + Supertest |
| Linting | ESLint 9 + typescript-eslint |
| Formatting | Prettier 3 (`singleQuote: true`, `trailingComma: "all"`) |
| Package Manager | **pnpm** (always use `pnpm`, never `npm` or `yarn`) |
| Containerization | Docker (see `dockerfile`) |

## Environment Setup

Copy `.env.example` to `.env` and fill in all required values before running any command:

```
DATABASE_URL          - PostgreSQL connection string
JWT_SECRET            - JWT signing secret
SUPABASE_URL          - Supabase project URL
SUPABASE_ANON_KEY     - Supabase anonymous key
SUPABASE_SERVICE_ROLE_KEY - Supabase service-role key
SUPABASE_REDIRECT_URL - OAuth redirect URL
GEMINI_API_KEY        - (optional) Google Gemini API key
R2_ACCOUNT_ID         - Cloudflare account ID
R2_ACCESS_KEY_ID      - R2 access key
R2_SECRET_ACCESS_KEY  - R2 secret key
R2_BUCKET_NAME        - R2 bucket name
R2_ENDPOINT           - R2 S3-compatible endpoint URL
PORT                  - Port the server listens on
```

## Key Commands

Always run these from the repository root.

### Install dependencies
```bash
pnpm install
```

### Run database migrations
```bash
pnpm prisma migrate dev
```

### Seed the database (global categories)
```bash
pnpm run seed
```

### Development server (watch mode)
```bash
pnpm run dev
```

### Production build
```bash
pnpm run build   # outputs to ./dist
```

### Run tests
```bash
pnpm run test
```

### Run linter
```bash
pnpm run lint
```

### Format code
```bash
pnpm run format
```

### Generate Prisma client after schema changes
```bash
pnpm prisma generate
```

## Project Layout

```
/
├── src/                    # All application source code
│   ├── main.ts             # Bootstrap (NestFactory, CORS, global filters, PORT)
│   ├── app.module.ts       # Root module – imports all feature modules
│   ├── auth/               # Supabase auth, JWT guards, user-context service
│   ├── budgets/            # Budget CRUD and tracking
│   ├── categories/         # Transaction categories (global + user-defined)
│   ├── common/             # Global exception filter, validation pipes
│   ├── credit-cards/       # Credit card management
│   ├── dashboard/          # Aggregate financial metrics
│   ├── health/             # Health-check endpoint (GET /health)
│   ├── notifications/      # Scheduled notifications (@nestjs/schedule)
│   ├── prisma/             # PrismaService + PrismaModule (shared)
│   ├── schemas/            # Zod validation schemas
│   ├── storage/            # Cloudflare R2 presigned-URL service
│   ├── subscriptions/      # Recurring subscription management
│   ├── transactions/       # Transaction CRUD, attachments, splits
│   ├── types/              # Shared TypeScript type definitions
│   └── utils/              # Utility/helper functions
├── prisma/
│   ├── schema.prisma       # Prisma schema (generator output: ../generated/prisma)
│   ├── seed.ts             # Database seeding script
│   └── migrations/         # Auto-generated migration SQL files
├── generated/              # Auto-generated Prisma client (do not edit)
├── dist/                   # Compiled output (do not edit; deleted on each build)
├── .env.example            # Environment variable template
├── nest-cli.json           # NestJS CLI config (sourceRoot: src)
├── tsconfig.json           # TypeScript config (target: ES2023, CommonJS modules)
├── tsconfig.build.json     # Build-specific TS config (excludes tests)
├── eslint.config.mjs       # ESLint flat config (typescript-eslint + prettier)
├── .prettierrc             # Prettier config (singleQuote, trailingComma all)
├── dockerfile              # Docker image definition
└── prisma.config.ts        # Prisma config file
```

## Architecture Conventions

Each feature module under `src/` follows this pattern:
- `*.module.ts` – NestJS module definition; registers controllers, services, imports
- `*.controller.ts` – HTTP endpoints (decorated with `@Controller`)
- `*.repository.ts` – Data-access layer (uses `PrismaService` directly)
- `*.interface.ts` – TypeScript interfaces for that module
- `use-cases/` – Individual business logic classes (one use-case per file)

**Authentication:** All protected routes use `AuthGuard` from `src/auth/guards/`. The current authenticated user is retrieved via `UserContextService` from `src/auth/user-context.service.ts`.

**Prisma client** is generated to `generated/prisma/` (not the default location). Import from `'../../generated/prisma'` (adjust relative path as needed), not from `'@prisma/client'`.

**Validation:** Use Zod schemas defined in `src/schemas/` for request body validation.

**Error handling:** Throw standard NestJS HTTP exceptions (`NotFoundException`, `ForbiddenException`, etc.); the `GlobalExceptionHandler` in `src/common/` catches and formats them.

## Testing

- Test files are co-located with source files using the `.spec.ts` suffix.
- Run a single test file: `pnpm run test -- <path-to-spec-file>`
- Tests use `@nestjs/testing` (`Test.createTestingModule`) and mock services with Jest.
- A PostgreSQL database is **required** for integration tests; ensure `DATABASE_URL` is set.

## Linting & Formatting Notes

- The ESLint config uses the new flat-config format (`eslint.config.mjs`).
- Rules `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-floating-promises`, and `@typescript-eslint/no-unsafe-argument` are set to `off`/`warn` (not errors).
- Always run `pnpm run lint` and `pnpm run format` before committing changes.

## Important Notes

- The `generated/` directory is auto-generated by `prisma generate`. Never edit it manually.
- The `dist/` directory is the compiled output. It is deleted on each build (`deleteOutDir: true`).
- The app listens on `process.env.PORT` (required at runtime; no default).
- CORS is enabled for all origins (`*`) in `main.ts`.
- `dotenv/config` is imported directly in `main.ts` — no separate config module needed for local development.
