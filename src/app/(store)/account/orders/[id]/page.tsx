"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  Loader2,
  Clock,
  CreditCard,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Truck,
  MapPin,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { formatPrice, cn } from "@/lib/utils/helpers";

// ── Types ────────────────────────────────────────────────────────────────────

type ShippingAddress = {
  name?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
};

type OrderItem = {
  id: string;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
};

type TimelineEvent = {
  id: string;
  status: string;
  title: string;
  description: string | null;
  createdAt: string;
};

type ShipmentInfo = {
  id: string;
  provider: string;
  externalTrackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  estimatedDelivery: string | null;
};

type TransactionInfo = {
  razorpayPaymentId: string | null;
  amount: number;
  status: string;
  method: string | null;
  refundAmount: number | null;
};

type OrderDetail = {
  id: string;
  orderNumber: string;
  trackingCode: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  shippingAddress: ShippingAddress;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  paidAt: string | null;
  subtotalAmount: number;
  discountAmount: number;
  shippingAmount: number;
  totalAmount: number;
  couponCode: string | null;
  createdAt: string;
  items: OrderItem[];
  timeline: TimelineEvent[];
  shipment: ShipmentInfo | null;
  transaction: TransactionInfo | null;
};

// ── Constants ────────────────────────────────────────────────────────────────

