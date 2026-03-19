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

// ── Products ──────────────────────────────────────────────────────────────────
// Base product info — pricing, images, specs all live on variants
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").references(() => categories.id),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 300 }).notNull().unique(),
  description: text("description"),
  condition: conditionEnum("condition").notNull().default("new"),
  isFeatured: boolean("is_featured").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Product Options ───────────────────────────────────────────────────────────
// Option groups for a product: "Color", "RAM", "Storage"
// If a product has no options → it gets a single "Default" variant
export const productOptions = pgTable("product_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(), // e.g. "Color", "RAM"
  position: integer("position").notNull().default(0),
});

// ── Product Option Values ─────────────────────────────────────────────────────
// Possible values for each option: "Red", "Black" for Color
export const productOptionValues = pgTable("product_option_values", {
  id: uuid("id").primaryKey().defaultRandom(),
  optionId: uuid("option_id")
    .notNull()
    .references(() => productOptions.id, { onDelete: "cascade" }),
  value: varchar("value", { length: 150 }).notNull(), // e.g. "Red", "8GB"
  position: integer("position").notNull().default(0),
});

// ── Product Variants ──────────────────────────────────────────────────────────
// Each variant = a sellable combination (Red + 8GB + 256GB)
// Always at least 1 variant per product (the "Default" variant)
export const productVariants = pgTable("product_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(), // "Red / 8GB / 256GB" or "Default"
  sku: varchar("sku", { length: 100 }).notNull().unique(),
  price: integer("price").notNull(), // in paise, always required
  compareAtPrice: integer("compare_at_price"), // optional original price for discounts
  images: jsonb("images")
    .$type<Array<{ url: string; altText?: string }>>()
    .notNull()
    .default([]),
  specs: jsonb("specs")
    .$type<Array<{ key: string; value: string }>>()
    .notNull()
    .default([]),
  stock: integer("stock").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(2),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Variant Option Values (junction) ──────────────────────────────────────────
// Links a variant to the specific option values that define it
// e.g. Variant "Red/8GB" → [Color:Red, RAM:8GB]
export const variantOptionValues = pgTable("variant_option_values", {
  id: uuid("id").primaryKey().defaultRandom(),
  variantId: uuid("variant_id")
    .notNull()
    .references(() => productVariants.id, { onDelete: "cascade" }),
  optionValueId: uuid("option_value_id")
    .notNull()
    .references(() => productOptionValues.id, { onDelete: "cascade" }),
});

// ── Relations ─────────────────────────────────────────────────────────────────

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  options: many(productOptions),
  variants: many(productVariants),
}));

export const productOptionsRelations = relations(
  productOptions,
  ({ one, many }) => ({
    product: one(products, {
      fields: [productOptions.productId],
      references: [products.id],
    }),
    values: many(productOptionValues),
  })
);

export const productOptionValuesRelations = relations(
  productOptionValues,
  ({ one, many }) => ({
    option: one(productOptions, {
      fields: [productOptionValues.optionId],
      references: [productOptions.id],
    }),
    variantLinks: many(variantOptionValues),
  })
);

export const productVariantsRelations = relations(
  productVariants,
  ({ one, many }) => ({
    product: one(products, {
      fields: [productVariants.productId],
      references: [products.id],
    }),
    optionValues: many(variantOptionValues),
  })
);

export const variantOptionValuesRelations = relations(
  variantOptionValues,
  ({ one }) => ({
    variant: one(productVariants, {
      fields: [variantOptionValues.variantId],
      references: [productVariants.id],
    }),
    optionValue: one(productOptionValues, {
      fields: [variantOptionValues.optionValueId],
      references: [productOptionValues.id],
    }),
  })
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductOption = typeof productOptions.$inferSelect;
export type ProductOptionValue = typeof productOptionValues.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
export type VariantImage = { url: string; altText?: string };
export type VariantSpec = { key: string; value: string };
