import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

// ── Coupons ───────────────────────────────────────────────────────────────────
export const coupons = pgTable("coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 50 }).notNull().unique(), // e.g. "SAVE10", "WELCOME20"
  description: text("description"),
  discountType: varchar("discount_type", { length: 20 })
    .notNull()
    .default("percentage"), // "percentage" or "fixed"
  discountValue: integer("discount_value").notNull(), // percentage (10 = 10%) or paise for fixed
  minOrderAmount: integer("min_order_amount"), // minimum order amount in paise
  maxDiscountAmount: integer("max_discount_amount"), // cap for percentage discounts in paise
  usageLimit: integer("usage_limit"), // null = unlimited
  usageCount: integer("usage_count").notNull().default(0),
  validFrom: timestamp("valid_from", { withTimezone: true }),
  validTo: timestamp("valid_to", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Coupon = typeof coupons.$inferSelect;
export type NewCoupon = typeof coupons.$inferInsert;
