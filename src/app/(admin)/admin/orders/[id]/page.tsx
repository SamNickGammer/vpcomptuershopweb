"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Truck,
  ExternalLink,
  Clock,
  Package,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  IndianRupee,
  CheckCircle2,
  RotateCcw,
  Tag,
  Hash,
  Receipt,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatPrice } from "@/lib/utils/helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { ShippingAddress } from "@/types";

type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "ready_to_ship"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
type PaymentMethod = "cod" | "online" | "upi" | "bank_transfer";

interface OrderItem {
  id: string;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
}

interface TrackingEvent {
  id: string;
  status: string;
  title: string;
  description: string | null;
  createdByAdminId: string | null;
  createdAt: string;
}

interface ShipmentData {
  id: string;
  provider: string;
  externalTrackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  estimatedDelivery: string | null;
  createdAt: string;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  trackingCode: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  shippingAddress: ShippingAddress;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paidAt: string | null;
  paymentReference: string | null;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  couponCode: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  trackingEvents: TrackingEvent[];
  shipment: ShipmentData | null;
}

const statusVariantMap: Record<
  OrderStatus,
  "default" | "secondary" | "destructive" | "success" | "warning" | "info"
> = {
  pending: "warning",
  confirmed: "secondary",
  processing: "secondary",
  ready_to_ship: "default",
  shipped: "info",
  delivered: "success",
  cancelled: "destructive",
  returned: "destructive",
};

const paymentStatusVariantMap: Record<
  PaymentStatus,
  "default" | "destructive" | "success" | "warning" | "outline"
> = {
  pending: "warning",
  paid: "success",
  failed: "destructive",
  refunded: "outline",
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cod: "COD",
  online: "Online",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
};

const paymentMethodVariantMap: Record<PaymentMethod, "outline" | "info" | "purple" | "secondary"> = {
  cod: "outline",
  online: "info",
  upi: "purple",
  bank_transfer: "secondary",
};

const validTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["ready_to_ship", "cancelled"],
  ready_to_ship: ["shipped"],
  shipped: ["delivered"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

const SHIPPING_PROVIDERS = [
  "India Post",
  "DTDC",
  "Blue Dart",
  "Delhivery",
  "Shiprocket",
  "Ekart Logistics",
  "Self",
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cod", label: "Cash on Delivery" },
  { value: "online", label: "Online Payment" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
];

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Status update state
  const [newStatus, setNewStatus] = useState<string>("");
  const [statusNotes, setStatusNotes] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [paymentReference, setPaymentReference] = useState("");
  const [amountReceived, setAmountReceived] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);

  // Refund dialog state
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundNotes, setRefundNotes] = useState("");
  const [processingRefund, setProcessingRefund] = useState(false);

  // Cancel & Refund dialog state
  const [cancelRefundDialogOpen, setCancelRefundDialogOpen] = useState(false);
  const [processingCancelRefund, setProcessingCancelRefund] = useState(false);

  // Delete order state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState(false);
  const router = useRouter();

  // Shipment creation state
  const [shipmentProvider, setShipmentProvider] = useState("");
  const [shipmentTrackingNumber, setShipmentTrackingNumber] = useState("");
  const [shipmentTrackingUrl, setShipmentTrackingUrl] = useState("");
  const [shipmentEstDelivery, setShipmentEstDelivery] = useState("");
  const [creatingShipment, setCreatingShipment] = useState(false);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`);
      const json = await res.json();
      if (json.success) {
        setOrder(json.data);
      } else {
        toast.error(json.error || "Failed to fetch order");
      }
    } catch {
      toast.error("Failed to fetch order");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Pre-fill amount when order loads or payment dialog opens
  useEffect(() => {
    if (order && paymentDialogOpen) {
      setAmountReceived(String(order.totalAmount / 100));
      setPaymentMethod(order.paymentMethod || "cod");
    }
  }, [order, paymentDialogOpen]);

  const handleStatusUpdate = async () => {
    if (!newStatus) {
      toast.error("Please select a new status");
      return;
    }

    // If cancelling a paid order, show cancel-refund dialog instead
    if (newStatus === "cancelled" && order?.paymentStatus === "paid") {
      setCancelRefundDialogOpen(true);
      return;
    }

    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          notes: statusNotes || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Order status updated");
        setNewStatus("");
        setStatusNotes("");
        fetchOrder();
      } else {
        toast.error(json.error || "Failed to update status");
      }
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCancelOnly = async () => {
    setProcessingCancelRefund(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "cancelled",
          notes: statusNotes || "Order cancelled without refund",
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Order cancelled (no refund)");
        setCancelRefundDialogOpen(false);
        setNewStatus("");
        setStatusNotes("");
        fetchOrder();
      } else {
        toast.error(json.error || "Failed to cancel order");
      }
    } catch {
      toast.error("Failed to cancel order");
    } finally {
      setProcessingCancelRefund(false);
    }
  };

  const handleCancelAndRefund = async () => {
    setProcessingCancelRefund(true);
    try {
      // First cancel the order
      const cancelRes = await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "cancelled",
          notes: statusNotes || "Order cancelled with refund",
        }),
      });
      const cancelJson = await cancelRes.json();
      if (!cancelJson.success) {
        toast.error(cancelJson.error || "Failed to cancel order");
        return;
      }

      // Then initiate refund
      const refundRes = await fetch(`/api/admin/orders/${id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const refundJson = await refundRes.json();
      if (refundJson.success) {
        toast.success("Order cancelled and refund initiated");
      } else {
        toast.error(
          "Order cancelled but refund failed: " +
            (refundJson.error || "Unknown error")
        );
      }

      setCancelRefundDialogOpen(false);
      setNewStatus("");
      setStatusNotes("");
      fetchOrder();
    } catch {
      toast.error("Failed to cancel and refund order");
    } finally {
      setProcessingCancelRefund(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }
    setProcessingPayment(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_paid",
          paymentMethod,
          paymentReference: paymentReference || undefined,
          amountReceived: amountReceived ? Math.round(parseFloat(amountReceived) * 100) : undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Payment recorded successfully");
        setPaymentDialogOpen(false);
        setPaymentReference("");
        setAmountReceived("");
        fetchOrder();
      } else {
        toast.error(json.error || "Failed to record payment");
      }
    } catch {
      toast.error("Failed to record payment");
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleMarkAsRefunded = async () => {
    setProcessingRefund(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_refunded",
          notes: refundNotes || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Order marked as refunded");
        setRefundDialogOpen(false);
        setRefundNotes("");
        fetchOrder();
      } else {
        toast.error(json.error || "Failed to process refund");
      }
    } catch {
      toast.error("Failed to process refund");
    } finally {
      setProcessingRefund(false);
    }
  };

  const handleCreateShipment = async () => {
    if (!shipmentProvider) {
      toast.error("Please select a shipping provider");
      return;
    }
    setCreatingShipment(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}/shipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: shipmentProvider,
          externalTrackingNumber: shipmentTrackingNumber || undefined,
          trackingUrl: shipmentTrackingUrl || undefined,
          estimatedDelivery: shipmentEstDelivery || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Shipment created successfully");
        setShipmentProvider("");
        setShipmentTrackingNumber("");
        setShipmentTrackingUrl("");
        setShipmentEstDelivery("");
        fetchOrder();
      } else {
        toast.error(json.error || "Failed to create shipment");
      }
    } catch {
      toast.error("Failed to create shipment");
    } finally {
      setCreatingShipment(false);
    }
  };

  const handleDeleteOrder = async () => {
    setDeletingOrder(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Order deleted successfully");
        router.push("/admin/orders");
      } else {
        toast.error(json.error || "Failed to delete order");
      }
    } catch {
      toast.error("Failed to delete order");
    } finally {
      setDeletingOrder(false);
      setDeleteDialogOpen(false);
    }
  };

  const canDeleteOrder =
    order &&
    (order.paymentStatus === "failed" ||
      (order.paymentStatus === "pending" && order.paymentMethod === "online"));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            Loading order details...
          </span>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="rounded-full bg-secondary p-4 mb-4">
          <Package className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          Order not found
        </h2>
        <p className="text-muted-foreground text-sm mt-1 mb-4">
          This order may have been deleted or the link is invalid.
        </p>
        <Button variant="outline" asChild className="border-border">
          <Link href="/admin/orders">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Orders
          </Link>
        </Button>
      </div>
    );
  }

  const address = order.shippingAddress;
  const allowedTransitions = validTransitions[order.status] || [];
  const showShipping = [
    "ready_to_ship",
    "shipped",
    "delivered",
    "returned",
  ].includes(order.status);
  const subtotal = order.subtotalAmount || order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const hasDiscount = order.discountAmount > 0;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/orders">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Orders
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Order{" "}
          <span className="font-mono text-primary">{order.orderNumber}</span>
        </h1>
        <Badge
          variant={statusVariantMap[order.status]}
          className="text-sm px-3 py-1"
        >
          {formatStatus(order.status)}
        </Badge>
        <Badge
          variant={paymentStatusVariantMap[order.paymentStatus]}
          className="text-sm px-3 py-1"
        >
          {formatStatus(order.paymentStatus)}
        </Badge>
        {canDeleteOrder && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            className="gap-1.5 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive ml-auto"
          >
            <Trash2 className="h-4 w-4" />
            Delete Order
          </Button>
        )}
      </div>

      {/* Three-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Main content (col-span-2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card className="bg-card rounded-xl border border-border overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Package className="h-5 w-5 text-primary" />
                Order Items
              </CardTitle>
              <CardDescription>
                {order.items.length} item{order.items.length !== 1 ? "s" : ""}{" "}
                in this order
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Product</TableHead>
                    <TableHead className="text-muted-foreground">Variant</TableHead>
                    <TableHead className="text-center text-muted-foreground">Qty</TableHead>
                    <TableHead className="text-right text-muted-foreground">Unit Price</TableHead>
                    <TableHead className="text-right text-muted-foreground">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow
                      key={item.id}
                      className="border-border hover:bg-secondary/50 transition-colors"
                    >
                      <TableCell className="font-medium text-foreground">
                        {item.productName}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {item.variantName || "-"}
                      </TableCell>
                      <TableCell className="text-center text-foreground">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {formatPrice(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-foreground">
                        {formatPrice(item.unitPrice * item.quantity)}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Footer rows */}
                  <TableRow className="border-border border-t-2">
                    <TableCell colSpan={4} className="text-right text-sm text-muted-foreground">
                      Subtotal
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-foreground">
                      {formatPrice(subtotal)}
                    </TableCell>
                  </TableRow>

                  {hasDiscount && (
                    <TableRow className="border-border">
                      <TableCell colSpan={4} className="text-right text-sm text-muted-foreground">
                        <span className="flex items-center justify-end gap-2">
                          Discount
                          {order.couponCode && (
                            <Badge variant="purple" className="text-[10px] px-1.5 py-0">
                              {order.couponCode}
                            </Badge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-emerald-400">
                        -{formatPrice(order.discountAmount)}
                      </TableCell>
                    </TableRow>
                  )}

                  <TableRow className="border-border bg-secondary/30">
                    <TableCell colSpan={4} className="text-right font-semibold text-foreground">
                      Total
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-lg text-primary">
                      {formatPrice(order.totalAmount)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card className="bg-card rounded-xl border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <CreditCard className="h-5 w-5 text-primary" />
                Payment Details
              </CardTitle>
              <CardDescription>
                Payment information and management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Payment status + method row */}
              <div className="flex flex-wrap items-center gap-3">
                <Badge
                  variant={paymentStatusVariantMap[order.paymentStatus]}
                  className="text-sm px-4 py-1.5"
                >
                  {formatStatus(order.paymentStatus)}
                </Badge>
                <Badge
                  variant={paymentMethodVariantMap[order.paymentMethod]}
                  className="text-sm px-3 py-1.5"
                >
                  {paymentMethodLabels[order.paymentMethod] || formatStatus(order.paymentMethod)}
                </Badge>
              </div>

              {/* Payment info grid */}
              <div className="rounded-lg bg-secondary/50 p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IndianRupee className="h-3.5 w-3.5" />
                    Amount
                  </span>
                  <span className="font-mono font-semibold text-foreground">
                    {formatPrice(order.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Receipt className="h-3.5 w-3.5" />
                    Method
                  </span>
                  <span className="text-sm text-foreground">
                    {paymentMethodLabels[order.paymentMethod] || formatStatus(order.paymentMethod)}
                  </span>
                </div>
                {order.paymentStatus === "paid" && order.paidAt && (
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      Paid on
                    </span>
                    <span className="text-sm text-foreground">
                      {formatDateTime(order.paidAt)}
                    </span>
                  </div>
                )}
                {order.paymentReference && (
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Hash className="h-3.5 w-3.5" />
                      Reference
                    </span>
                    <span className="text-sm font-mono text-foreground">
                      {order.paymentReference}
                    </span>
                  </div>
                )}
              </div>

              {/* Payment actions */}
              {(() => {
                const isCod = order.paymentMethod === "cod";
                const codCanPay = ["ready_to_ship", "shipped", "delivered"].includes(order.status);
                const canMarkPaid = (order.paymentStatus === "pending" || order.paymentStatus === "failed") && (!isCod || codCanPay);
                return null;
              })()}
              <div className="flex flex-wrap gap-3">
                {(() => {
                  const isCod = order.paymentMethod === "cod";
                  const codCanPay = ["ready_to_ship", "shipped", "delivered"].includes(order.status);
                  const canMarkPaid = (order.paymentStatus === "pending" || order.paymentStatus === "failed") && (!isCod || codCanPay);
                  if (!canMarkPaid) return null;
                  return (
                    <Button
                      onClick={() => setPaymentDialogOpen(true)}
                      className="gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Mark as Paid
                    </Button>
                  );
                })()}
                {order.paymentMethod === "cod" && order.paymentStatus === "pending" && !["ready_to_ship", "shipped", "delivered"].includes(order.status) && (
                  <p className="text-xs text-muted-foreground italic">
                    COD payment can be collected once order is ready to ship or delivered
                  </p>
                )}
                {order.paymentStatus === "paid" && (
                  <Button
                    variant="outline"
                    onClick={() => setRefundDialogOpen(true)}
                    className="gap-2 border-border text-muted-foreground hover:text-destructive hover:border-destructive/50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Mark as Refunded
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tracking Timeline */}
          <Card className="bg-card rounded-xl border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Clock className="h-5 w-5 text-primary" />
                Tracking Timeline
              </CardTitle>
              <CardDescription>
                Order status history and tracking events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {order.trackingEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="rounded-full bg-secondary p-3 mb-3">
                    <Clock className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    No tracking events yet
                  </p>
                  <p className="text-muted-foreground/60 text-xs mt-1">
                    Events will appear here as the order progresses
                  </p>
                </div>
              ) : (
                <div className="relative">
                  {[...order.trackingEvents]
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime()
                    )
                    .map((event, index, arr) => {
                      const isLatest = index === 0;
                      const isPaymentEvent =
                        event.status === "payment_received" ||
                        event.status === "payment_refunded" ||
                        event.title.toLowerCase().includes("payment");
                      return (
                        <div key={event.id} className="flex gap-4 pb-6 last:pb-0">
                          {/* Timeline dot and line */}
                          <div className="flex flex-col items-center">
                            <div
                              className={cn(
                                "h-3.5 w-3.5 rounded-full border-2 mt-1 shrink-0 transition-colors",
                                isLatest
                                  ? "bg-primary border-primary shadow-[0_0_8px_rgba(129,140,248,0.4)]"
                                  : isPaymentEvent
                                    ? "bg-emerald-500/30 border-emerald-500/60"
                                    : "bg-background border-muted-foreground/30"
                              )}
                            />
                            {index < arr.length - 1 && (
                              <div className="w-px flex-1 bg-border mt-1.5" />
                            )}
                          </div>
                          {/* Event details */}
                          <div className="pb-1 min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className={cn(
                                  "font-medium text-sm",
                                  isLatest
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                                )}
                              >
                                {event.title}
                              </p>
                              <Badge
                                variant={
                                  isLatest
                                    ? "default"
                                    : isPaymentEvent
                                      ? "success"
                                      : "secondary"
                                }
                                className="text-xs shrink-0"
                              >
                                {formatStatus(event.status)}
                              </Badge>
                            </div>
                            {event.description && (
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {event.description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground/60 mt-1">
                              {formatDateTime(event.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar (col-span-1) */}
        <div className="space-y-6">
          {/* Customer Details */}
          <Card className="bg-card rounded-xl border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground text-base">
                <User className="h-4 w-4 text-primary" />
                Customer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2 shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {order.customerName}
                  </p>
                  <p className="text-xs text-muted-foreground">Customer</p>
                </div>
              </div>

              <Separator className="bg-border" />

              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a
                    href={`mailto:${order.customerEmail}`}
                    className="text-sm text-primary hover:underline truncate"
                  >
                    {order.customerEmail}
                  </a>
                </div>

                {order.customerPhone && (
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a
                      href={`tel:${order.customerPhone}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {order.customerPhone}
                    </a>
                  </div>
                )}

                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="text-sm text-foreground">
                    <p>{address.line1}</p>
                    {address.line2 && <p>{address.line2}</p>}
                    <p>
                      {address.city}, {address.state}
                    </p>
                    <p className="text-muted-foreground">{address.pincode}</p>
                  </div>
                </div>

                <Separator className="bg-border" />

                <div className="flex items-center gap-2.5">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    {formatDateTime(order.createdAt)}
                  </span>
                </div>

                {order.trackingCode && (
                  <div className="flex items-center gap-2.5">
                    <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-mono text-foreground">
                      {order.trackingCode}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Update Status */}
          <Card className="bg-card rounded-xl border border-border">
            <CardHeader>
              <CardTitle className="text-base text-foreground">
                Update Status
              </CardTitle>
              <CardDescription>
                Current:{" "}
                <Badge
                  variant={statusVariantMap[order.status]}
                  className="ml-1"
                >
                  {formatStatus(order.status)}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {allowedTransitions.length > 0 ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-foreground">New Status</Label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue placeholder="Select new status" />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedTransitions.map((s) => (
                          <SelectItem key={s} value={s}>
                            {formatStatus(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground">
                      Notes{" "}
                      <span className="text-muted-foreground font-normal">
                        (optional)
                      </span>
                    </Label>
                    <Textarea
                      placeholder="Add a note about this status change..."
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                      rows={3}
                      className="bg-secondary border-border resize-none"
                    />
                  </div>

                  <Button
                    onClick={handleStatusUpdate}
                    disabled={!newStatus || updatingStatus}
                    className="w-full"
                  >
                    {updatingStatus && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Update Status
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No further status transitions available for this order.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Shipping */}
          {showShipping && (
            <Card className="bg-card rounded-xl border border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-foreground">
                  <Truck className="h-4 w-4 text-primary" />
                  Shipping
                </CardTitle>
              </CardHeader>
              <CardContent>
                {order.shipment ? (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-secondary/50 p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">
                          Provider
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {order.shipment.provider}
                        </span>
                      </div>
                      {order.shipment.externalTrackingNumber && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">
                            Tracking #
                          </span>
                          <span className="text-sm font-mono text-foreground">
                            {order.shipment.externalTrackingNumber}
                          </span>
                        </div>
                      )}
                      {order.shipment.shippedAt && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">
                            Shipped
                          </span>
                          <span className="text-sm text-foreground">
                            {formatDateTime(order.shipment.shippedAt)}
                          </span>
                        </div>
                      )}
                      {order.shipment.estimatedDelivery && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">
                            Est. Delivery
                          </span>
                          <span className="text-sm text-foreground">
                            {formatDate(order.shipment.estimatedDelivery)}
                          </span>
                        </div>
                      )}
                    </div>
                    {order.shipment.trackingUrl && (
                      <a
                        href={order.shipment.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Track Package
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Create a shipment to start tracking delivery.
                    </p>

                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-foreground">Provider</Label>
                        <Select
                          value={shipmentProvider}
                          onValueChange={setShipmentProvider}
                        >
                          <SelectTrigger className="bg-secondary border-border">
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent>
                            {SHIPPING_PROVIDERS.map((p) => (
                              <SelectItem key={p} value={p}>
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-foreground">
                          Tracking #{" "}
                          <span className="text-muted-foreground font-normal">
                            (optional)
                          </span>
                        </Label>
                        <Input
                          placeholder="AWB / Consignment number"
                          value={shipmentTrackingNumber}
                          onChange={(e) =>
                            setShipmentTrackingNumber(e.target.value)
                          }
                          className="bg-secondary border-border"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-foreground">
                          Tracking URL{" "}
                          <span className="text-muted-foreground font-normal">
                            (optional)
                          </span>
                        </Label>
                        <Input
                          placeholder="https://..."
                          value={shipmentTrackingUrl}
                          onChange={(e) =>
                            setShipmentTrackingUrl(e.target.value)
                          }
                          className="bg-secondary border-border"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-foreground">
                          Est. Delivery{" "}
                          <span className="text-muted-foreground font-normal">
                            (optional)
                          </span>
                        </Label>
                        <Input
                          type="date"
                          value={shipmentEstDelivery}
                          onChange={(e) =>
                            setShipmentEstDelivery(e.target.value)
                          }
                          className="bg-secondary border-border"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleCreateShipment}
                      disabled={!shipmentProvider || creatingShipment}
                      className="w-full"
                    >
                      {creatingShipment && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Create Shipment
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Discount Info */}
          {order.couponCode && (
            <Card className="bg-card rounded-xl border border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-foreground">
                  <Tag className="h-4 w-4 text-primary" />
                  Discount Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Coupon Code</span>
                  <Badge variant="purple" className="font-mono">
                    {order.couponCode}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Discount Amount</span>
                  <span className="font-mono font-semibold text-emerald-400">
                    -{formatPrice(order.discountAmount)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Mark as Paid Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Record Payment</DialogTitle>
            <DialogDescription>
              Mark this order as paid. Fill in the payment details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-foreground">Payment Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">
                Payment Reference{" "}
                <span className="text-muted-foreground font-normal">
                  (Transaction ID, UPI ref, receipt #)
                </span>
              </Label>
              <Input
                placeholder="e.g. TXN123456789"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">
                Amount Received (INR)
              </Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="pl-9 bg-secondary border-border font-mono"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Order total: {formatPrice(order.totalAmount)}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentDialogOpen(false)}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkAsPaid}
              disabled={processingPayment}
              className="gap-2"
            >
              {processingPayment && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              <CheckCircle2 className="h-4 w-4" />
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Refunded Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Mark as Refunded</DialogTitle>
            <DialogDescription>
              This will mark the payment as refunded for order{" "}
              <span className="font-mono text-foreground">{order.orderNumber}</span>.
              Amount: <span className="font-mono font-semibold text-foreground">{formatPrice(order.totalAmount)}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-foreground">
                Refund Notes{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                placeholder="Reason for refund, refund reference number..."
                value={refundNotes}
                onChange={(e) => setRefundNotes(e.target.value)}
                rows={3}
                className="bg-secondary border-border resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRefundDialogOpen(false)}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleMarkAsRefunded}
              disabled={processingRefund}
              className="gap-2"
            >
              {processingRefund && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              <RotateCcw className="h-4 w-4" />
              Confirm Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel & Refund Dialog */}
      <Dialog open={cancelRefundDialogOpen} onOpenChange={setCancelRefundDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Cancel Order</DialogTitle>
            <DialogDescription>
              This order has been paid ({formatPrice(order.totalAmount)}). How would you like to proceed?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <p className="text-sm text-muted-foreground">
              Choose whether to cancel with or without initiating a Razorpay refund.
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setCancelRefundDialogOpen(false)}
              disabled={processingCancelRefund}
              className="border-border"
            >
              Go Back
            </Button>
            <Button
              variant="outline"
              onClick={handleCancelOnly}
              disabled={processingCancelRefund}
              className="gap-2 border-orange-700/50 text-orange-400 hover:bg-orange-900/20 hover:text-orange-300"
            >
              {processingCancelRefund && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Cancel Only
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelAndRefund}
              disabled={processingCancelRefund}
              className="gap-2"
            >
              {processingCancelRefund && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              <RotateCcw className="h-4 w-4" />
              Cancel & Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Order Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Delete Order</DialogTitle>
            <DialogDescription>
              This order was not paid. Delete it permanently? This action cannot
              be undone. Order{" "}
              <span className="font-mono text-foreground">
                {order.orderNumber}
              </span>{" "}
              and all associated data will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteOrder}
              disabled={deletingOrder}
              className="gap-2"
            >
              {deletingOrder && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              <Trash2 className="h-4 w-4" />
              Delete Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
