-- Remove workspace-related tables and update columns to use user_id directly

-- Drop foreign key constraints referencing workspaces
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_workspace_id_fkey";
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_workspace_id_fkey";
ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_workspace_id_fkey";
ALTER TABLE "budgets" DROP CONSTRAINT IF EXISTS "budgets_workspace_id_fkey";
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_workspace_id_fkey";
ALTER TABLE "credit_cards" DROP CONSTRAINT IF EXISTS "credit_cards_workspace_id_fkey";
ALTER TABLE "attachments" DROP CONSTRAINT IF EXISTS "attachments_workspace_id_fkey";

-- Drop workspace_members foreign key
ALTER TABLE "workspace_members" DROP CONSTRAINT IF EXISTS "workspace_members_workspace_id_fkey";

-- Rename workspace_id to user_id in categories (was already user_id in original migration)
ALTER TABLE "categories" RENAME COLUMN "workspace_id" TO "user_id";

-- Drop old unique index and create new one for categories
DROP INDEX IF EXISTS "categories_workspace_id_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "categories_user_id_name_key" ON "categories"("user_id", "name");

-- For transactions: add user_id column and populate from workspace membership, then drop workspace_id
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "user_id" TEXT;
UPDATE "transactions" t SET "user_id" = (
  SELECT wm."user_id" FROM "workspace_members" wm WHERE wm."workspace_id" = t."workspace_id" AND wm."role" = 'ADMIN' LIMIT 1
) WHERE "user_id" IS NULL;
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "workspace_id";
ALTER TABLE "transactions" ALTER COLUMN "user_id" SET NOT NULL;

-- For subscriptions: add user_id column and populate, then drop workspace_id
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "user_id" TEXT;
UPDATE "subscriptions" s SET "user_id" = (
  SELECT wm."user_id" FROM "workspace_members" wm WHERE wm."workspace_id" = s."workspace_id" AND wm."role" = 'ADMIN' LIMIT 1
) WHERE "user_id" IS NULL;
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "workspace_id";
ALTER TABLE "subscriptions" ALTER COLUMN "user_id" SET NOT NULL;

-- For budgets: add user_id column and populate, then drop workspace_id
ALTER TABLE "budgets" ADD COLUMN IF NOT EXISTS "user_id" TEXT;
UPDATE "budgets" b SET "user_id" = (
  SELECT wm."user_id" FROM "workspace_members" wm WHERE wm."workspace_id" = b."workspace_id" AND wm."role" = 'ADMIN' LIMIT 1
) WHERE "user_id" IS NULL;
ALTER TABLE "budgets" DROP COLUMN IF EXISTS "workspace_id";
ALTER TABLE "budgets" ALTER COLUMN "user_id" SET NOT NULL;

-- Drop old unique index and create new one for budgets
DROP INDEX IF EXISTS "budgets_workspace_id_category_id_month_year_key";
CREATE UNIQUE INDEX IF NOT EXISTS "budgets_user_id_category_id_month_year_key" ON "budgets"("user_id", "category_id", "month", "year");

-- For notifications: drop workspace_id column (userId already exists)
ALTER TABLE "notifications" DROP COLUMN IF EXISTS "workspace_id";

-- For credit_cards: add user_id column and populate, then drop workspace_id
ALTER TABLE "credit_cards" ADD COLUMN IF NOT EXISTS "user_id" TEXT;
UPDATE "credit_cards" cc SET "user_id" = (
  SELECT wm."user_id" FROM "workspace_members" wm WHERE wm."workspace_id" = cc."workspace_id" AND wm."role" = 'ADMIN' LIMIT 1
) WHERE "user_id" IS NULL;
ALTER TABLE "credit_cards" DROP COLUMN IF EXISTS "workspace_id";
ALTER TABLE "credit_cards" ALTER COLUMN "user_id" SET NOT NULL;

-- For attachments: add user_id column and populate, then drop workspace_id
ALTER TABLE "attachments" ADD COLUMN IF NOT EXISTS "user_id" TEXT;
UPDATE "attachments" a SET "user_id" = (
  SELECT wm."user_id" FROM "workspace_members" wm WHERE wm."workspace_id" = a."workspace_id" AND wm."role" = 'ADMIN' LIMIT 1
) WHERE "user_id" IS NULL;
ALTER TABLE "attachments" DROP COLUMN IF EXISTS "workspace_id";
ALTER TABLE "attachments" ALTER COLUMN "user_id" SET NOT NULL;

-- Drop workspace_members table
DROP TABLE IF EXISTS "workspace_members";

-- Drop workspaces table
DROP TABLE IF EXISTS "workspaces";

-- Drop WorkspaceRole enum
DROP TYPE IF EXISTS "WorkspaceRole";
