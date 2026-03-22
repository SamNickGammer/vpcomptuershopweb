# 02 — Database Schema

---

## Rules

- NEVER create tables in Supabase dashboard
- Always define schema in `src/lib/db/schema/*.ts`
- After any schema change run: `npm run db:push:local`
- Never edit files inside `drizzle/migrations/` manually
- Relations must have BOTH sides declared or Drizzle throws errors

---

## Schema Files

All in `src/lib/db/schema/`:

| File            | Tables inside                                          |
|-----------------|--------------------------------------------------------|
| `index.ts`      | Re-exports everything — used by `drizzle.config.ts`   |
| `admin.ts`      | `admins`                                               |
| `categories.ts` | `categories`                                           |
| `products.ts`   | `products` (images/specs/variants stored as jsonb)     |
| `inventory.ts`  | `inventory_history`                                    |
| `orders.ts`     | `orders`, `order_items`                                |
| `tracking.ts`   | `tracking_events`, `shipments`                         |
| `customers.ts`  | `customers`                                            |
| `coupons.ts`    | `coupons`                                              |

**REMOVED tables:** `product_variants`, `product_options`, `product_option_values`, `variant_option_values`, `inventory` (stock is now on products table directly).

---

## Table Definitions

### `admins` — admin.ts

| Column          | Type      | Notes                              |
|-----------------|-----------|------------------------------------|
| `id`            | uuid PK   | auto generated                     |
| `name`          | varchar   |                                    |
| `email`         | varchar   | unique                             |
| `password_hash` | text      | bcrypt hashed, never plain text    |
| `role`          | varchar   | default `admin` — future: `super_admin`, `staff` |
| `is_active`     | boolean   | default true                       |
| `last_login_at` | timestamp |                                    |
| `created_at`    | timestamp |                                    |
| `updated_at`    | timestamp |                                    |

---

### `categories` — categories.ts

| Column        | Type      | Notes                                    |
|---------------|-----------|------------------------------------------|
| `id`          | uuid PK   |                                          |
| `name`        | varchar   |                                          |
| `slug`        | varchar   | unique — auto-generated from name        |
| `description` | text      | nullable                                 |
| `parent_id`   | uuid      | self-referencing — nullable, enables hierarchy e.g. Hardware → Motherboards → ICs |
| `sort_order`  | integer   | default 0 — controls display order      |
| `is_active`   | boolean   | default true                             |
| `created_at`  | timestamp |                                          |
| `updated_at`  | timestamp |                                          |

Relations:
- `parent` → one(categories) — self ref
- `children` → many(categories) — self ref

---

### `products` — products.ts

Images, specs, and variants are stored as jsonb columns directly on the products table.
Separate `product_variants`, `product_images`, `product_specs` tables have been **REMOVED**.

| Column              | Type      | Notes                                        |
|---------------------|-----------|----------------------------------------------|
| `id`                | uuid PK   |                                              |
| `category_id`       | uuid      | → categories, nullable                       |
| `name`              | varchar   |                                              |
| `slug`              | varchar   | unique — auto-generated from name            |
| `description`       | text      | nullable                                     |
| `condition`         | enum      | `new` \| `refurbished` \| `used`             |
| `basePrice`         | integer   | **IN PAISE** — ₹1 = 100 paise               |
| `compareAtPrice`    | integer   | nullable — strikethrough price (paise)       |
| `images`            | jsonb     | array of image objects (url, alt, isPrimary)  |
| `specs`             | jsonb     | array of {key, value} spec pairs             |
| `stock`             | integer   | current stock count (replaces inventory table)|
| `lowStockThreshold` | integer   | default 2 — alert when stock <= this         |
| `sku`               | varchar   | nullable — product-level SKU                 |
| `variants`          | jsonb     | array of `ProductVariantData` objects         |
| `is_featured`       | boolean   | default false — shown on homepage            |
| `is_active`         | boolean   | default true                                 |
| `created_at`        | timestamp |                                              |
| `updated_at`        | timestamp |                                              |

Relations:
- `category` → one(categories)

#### `ProductVariantData` type (stored in `variants` jsonb array)

```typescript
type ProductVariantData = {
  variantId: string       // unique ID for the variant
  name: string            // internal name e.g. "8gb-256gb"
  displayName: string     // display name e.g. "8GB / 256GB SSD"
  label: string           // short label for selector UI
  description: string     // nullable — variant description
  sku: string             // variant-level SKU
  price: number           // variant price in paise
  compareAtPrice: number  // nullable — strikethrough price
  images: Array           // variant-specific images
  specs: Array            // variant-specific specs
  stock: number           // variant stock count
  isDefault: boolean      // default selected variant
  isActive: boolean       // whether variant is available
}
```

---

### `customers` — customers.ts (NEW)

| Column          | Type      | Notes                              |
|-----------------|-----------|------------------------------------|
| `id`            | uuid PK   | auto generated                     |
| `name`          | varchar   |                                    |
| `email`         | varchar   | unique                             |
| `passwordHash`  | text      | bcrypt hashed                      |
| `phone`         | varchar   | nullable                           |
| `is_active`     | boolean   | default true                       |
| `created_at`    | timestamp |                                    |
| `updated_at`    | timestamp |                                    |

---

### `coupons` — coupons.ts (NEW)

