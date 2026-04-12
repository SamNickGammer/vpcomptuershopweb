ALTER TABLE "products" ADD COLUMN "bulk_pricing" jsonb DEFAULT '[]'::jsonb NOT NULL;
