import { pgTable, uuid, varchar, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { orders } from "./orders";
import { customers } from "./customers";

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  razorpayOrderId: varchar("razorpay_order_id", { length: 100 }),
  razorpayPaymentId: varchar("razorpay_payment_id", { length: 100 }),
  razorpaySignature: varchar("razorpay_signature", { length: 500 }),
  amount: integer("amount").notNull(), // paise
  currency: varchar("currency", { length: 10 }).notNull().default("INR"),
  status: varchar("status", { length: 30 }).notNull().default("created"),
  // created → authorized → captured → refunded → failed
  method: varchar("method", { length: 50 }), // card, upi, netbanking, wallet
  errorCode: varchar("error_code", { length: 100 }),
  errorDescription: text("error_description"),
  refundId: varchar("refund_id", { length: 100 }),
  refundAmount: integer("refund_amount"),
  notes: jsonb("notes").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transactionsRelations = relations(transactions, ({ one }) => ({
  order: one(orders, { fields: [transactions.orderId], references: [orders.id] }),
  customer: one(customers, { fields: [transactions.customerId], references: [customers.id] }),
}));

export type Transaction = typeof transactions.$inferSelect;
