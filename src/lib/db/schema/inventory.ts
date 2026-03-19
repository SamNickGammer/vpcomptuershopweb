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
  "purchase",
  "sale",
  "return",
  "adjustment",
  "damage",
]);

// ── Inventory History ─────────────────────────────────────────────────────────
// Audit trail for every stock change. Current stock is on product_variants.stock
export const inventoryHistory = pgTable("inventory_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  variantId: uuid("variant_id")
    .notNull()
    .references(() => productVariants.id, { onDelete: "cascade" }),
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
    variant: one(productVariants, {
      fields: [inventoryHistory.variantId],
      references: [productVariants.id],
    }),
  })
);

export type InventoryHistory = typeof inventoryHistory.$inferSelect;
