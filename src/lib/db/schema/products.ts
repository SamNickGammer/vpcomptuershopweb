import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { categories } from "./categories";

export const conditionEnum = pgEnum("condition", [
  "new",
  "refurbished",
  "used",
]);

// ── Variant type (stored as JSONB array on products) ──────────────────────────
// Each variant is a sellable configuration of the same product.
// Example: Acer UP200 Pendrive → variants: [{name:"8GB", price:399}, {name:"32GB", price:699}]
// In the storefront, each variant appears as a separate listing.
export type ProductVariantData = {
  variantId: string;
  name: string; // "8GB", "Black / 16GB RAM", etc.
  sku: string;
  price: number; // paise
  compareAtPrice?: number | null;
  images: Array<{ url: string; altText?: string }>;
  specs: Array<{ key: string; value: string }>;
  stock: number;
  isDefault?: boolean;
  isActive?: boolean;
};

// ── Products ──────────────────────────────────────────────────────────────────
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").references(() => categories.id),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 300 }).notNull().unique(),
  description: text("description"),
  condition: conditionEnum("condition").notNull().default("new"),
  sku: varchar("sku", { length: 100 }),
  // Default pricing (from default variant or single product)
  basePrice: integer("base_price").notNull().default(0),
  compareAtPrice: integer("compare_at_price"),
  // Default images & specs
  images: jsonb("images")
    .$type<Array<{ url: string; altText?: string }>>()
    .notNull()
    .default([]),
  specs: jsonb("specs")
    .$type<Array<{ key: string; value: string }>>()
    .notNull()
    .default([]),
  // Inventory
  stock: integer("stock").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(2),
  // Variants as JSON array (empty = single product, no variants)
  variants: jsonb("variants")
    .$type<ProductVariantData[]>()
    .notNull()
    .default([]),
  isFeatured: boolean("is_featured").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Relations ─────────────────────────────────────────────────────────────────
export const productsRelations = relations(products, ({ one }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
}));

// ── Types ─────────────────────────────────────────────────────────────────────
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