| Column              | Type      | Notes                                       |
|---------------------|-----------|---------------------------------------------|
| `id`                | uuid PK   | auto generated                              |
| `code`              | varchar   | unique — coupon code entered by customer     |
| `description`       | text      | nullable — admin description                 |
| `discountType`      | varchar   | `percentage` \| `fixed`                      |
| `discountValue`     | integer   | percentage (1-100) or fixed amount in paise  |
| `minOrderAmount`    | integer   | nullable — minimum order total in paise      |
| `maxDiscountAmount` | integer   | nullable — cap on discount amount in paise   |
| `usageLimit`        | integer   | nullable — max total uses                    |
| `usageCount`        | integer   | default 0 — how many times used so far       |
| `validFrom`         | timestamp | nullable — coupon start date                 |
| `validTo`           | timestamp | nullable — coupon expiry date                |
| `is_active`         | boolean   | default true                                 |
| `created_at`        | timestamp |                                              |
| `updated_at`        | timestamp |                                              |

---

### `inventory_history` — inventory.ts

Every stock change is logged here for a full audit trail.
**Note:** The separate `inventory` table has been REMOVED. Stock is tracked directly on `products.stock`.

| Column            | Type      | Notes                                      |
|-------------------|-----------|--------------------------------------------|
| `id`              | uuid PK   |                                            |
| `productId`       | uuid      | → products (was variant_id, now product-level) |
| `change_quantity` | integer   | positive = stock in, negative = stock out  |
| `reason`          | enum      | `purchase` \| `sale` \| `return` \| `adjustment` \| `damage` |
| `note`            | text      | nullable — extra context                   |
| `created_at`      | timestamp |                                            |

---

### `orders` — orders.ts

| Column              | Type      | Notes                                        |
|----------------------|-----------|----------------------------------------------|
| `id`                | uuid PK   |                                              |
| `order_number`      | varchar   | unique — e.g. `VP-ORD-20240318-001`         |
| `customer_name`     | varchar   |                                              |
| `customer_email`    | varchar   |                                              |
| `customer_phone`    | varchar   | nullable                                     |
| `shipping_address`  | jsonb     | `{ line1, line2, city, state, pincode }`    |
| `status`            | enum      | see order status flow below                  |
| `payment_status`    | enum      | `pending` \| `paid` \| `failed` \| `refunded` |
| `paymentMethod`     | varchar   | e.g. `cod`, `online`                         |
| `paidAt`            | timestamp | nullable — when payment was received         |
| `paymentReference`  | varchar   | nullable — transaction ID or reference       |
| `trackingCode`      | varchar   | nullable — internal VP-XXXXXX code           |
| `subtotalAmount`    | integer   | **IN PAISE** — before discount               |
| `discountAmount`    | integer   | **IN PAISE** — discount applied              |
| `couponCode`        | varchar   | nullable — coupon code used                  |
| `total_amount`      | integer   | **IN PAISE** — final amount after discount   |
| `notes`             | text      | nullable — internal admin notes              |
| `created_at`        | timestamp |                                              |
| `updated_at`        | timestamp |                                              |

Order status enum values:
`pending` → `confirmed` → `processing` → `ready_to_ship` → `shipped` → `delivered`
Also: `cancelled`, `returned`

Relations:
- `items` → many(order_items)

---

### `order_items` — orders.ts

Snapshot of product/variant info at time of order.
Stored separately so product changes don't affect historical orders.

| Column         | Type    | Notes                                          |
|----------------|---------|------------------------------------------------|
| `id`           | uuid PK |                                                |
| `order_id`     | uuid    | → orders, cascade delete                       |
| `productId`    | uuid    | → products (reference to product)              |
| `variantId`    | text    | nullable — variant ID string from jsonb variants array |
| `product_name` | varchar | snapshot at order time                         |
| `variant_name` | varchar | snapshot at order time, nullable               |
| `quantity`     | integer |                                                |
| `unit_price`   | integer | paise — snapshot at order time                 |

Relations:
- `order` → one(orders)

---

### `tracking_events` — tracking.ts

Internal tracking timeline. Every status update is a new row.

| Column                 | Type      | Notes                              |
|------------------------|-----------|------------------------------------|
| `id`                   | uuid PK   |                                    |
| `order_id`             | uuid      | → orders, cascade delete           |
| `status`               | varchar   | matches order status enum          |
| `title`                | varchar   | human-readable e.g. "Order Confirmed" |
| `description`          | text      | nullable — extra detail            |
| `created_by_admin_id`  | uuid      | → admins, nullable                 |
| `created_at`           | timestamp |                                    |

Relations:
- `order` → one(orders)
- `createdBy` → one(admins)

---

### `shipments` — tracking.ts

Created when handing order off to a courier.
One order can have at most one shipment record.

| Column                    | Type      | Notes                                     |
|---------------------------|-----------|-------------------------------------------|
| `id`                      | uuid PK   |                                           |
| `order_id`                | uuid      | → orders, cascade delete                  |
| `provider`                | varchar   | "India Post" \| "DTDC" \| "Blue Dart" \| "Delhivery" \| "Self" |
| `external_tracking_number`| varchar   | AWB / consignment number, nullable        |
| `tracking_url`            | text      | direct link to courier tracking, nullable |
| `shipped_at`              | timestamp | when handed to courier                    |
| `estimated_delivery`      | timestamp | nullable                                  |
| `created_at`              | timestamp |                                           |

Relations:
- `order` → one(orders)

---

## Drizzle Relation Rule

Both sides of every relation MUST be declared.
Example — if products has `many(productImages)`,
then productImages must have `one(products)` pointing back.
Missing either side causes Drizzle Studio errors.

---

Last updated: 2026-03-22 — Schema restructured: variants/images/specs moved to jsonb on products, inventory removed (stock on products), customers and coupons tables added, orders updated with payment/coupon fields.
