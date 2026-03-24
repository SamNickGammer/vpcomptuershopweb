import { pgTable, uuid, varchar, text, timestamp, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { orders } from "./orders";
import { admins } from "./admin";

// ── Internal Tracking Events ──────────────────────────────────────────────────
// Every status change is logged here — visible to admin + customer
export const trackingEvents = pgTable("tracking_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 50 }).notNull(), // matches order_status enum
  title: varchar("title", { length: 200 }).notNull(), // "Order Confirmed"
  description: text("description"), // optional extra detail
  createdByAdminId: uuid("created_by_admin_id").references(() => admins.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── External Shipments ────────────────────────────────────────────────────────
// Created when handing order to a courier service
// If self-delivering: provider = "Self", no external tracking number needed
export const shipments = pgTable("shipments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 100 }).notNull(), // "India Post" | "DTDC" | "Self" etc.
  externalTrackingNumber: varchar("external_tracking_number", { length: 200 }), // AWB / consignment no.
  trackingUrl: text("tracking_url"), // direct tracking link if available
  shippedAt: timestamp("shipped_at", { withTimezone: true }),
  estimatedDelivery: timestamp("estimated_delivery", { withTimezone: true }),
  shiprocketShipmentId: integer("shiprocket_shipment_id"),
  shiprocketOrderId: integer("shiprocket_order_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Relations ─────────────────────────────────────────────────────────────────
export const trackingEventsRelations = relations(trackingEvents, ({ one }) => ({
  order: one(orders, {
    fields: [trackingEvents.orderId],
    references: [orders.id],
  }),
  createdBy: one(admins, {
    fields: [trackingEvents.createdByAdminId],
    references: [admins.id],
  }),
}));

export const shipmentsRelations = relations(shipments, ({ one }) => ({
  order: one(orders, {
    fields: [shipments.orderId],
    references: [orders.id],
  }),
}));

export type TrackingEvent = typeof trackingEvents.$inferSelect;
export type NewTrackingEvent = typeof trackingEvents.$inferInsert;
export type Shipment = typeof shipments.$inferSelect;
export type NewShipment = typeof shipments.$inferInsert;
