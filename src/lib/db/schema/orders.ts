import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { productVariants } from "./products";

export const orderStatusEnum = pgEnum("order_status", [
  "pending", // just placed, payment not confirmed
  "confirmed", // payment confirmed / order accepted
  "processing", // being packed / prepared
  "ready_to_ship", // packed, waiting for pickup or handoff
  "shipped", // handed to courier or out for delivery
  "delivered", // delivered to customer
  "cancelled", // cancelled
  "returned", // customer returned
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
]);

// ── Orders ────────────────────────────────────────────────────────────────────
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(), // VP-ORD-20240318-001
  customerName: varchar("customer_name", { length: 150 }).notNull(),
  customerEmail: varchar("customer_email", { length: 255 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 20 }),
  shippingAddress: jsonb("shipping_address").notNull(), // { line1, line2, city, state, pincode }
  status: orderStatusEnum("status").notNull().default("pending"),
  paymentStatus: paymentStatusEnum("payment_status")
    .notNull()
    .default("pending"),
  totalAmount: integer("total_amount").notNull(), // paise
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Order Items ───────────────────────────────────────────────────────────────
// Snapshot of product info at order time (in case product changes later)
export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").references(() => productVariants.id), // nullable if variant deleted
  productName: varchar("product_name", { length: 255 }).notNull(), // snapshot
  variantName: varchar("variant_name", { length: 255 }), // snapshot
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(), // paise, snapshot
});

// ── Relations ─────────────────────────────────────────────────────────────────
export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