const ORDER_STEPS = [
  { key: "pending", label: "Placed" },
  { key: "confirmed", label: "Confirmed" },
  { key: "processing", label: "Processing" },
  { key: "ready_to_ship", label: "Ready to Ship" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-600 border-amber-200",
  paid: "bg-green-50 text-green-600 border-green-200",
  failed: "bg-red-50 text-red-500 border-red-200",
  refunded: "bg-blue-50 text-blue-600 border-blue-200",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatStatus(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStepIndex(status: string): number {
  return ORDER_STEPS.findIndex((s) => s.key === status);
}

// ── Component ────────────────────────────────────────────────────────────────

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedTracking, setCopiedTracking] = useState(false);

  useEffect(() => {
    async function fetchOrder() {
      setLoading(true);
      try {
        const res = await fetch(`/api/auth/customer/orders/${id}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to load order");
          return;
        }
        const data = await res.json();
        setOrder(data.data?.order || null);
      } catch {
        setError("Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [id]);

  function handleCopyTracking(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 bg-white">
        <Package className="h-16 w-16 text-gray-300" />
        <h1 className="text-2xl font-bold text-gray-900">Order Not Found</h1>
        <p className="text-gray-500 text-center">{error || "This order could not be found."}</p>
        <Link
          href="/account"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Account
        </Link>
      </div>
    );
  }

  const isCancelled = order.status === "cancelled";
  const isReturned = order.status === "returned";
  const showProgressBar = !isCancelled && !isReturned;
  const currentStepIndex = getStepIndex(order.status);
  const isPaymentFailed = order.paymentStatus === "failed";
  const isPendingOnline = order.paymentStatus === "pending" && order.paymentMethod === "online";
  const addr = order.shippingAddress;

  const paymentMethodLabel =
    order.paymentMethod === "cod"
      ? "Cash on Delivery"
      : order.paymentMethod === "upi"
        ? "UPI"
        : order.paymentMethod === "bank_transfer"
          ? "Bank Transfer"
          : "Online Payment";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 bg-white min-h-screen">
      {/* Back button + Header */}
      <div className="mb-8">
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Account
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <span className="font-mono text-amber-600">{order.orderNumber}</span>
            </h1>
            <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
              <Clock className="h-3.5 w-3.5" />
              Placed on {formatDate(order.createdAt)}
            </div>
          </div>
          {(isCancelled || isReturned) && (
            <span
              className={cn(
                "px-4 py-2 rounded-full text-sm font-semibold border",
                isCancelled
                  ? "bg-red-50 text-red-600 border-red-200"
                  : "bg-orange-50 text-orange-600 border-orange-200"
              )}
            >
              {isCancelled ? "Cancelled" : "Returned"}
            </span>
          )}
        </div>
      </div>

      {/* Status Progress Bar */}
      {showProgressBar && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <div className="relative">
            {/* Progress line */}
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200">
              <div
                className="h-full bg-amber-500 transition-all duration-500"
                style={{
                  width:
                    currentStepIndex >= 0
                      ? `${(currentStepIndex / (ORDER_STEPS.length - 1)) * 100}%`
                      : "0%",
                }}
              />
            </div>

            {/* Steps */}
            <div className="relative flex justify-between">
              {ORDER_STEPS.map((step, idx) => {
                const isFilled = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;

                return (
                  <div key={step.key} className="flex flex-col items-center">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all z-10",
                        isFilled
                          ? "bg-amber-500 border-amber-500 text-white"
                          : "bg-white border-gray-300 text-gray-400",
                        isCurrent && "ring-4 ring-amber-200 shadow-lg shadow-amber-200/50"
                      )}
                    >
                      {isFilled ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span
                      className={cn(
                        "mt-2 text-xs font-medium text-center max-w-[70px]",
                        isFilled ? "text-amber-700" : "text-gray-400"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Section 1: Order Items */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Package className="h-5 w-5 text-amber-600" />
            Order Items
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="text-left px-6 py-3 font-medium">Product</th>
                <th className="text-center px-4 py-3 font-medium">Qty</th>
                <th className="text-right px-4 py-3 font-medium">Unit Price</th>
                <th className="text-right px-6 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-gray-50">
                  <td className="px-6 py-3">
                    <div className="text-gray-900 font-medium">{item.productName}</div>
                    {item.variantName && item.variantName !== "Default" && (
                      <div className="text-gray-400 text-xs mt-0.5">{item.variantName}</div>
                    )}
                  </td>
                  <td className="text-center px-4 py-3 text-gray-600">{item.quantity}</td>
                  <td className="text-right px-4 py-3 text-gray-600">{formatPrice(item.unitPrice)}</td>
                  <td className="text-right px-6 py-3 text-gray-900 font-medium">
                    {formatPrice(item.unitPrice * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-gray-50/50 space-y-2">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span>
            <span>{formatPrice(order.subtotalAmount)}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>
                Discount
                {order.couponCode && (
                  <span className="ml-1.5 px-2 py-0.5 bg-green-50 border border-green-200 rounded text-xs font-mono">
                    {order.couponCode}
                  </span>
                )}
              </span>
              <span>-{formatPrice(order.discountAmount)}</span>
            </div>
          )}
          {order.shippingAmount > 0 && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>Shipping</span>
              <span>{formatPrice(order.shippingAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
            <span>Total</span>
            <span>{formatPrice(order.totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Section 2: Payment Info */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-amber-600" />
            Payment Information
          </h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium text-gray-700">
              <CreditCard className="h-3.5 w-3.5" />
              {paymentMethodLabel}
            </span>
            <span
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium border",
                PAYMENT_STATUS_STYLES[order.paymentStatus] || PAYMENT_STATUS_STYLES.pending
              )}
            >
              {formatStatus(order.paymentStatus)}
            </span>
          </div>

          {order.paymentStatus === "paid" && order.transaction && (
            <div className="space-y-2 text-sm">
              {order.transaction.razorpayPaymentId && (
                <div className="flex items-center gap-2 text-gray-500">
                  <span>Transaction ID:</span>
                  <span className="font-mono text-gray-900">{order.transaction.razorpayPaymentId}</span>
                </div>
              )}
              {order.transaction.method && (
                <div className="flex items-center gap-2 text-gray-500">
                  <span>Method:</span>
                  <span className="text-gray-900 capitalize">{order.transaction.method}</span>
                </div>
              )}
              {order.paidAt && (
                <div className="flex items-center gap-2 text-gray-500">
                  <span>Paid on:</span>
                  <span className="text-gray-900">{formatDateTime(order.paidAt)}</span>
                </div>
              )}
            </div>
          )}

          {order.paymentStatus === "refunded" && order.transaction?.refundAmount && (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span>
                Refund of <strong>{formatPrice(order.transaction.refundAmount)}</strong> has been processed.
              </span>
            </div>
          )}

          {isPaymentFailed && (
            <Link
              href={`/checkout?retry=${order.orderNumber}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <XCircle className="h-4 w-4" />
              Retry Payment
            </Link>
          )}

          {isPendingOnline && (
            <Link
              href={`/checkout?retry=${order.orderNumber}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <AlertTriangle className="h-4 w-4" />
              Complete Payment
            </Link>
          )}
        </div>
      </div>

      {/* Section 3: Tracking Timeline */}
      {order.timeline.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              Order Timeline
            </h2>
          </div>
          <div className="px-6 py-4">
            <div className="relative">
              {order.timeline.map((event, idx) => {
                const isLatest = idx === order.timeline.length - 1;

                return (
                  <div key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
                    {/* Connecting line */}
                    {idx < order.timeline.length - 1 && (
                      <div className="absolute left-[9px] top-5 bottom-0 w-0.5 bg-gray-200" />
                    )}

                    {/* Dot */}
                    <div className="relative flex-shrink-0">
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full border-2",
                          isLatest
                            ? "bg-amber-500 border-amber-500 ring-4 ring-amber-100 shadow-lg shadow-amber-200/50"
                            : "bg-white border-gray-300"
                        )}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 -mt-0.5">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          isLatest ? "text-amber-700" : "text-gray-900"
                        )}
                      >
                        {event.title}
                      </p>
                      {event.description && (
                        <p className="text-sm text-gray-500 mt-0.5">{event.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDateTime(event.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Section 4: Shipping Info */}
      {order.shipment && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Truck className="h-5 w-5 text-amber-600" />
              Shipping Details
            </h2>
          </div>
          <div className="px-6 py-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 w-36 flex-shrink-0">Courier</span>
              <span className="text-gray-900 font-medium">{order.shipment.provider}</span>
            </div>

            {order.shipment.externalTrackingNumber && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 w-36 flex-shrink-0">Tracking Number</span>
                <span className="font-mono text-gray-900">{order.shipment.externalTrackingNumber}</span>
                <button
                  onClick={() =>
                    handleCopyTracking(order.shipment!.externalTrackingNumber!)
                  }
                  className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-400 hover:text-gray-600"
                  title="Copy tracking number"
                >
                  {copiedTracking ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            )}

            {order.shipment.trackingUrl && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 w-36 flex-shrink-0">Track Shipment</span>
                <a
                  href={order.shipment.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-amber-600 hover:text-amber-700 font-medium transition-colors"
                >
                  Track on courier website
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}

            {order.shipment.shippedAt && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 w-36 flex-shrink-0">Shipped On</span>
                <span className="text-gray-900">{formatDate(order.shipment.shippedAt)}</span>
              </div>
            )}

            {order.shipment.estimatedDelivery && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 w-36 flex-shrink-0">Est. Delivery</span>
                <span className="text-gray-900 font-medium">
                  {formatDate(order.shipment.estimatedDelivery)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 5: Delivery Address */}
      {addr && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-amber-600" />
              Delivery Address
            </h2>
          </div>
          <div className="px-6 py-4">
            {addr.name && <p className="text-gray-900 font-medium">{addr.name}</p>}
            {addr.phone && <p className="text-sm text-gray-500 mt-0.5">{addr.phone}</p>}
            <div className="text-sm text-gray-600 mt-2">
              {addr.line1 && <p>{addr.line1}</p>}
              {addr.line2 && <p>{addr.line2}</p>}
              <p>
                {[addr.city, addr.state].filter(Boolean).join(", ")}
                {addr.pincode && ` - ${addr.pincode}`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
