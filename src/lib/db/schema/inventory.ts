import {
  pgTable,
  uuid,
  integer,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { productVariants } from "./products";

export const inventoryReasonEnum = pgEnum("inventory_reason", [
  "purchase", // stock added via purchase
  "sale", // stock reduced via sale
  "return", // customer returned item
  "adjustment", // manual correction
  "damage", // item damaged/written off
]);

// ── Inventory ─────────────────────────────────────────────────────────────────
// One row per variant — tracks current stock level
export const inventory = pgTable("inventory", {
  id: uuid("id").primaryKey().defaultRandom(),
  variantId: uuid("variant_id")
    .notNull()
    .unique()
    .references(() => productVariants.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(2),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Inventory History ─────────────────────────────────────────────────────────
// Every stock change is logged here for audit trail
export const inventoryHistory = pgTable("inventory_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  variantId: uuid("variant_id")
    .notNull()
    .references(() => productVariants.id),
  changeQuantity: integer("change_quantity").notNull(), // +5 = added, -1 = sold
  reason: inventoryReasonEnum("reason").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const inventoryRelations = relations(inventory, ({ one }) => ({
  variant: one(productVariants, {
    fields: [inventory.variantId],
    references: [productVariants.id],
  }),
}));

export type Inventory = typeof inventory.$inferSelect;
export type InventoryHistory = typeof inventoryHistory.$inferSelect;
