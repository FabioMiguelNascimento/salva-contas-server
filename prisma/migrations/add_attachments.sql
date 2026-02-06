-- Migration: Add attachments table
-- Description: Adiciona suporte para upload e armazenamento de PDFs e imagens de boletos

-- Create enum for attachment types
CREATE TYPE "AttachmentType" AS ENUM ('pdf', 'image', 'document');

-- Create attachments table
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "type" "AttachmentType" NOT NULL,
    "storage_url" TEXT NOT NULL,
    "description" TEXT,
    "transaction_id" TEXT,
    "subscription_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- Create indexes for better query performance
CREATE INDEX "attachments_user_id_idx" ON "attachments"("user_id");
CREATE INDEX "attachments_transaction_id_idx" ON "attachments"("transaction_id");
CREATE INDEX "attachments_subscription_id_idx" ON "attachments"("subscription_id");
CREATE INDEX "attachments_type_idx" ON "attachments"("type");
CREATE INDEX "attachments_created_at_idx" ON "attachments"("created_at");

-- Add comments for documentation
COMMENT ON TABLE "attachments" IS 'Stores metadata for uploaded files (PDFs, images) attached to transactions and subscriptions';
COMMENT ON COLUMN "attachments"."file_name" IS 'Unique filename used in storage system';
COMMENT ON COLUMN "attachments"."original_name" IS 'Original filename from user upload';
COMMENT ON COLUMN "attachments"."file_size" IS 'File size in bytes';
COMMENT ON COLUMN "attachments"."storage_url" IS 'URL or path to access the file';
COMMENT ON COLUMN "attachments"."transaction_id" IS 'Optional reference to a transaction';
COMMENT ON COLUMN "attachments"."subscription_id" IS 'Optional reference to a subscription';
