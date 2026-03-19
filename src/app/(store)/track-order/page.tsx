"use client";

import { useState } from "react";
import {
  Search,
  Package,
  Loader2,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  ExternalLink,
  MapPin,
  CreditCard,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";
import { cn, formatPrice } from "@/lib/utils/helpers";

type TimelineEvent = {
  title: string;
  description: string | null;
  date: string;
};

type OrderItem = {
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
};

type Shipment = {
  provider: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  estimatedDelivery: string | null;
};

type OrderData = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  customerName: string;
  totalAmount: number;
  subtotalAmount: number;
  discountAmount: number;
  couponCode: string | null;
  createdAt: string;
  items: OrderItem[];
  timeline: TimelineEvent[];
  shipment: Shipment | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pending: { label: "Order Placed", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: Clock },
  confirmed: { label: "Confirmed", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: CheckCircle2 },
  processing: { label: "Processing", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20", icon: Package },
  ready_to_ship: { label: "Ready to Ship", color: "text-sky-400 bg-sky-500/10 border-sky-500/20", icon: Package },
  shipped: { label: "Shipped", color: "text-purple-400 bg-purple-500/10 border-purple-500/20", icon: Truck },
  delivered: { label: "Delivered", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "text-red-400 bg-red-500/10 border-red-500/20", icon: XCircle },
  returned: { label: "Returned", color: "text-orange-400 bg-orange-500/10 border-orange-500/20", icon: RotateCcw },
};

const STEPS = ["pending", "confirmed", "processing", "ready_to_ship", "shipped", "delivered"];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = orderNumber.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");
    setOrder(null);

    try {
      const res = await fetch(`/api/tracking?orderNumber=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (data.success) {
        setOrder(data.data);
      } else {
        setError(data.error || "Order not found");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = order ? STATUS_CONFIG[order.status] || STATUS_CONFIG.pending : null;
  const currentStepIndex = order ? STEPS.indexOf(order.status) : -1;
  const isCancelledOrReturned = order && (order.status === "cancelled" || order.status === "returned");

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative py-16 md:py-24">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(129,140,248,0.08) 0%, transparent 70%)"
        }} />
        <div className="relative max-w-2xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/[0.06] px-4 py-1.5 text-xs font-medium text-indigo-300/90 mb-6">
            <MapPin className="h-3 w-3" />
            Real-time Order Tracking
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            <span className="bg-clip-text text-transparent" style={{
              backgroundImage: "linear-gradient(to right, #fafafa, #a1a1aa)"
            }}>
              Track Your Order
            </span>
          </h1>
          <p className="text-muted-foreground mb-10">
            Enter your order number to see the latest status and delivery updates
          </p>

          {/* Search Form */}
          <form onSubmit={handleTrack} className="relative max-w-lg mx-auto">
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                placeholder="VP-ORD-20260315-001"
                className="w-full h-14 pl-13 pr-32 rounded-2xl bg-secondary/80 border border-border text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/30 transition-all font-mono text-sm"
                style={{ paddingLeft: "3.2rem" }}
              />
              <button
                type="submit"
                disabled={loading || !orderNumber.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Track
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Error */}
          {error && (
            <div className="mt-6 p-4 rounded-xl bg-red-500/[0.06] border border-red-500/20 text-red-400 text-sm max-w-lg mx-auto">
              {error}
            </div>
          )}
        </div>
      </section>

      {/* Results */}
      {order && statusConfig && (
        <section className="pb-20 px-4">
          <div className="max-w-4xl mx-auto space-y-6">

            {/* Status Header Card */}
            <div className="bg-card rounded-2xl border border-border p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Order Number</p>
                  <p className="text-xl font-bold font-mono text-primary">{order.orderNumber}</p>
                </div>
                <div className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold",
                  statusConfig.color
                )}>
                  <statusConfig.icon className="h-4 w-4" />
                  {statusConfig.label}
                </div>
              </div>

              {/* Progress Steps (only for normal flow, not cancelled/returned) */}
              {!isCancelledOrReturned && (
                <div className="relative">
                  {/* Progress bar background */}
                  <div className="absolute top-4 left-0 right-0 h-0.5 bg-border" />
                  {/* Progress bar filled */}
                  <div
                    className="absolute top-4 left-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
                    style={{ width: `${Math.max(0, (currentStepIndex / (STEPS.length - 1)) * 100)}%` }}
                  />
                  {/* Steps */}
                  <div className="relative flex justify-between">
                    {STEPS.map((step, i) => {
                      const isComplete = i <= currentStepIndex;
                      const isCurrent = i === currentStepIndex;
                      const config = STATUS_CONFIG[step];
                      return (
                        <div key={step} className="flex flex-col items-center">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                            isComplete
                              ? "bg-indigo-500 border-indigo-500 text-white"
                              : "bg-background border-border text-muted-foreground/30",
                            isCurrent && "ring-4 ring-indigo-500/20"
                          )}>
                            {isComplete ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-current" />
                            )}
                          </div>
                          <span className={cn(
                            "text-[10px] md:text-xs mt-2 text-center font-medium max-w-[60px] md:max-w-none",
                            isComplete ? "text-foreground/80" : "text-muted-foreground/40"
                          )}>
                            {config?.label || step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left: Timeline + Items */}
              <div className="lg:col-span-2 space-y-6">
                {/* Timeline */}
                <div className="bg-card rounded-2xl border border-border p-6">
                  <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Tracking Timeline
                  </h2>
                  {order.timeline.length === 0 ? (
                    <p className="text-sm text-muted-foreground/60 py-4 text-center">No tracking updates yet</p>
                  ) : (
                    <div className="relative pl-6">
                      {/* Vertical line */}
                      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
                      <div className="space-y-6">
                        {[...order.timeline].reverse().map((event, i) => (
                          <div key={i} className="relative">
                            {/* Dot */}
                            <div className={cn(
                              "absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2",
                              i === 0
                                ? "bg-indigo-500 border-indigo-500 shadow-[0_0_8px_rgba(129,140,248,0.4)]"
                                : "bg-background border-border"
                            )} />
                            <div>
                              <p className={cn(
                                "text-sm font-medium",
                                i === 0 ? "text-foreground" : "text-muted-foreground"
                              )}>
                                {event.title}
                              </p>
                              {event.description && (
                                <p className="text-xs text-muted-foreground/60 mt-0.5">{event.description}</p>
                              )}
                              <p className="text-[11px] text-muted-foreground/40 mt-1 font-mono">
                                {formatDate(event.date)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Order Items */}
                <div className="bg-card rounded-2xl border border-border p-6">
                  <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    Order Items
                  </h2>
                  <div className="space-y-3">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{item.productName}</p>
                          {item.variantName && item.variantName !== "Default" && (
                            <p className="text-xs text-muted-foreground/60">{item.variantName}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <span className="text-xs text-muted-foreground/50">x{item.quantity}</span>
                          <span className="text-sm font-mono font-medium">{formatPrice(item.unitPrice * item.quantity)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Totals */}
                  <div className="mt-4 pt-4 border-t border-border space-y-1.5">
                    {order.discountAmount > 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-mono">{formatPrice(order.subtotalAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-emerald-400 flex items-center gap-1">
                            Discount
                            {order.couponCode && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 font-mono">
                                {order.couponCode}
                              </span>
                            )}
                          </span>
                          <span className="text-emerald-400 font-mono">-{formatPrice(order.discountAmount)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between text-base font-bold pt-1">
                      <span>Total</span>
                      <span className="font-mono text-primary">{formatPrice(order.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Info Cards */}
              <div className="space-y-6">
                {/* Order Info */}
                <div className="bg-card rounded-2xl border border-border p-6">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-4">Order Details</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground/50">Customer</p>
                      <p className="text-sm font-medium">{order.customerName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground/50">Order Date</p>
                      <p className="text-sm font-mono">{formatDate(order.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground/50">Payment</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <CreditCard className="h-3.5 w-3.5 text-muted-foreground/50" />
                        <span className="text-sm capitalize">{order.paymentMethod.replace("_", " ")}</span>
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full border font-medium",
                          order.paymentStatus === "paid"
                            ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                            : order.paymentStatus === "failed"
                              ? "text-red-400 bg-red-500/10 border-red-500/20"
                              : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                        )}>
                          {order.paymentStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shipment Info */}
                {order.shipment && (
                  <div className="bg-card rounded-2xl border border-border p-6">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Shipping Details
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground/50">Courier</p>
                        <p className="text-sm font-medium">{order.shipment.provider}</p>
                      </div>
                      {order.shipment.trackingNumber && (
                        <div>
                          <p className="text-xs text-muted-foreground/50">Tracking Number</p>
                          <p className="text-sm font-mono">{order.shipment.trackingNumber}</p>
                        </div>
                      )}
                      {order.shipment.trackingUrl && (
                        <a
                          href={order.shipment.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          Track on courier site
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {order.shipment.shippedAt && (
                        <div>
                          <p className="text-xs text-muted-foreground/50">Shipped On</p>
                          <p className="text-sm font-mono">{formatDate(order.shipment.shippedAt)}</p>
                        </div>
                      )}
                      {order.shipment.estimatedDelivery && (
                        <div>
                          <p className="text-xs text-muted-foreground/50">Est. Delivery</p>
                          <p className="text-sm font-mono">{formatDate(order.shipment.estimatedDelivery)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Help */}
                <div className="bg-card rounded-2xl border border-border p-6">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Need Help?</h3>
                  <p className="text-xs text-muted-foreground/60 mb-3">
                    Contact us for any queries about your order.
                  </p>
                  <div className="space-y-1.5 text-sm">
                    <p className="text-muted-foreground">
                      Email: <span className="text-foreground">support@vpcomputer.in</span>
                    </p>
                    <p className="text-muted-foreground">
                      Phone: <span className="text-foreground">+91 98XXX XXXXX</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
