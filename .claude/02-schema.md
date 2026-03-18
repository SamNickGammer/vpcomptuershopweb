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
| `products.ts`   | `products`, `product_variants`, `product_images`, `product_specs` |
| `inventory.ts`  | `inventory`, `inventory_history`                       |
| `orders.ts`     | `orders`, `order_items`                                |
| `tracking.ts`   | `tracking_events`, `shipments`                         |

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

| Column        | Type      | Notes                                        |
|---------------|-----------|----------------------------------------------|
| `id`          | uuid PK   |                                              |
| `category_id` | uuid      | → categories, nullable                       |
| `name`        | varchar   |                                              |
| `slug`        | varchar   | unique — auto-generated from name            |
| `description` | text      | nullable                                     |
| `condition`   | enum      | `new` \| `refurbished` \| `used`             |
| `base_price`  | integer   | **IN PAISE** — ₹1 = 100 paise               |
| `is_featured` | boolean   | default false — shown on homepage            |
| `is_active`   | boolean   | default true                                 |
| `created_at`  | timestamp |                                              |
| `updated_at`  | timestamp |                                              |

Relations:
- `category` → one(categories)
- `variants` → many(product_variants)
- `images` → many(product_images)
- `specs` → many(product_specs)

---

### `product_variants` — products.ts

Each variant is a sellable configuration of a product.
Example: laptop with "8GB / 256GB SSD" vs "16GB / 512GB SSD"

| Column      | Type    | Notes                                         |
|-------------|---------|-----------------------------------------------|
| `id`        | uuid PK |                                               |
| `product_id`| uuid    | → products, cascade delete                    |
| `name`      | varchar | e.g. "8GB RAM / 256GB SSD"                   |
| `sku`       | varchar | unique — set by admin or auto-generated       |
| `price`     | integer | nullable — overrides `base_price` if set (paise) |
| `is_active` | boolean | default true                                  |
| `created_at`| timestamp |                                             |
| `updated_at`| timestamp |                                             |

Relations:
- `product` → one(products)

---

### `product_images` — products.ts

| Column      | Type    | Notes                                          |
|-------------|---------|------------------------------------------------|
| `id`        | uuid PK |                                                |
| `product_id`| uuid    | → products, cascade delete                     |
| `url`       | text    | Supabase Storage public URL                    |
| `alt_text`  | varchar | nullable                                       |
| `sort_order`| integer | default 0 — controls display order             |
| `is_primary`| boolean | default false — main image shown in listings   |
| `created_at`| timestamp |                                              |

Relations:
- `product` → one(products)

---

### `product_specs` — products.ts

Key-value spec pairs for a product.
Example: key="RAM", value="16GB" | key="Processor", value="Intel i5 10th Gen"

| Column      | Type    | Notes                        |
|-------------|---------|------------------------------|
| `id`        | uuid PK |                              |
| `product_id`| uuid    | → products, cascade delete   |
| `key`       | varchar | e.g. "RAM", "Processor"     |
| `value`     | varchar | e.g. "16GB", "Intel i5"     |
| `sort_order`| integer | default 0                    |

Relations:
- `product` → one(products)

---

### `inventory` — inventory.ts

One row per product variant. Tracks current stock level.

| Column                | Type      | Notes                              |
|-----------------------|-----------|------------------------------------|
| `id`                  | uuid PK   |                                    |
| `variant_id`          | uuid      | → product_variants, unique, cascade delete |
| `quantity`            | integer   | current stock count                |
| `low_stock_threshold` | integer   | default 2 — alert when stock <= this |
| `updated_at`          | timestamp |                                    |

Relations:
- `variant` → one(product_variants)

---

### `inventory_history` — inventory.ts

Every stock change is logged here for a full audit trail.

| Column            | Type      | Notes                                      |
|-------------------|-----------|--------------------------------------------|
| `id`              | uuid PK   |                                            |
| `variant_id`      | uuid      | → product_variants                         |
| `change_quantity` | integer   | positive = stock in, negative = stock out  |
| `reason`          | enum      | `purchase` \| `sale` \| `return` \| `adjustment` \| `damage` |
| `note`            | text      | nullable — extra context                   |
| `created_at`      | timestamp |                                            |

---

### `orders` — orders.ts

| Column             | Type      | Notes                                        |
|--------------------|-----------|----------------------------------------------|
| `id`               | uuid PK   |                                              |
| `order_number`     | varchar   | unique — e.g. `VP-ORD-20240318-001`         |
| `customer_name`    | varchar   |                                              |
| `customer_email`   | varchar   |                                              |
| `customer_phone`   | varchar   | nullable                                     |
| `shipping_address` | jsonb     | `{ line1, line2, city, state, pincode }`    |
| `status`           | enum      | see order status flow below                  |
| `payment_status`   | enum      | `pending` \| `paid` \| `failed` \| `refunded` |
| `total_amount`     | integer   | **IN PAISE**                                 |
| `notes`            | text      | nullable — internal admin notes              |
| `created_at`       | timestamp |                                              |
| `updated_at`       | timestamp |                                              |

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
| `variant_id`   | uuid    | → product_variants, nullable (variant may be deleted later) |
| `product_name` | varchar | snapshot at order time                         |
| `variant_name` | varchar | snapshot at order time, nullable               |
| `quantity`     | integer |                                                |
| `unit_price`   | integer | paise — snapshot at order time                 |

Relations:
- `order` → one(orders)
- `variant` → one(product_variants)

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

Last updated: All 10 tables defined and pushed to Supabase successfully.
