"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
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
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  shippingAddress: ShippingAddress;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
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

const paymentVariantMap: Record<
  PaymentStatus,
  "default" | "destructive" | "success" | "warning" | "outline"
> = {
  pending: "warning",
  paid: "success",
  failed: "destructive",
  refunded: "outline",
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

  const handleStatusUpdate = async () => {
    if (!newStatus) {
      toast.error("Please select a new status");
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
          variant={paymentVariantMap[order.paymentStatus]}
          className="text-sm px-3 py-1"
        >
          {formatStatus(order.paymentStatus)}
        </Badge>
      </div>

      {/* Two-column layout */}
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
                    <TableHead className="text-muted-foreground">
                      Product
                    </TableHead>
                    <TableHead className="text-muted-foreground">
                      Variant
                    </TableHead>
                    <TableHead className="text-center text-muted-foreground">
                      Qty
                    </TableHead>
                    <TableHead className="text-right text-muted-foreground">
                      Unit Price
                    </TableHead>
                    <TableHead className="text-right text-muted-foreground">
                      Subtotal
                    </TableHead>
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
                  <TableRow className="border-border bg-secondary/30">
                    <TableCell
                      colSpan={4}
                      className="text-right font-semibold text-foreground"
                    >
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
                      return (
                        <div key={event.id} className="flex gap-4 pb-6 last:pb-0">
                          {/* Timeline dot and line */}
                          <div className="flex flex-col items-center">
                            <div
                              className={cn(
                                "h-3.5 w-3.5 rounded-full border-2 mt-1 shrink-0 transition-colors",
                                isLatest
                                  ? "bg-primary border-primary shadow-[0_0_8px_rgba(129,140,248,0.4)]"
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
                                variant={isLatest ? "default" : "secondary"}
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
          {/* Customer Info */}
          <Card className="bg-card rounded-xl border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground text-base">
                <User className="h-4 w-4 text-primary" />
                Customer Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2 shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
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
                    <span className="text-sm text-foreground">
                      {order.customerPhone}
                    </span>
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

                <div className="flex items-center gap-2.5">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    {formatDateTime(order.createdAt)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Update Status */}
          {allowedTransitions.length > 0 && (
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
              </CardContent>
            </Card>
          )}

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
        </div>
      </div>
    </div>
  );
}
