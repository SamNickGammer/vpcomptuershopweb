import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { customers } from "./customers";
import { products } from "./products";

export const wishlists = pgTable("wishlists", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  variantId: text("variant_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const wishlistsRelations = relations(wishlists, ({ one }) => ({
  customer: one(customers, {
    fields: [wishlists.customerId],
    references: [customers.id],
  }),
  product: one(products, {
    fields: [wishlists.productId],
    references: [products.id],
  }),
}));

export type Wishlist = typeof wishlists.$inferSelect;
