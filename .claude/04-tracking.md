# 04 — Tracking System

---

## Overview

Every order has TWO layers of tracking that work together:

1. **Internal Tracking** — status updates managed by admin, from order placed until delivered
2. **External Tracking** — courier AWB number, used when handing off to a courier service

Both are optional at any point but together they give the customer a full picture.

---

## Internal Tracking (`tracking_events` table)

### Purpose
- Log every status change for an order
- Visible to admin on order detail page
- Visible to customer on tracking lookup page (future)
- Used for ALL orders — even if self-delivering

### How It Works
- Every time the admin updates an order status, a new row is inserted into `tracking_events`
- Admin can also add a custom description to each event
- Events are displayed as a timeline (newest first or oldest first)

### Status Values (order_status enum)

```
pending          Order placed, payment not confirmed yet
confirmed        Payment confirmed / order accepted by shop
processing       Being packed / components sourced / prepared
ready_to_ship    Packed, waiting for pickup or courier handoff
shipped          Handed to courier OR out for self-delivery
delivered        Customer received the order
cancelled        Order cancelled
returned         Customer returned the order
```

### Internal Tracking Code Format
```
VP-XXXXXX
```
Where XXXXXX is a 6-character nanoid (uppercase alphanumeric).
Generated at order creation. Shown to customer for lookup.
Example: `VP-A3KZ9M`

---

## External Tracking (`shipments` table)

### Purpose
- Store the courier's own tracking number (AWB)
- Link to the courier's tracking page
- Used ONLY when handing off to a courier service

### Supported Couriers

| Provider         | Notes                                  |
|------------------|----------------------------------------|
| India Post       | Speed Post, Registered Post            |
| DTDC             |                                        |
| Blue Dart        |                                        |
| Delhivery        |                                        |
| Shiprocket       | Aggregator — may use multiple carriers |
| Ekart Logistics  |                                        |
| Self             | Admin delivering themselves — no AWB   |

### When to Create a Shipment Record
- When status changes to `shipped`
- Admin enters: provider name + AWB number (optional for Self) + tracking URL (optional)

### Self-Delivery
- Set `provider = "Self"`
- No external tracking number needed
- `tracking_url` is null
- Customer sees only internal tracking events

---

## Delivery Flows

### Flow A — Courier Delivery
```
pending
  ↓ [admin confirms order]
confirmed
  ↓ [admin starts preparing]
processing
  ↓ [item packed]
ready_to_ship
  ↓ [admin creates shipment record with AWB]
shipped          ← external tracking now visible to customer
  ↓ [courier delivers]
delivered
```

### Flow B — Self-Delivery by Shop
```
pending
  ↓
confirmed
  ↓
processing
  ↓
shipped          ← provider = "Self", no AWB
  ↓
delivered
```

### Flow C — Cancelled
```
pending / confirmed / processing
  ↓ [admin or customer cancels]
cancelled
```

### Flow D — Return
```
delivered
  ↓ [customer initiates return]
returned
```

---

## Admin Actions For Tracking

From the order detail page in admin panel, admin can:

1. **Update order status** → creates a new `tracking_event` row automatically
2. **Add tracking note** → add description to a tracking event
3. **Create shipment** → fill in provider + AWB + tracking URL → creates `shipments` row
4. **View full timeline** → see all tracking events in order

---

## Customer-Facing Tracking (future)

Public page at `/track` or `/track/[code]`:
- Customer enters their `VP-XXXXXX` code
- System looks up the order
- Shows internal tracking timeline
- If shipment exists, shows courier AWB + link to courier tracking page

---

## Implementation Location

| Item                        | Location                                        |
|-----------------------------|-------------------------------------------------|
| tracking_events table       | `src/lib/db/schema/tracking.ts`                 |
| shipments table             | `src/lib/db/schema/tracking.ts`                 |
| Code generator              | `src/lib/utils/tracking.ts` (pending)           |
| Admin tracking UI           | `src/components/admin/tracking/` (pending)      |
| Order detail page           | `src/app/(admin)/admin/orders/[id]/` (pending)  |
| Public tracking page        | `src/app/(store)/track/` (future)               |

---

Last updated: Tracking system designed and schema tables created. UI not yet built.
