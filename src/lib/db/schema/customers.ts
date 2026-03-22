import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

// Address type stored in JSONB array
export type CustomerAddress = {
  id: string; // unique ID for the address
  label: string; // "Home", "Office", "Other"
  name: string; // recipient name
  phone: string; // recipient phone
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 150 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  phone: varchar("phone", { length: 20 }).notNull().default(""),
  addresses: jsonb("addresses")
    .$type<CustomerAddress[]>()
    .notNull()
    .default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
