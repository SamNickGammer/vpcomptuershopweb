import {
  pgTable,
  uuid,
  integer,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { products } from "./products";

export const inventoryReasonEnum = pgEnum("inventory_reason", [
  "purchase",
  "sale",
  "return",
  "adjustment",
  "damage",
]);

// ── Inventory History ─────────────────────────────────────────────────────────
// Audit trail for stock changes. Current stock is on products.stock.
export const inventoryHistory = pgTable("inventory_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  variantId: text("variant_id"), // optional - which variant's stock changed
  changeQuantity: integer("change_quantity").notNull(),
  reason: inventoryReasonEnum("reason").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const inventoryHistoryRelations = relations(
  inventoryHistory,
  ({ one }) => ({
    product: one(products, {
      fields: [inventoryHistory.productId],
      references: [products.id],
    }),
  })
);

export type InventoryHistory = typeof inventoryHistory.$inferSelect;
