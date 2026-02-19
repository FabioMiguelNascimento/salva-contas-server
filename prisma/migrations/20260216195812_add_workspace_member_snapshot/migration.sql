-- Add name and email snapshot to workspace_members
ALTER TABLE "workspace_members" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "workspace_members" ADD COLUMN IF NOT EXISTS "email" TEXT;
