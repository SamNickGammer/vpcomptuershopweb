ALTER TABLE "products" ADD COLUMN "shipping_weight_grams" integer DEFAULT 0 NOT NULL;
ALTER TABLE "products" ADD COLUMN "shipping_dimensions" jsonb DEFAULT '{"lengthCm":0,"breadthCm":0,"heightCm":0}'::jsonb NOT NULL;
ALTER TABLE "orders" ADD COLUMN "shipping_quote" jsonb;
