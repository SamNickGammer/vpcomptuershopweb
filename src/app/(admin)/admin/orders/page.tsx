"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Package,
  Loader2,
  Eye,
  ShoppingBag,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatPrice } from "@/lib/utils/helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
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

type QuickFilter = "needs_attention" | "shipped" | "delivered" | "all";

interface OrderSummary {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  itemCount: number;
  createdAt: string;
}

const ORDER_STATUSES: { value: string; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "ready_to_ship", label: "Ready to Ship" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "returned", label: "Returned" },
];

const PAYMENT_STATUSES: { value: string; label: string }[] = [
  { value: "all", label: "All Payments" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

const QUICK_FILTERS: { value: QuickFilter; label: string; icon?: React.ReactNode }[] = [
  { value: "needs_attention", label: "Needs Attention", icon: <AlertCircle className="h-3.5 w-3.5" /> },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "all", label: "All" },
];

const NEEDS_ATTENTION_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "ready_to_ship",
];

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

const paymentMethodVariantMap: Record<PaymentMethod, "outline" | "info" | "purple" | "secondary"> = {
  cod: "outline",
  online: "info",
  upi: "purple",
  bank_transfer: "secondary",
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cod: "COD",
  online: "Online",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
};

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const LIMIT = 20;

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("needs_attention");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      // Quick filter overrides status dropdown
      if (quickFilter === "needs_attention") {
        params.set("status", NEEDS_ATTENTION_STATUSES.join(","));
      } else if (quickFilter === "shipped") {
        params.set("status", "shipped");
      } else if (quickFilter === "delivered") {
        params.set("status", "delivered");
      } else if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      if (paymentFilter !== "all") params.set("paymentStatus", paymentFilter);
      if (searchDebounced) params.set("search", searchDebounced);
      params.set("page", String(page));
      params.set("limit", String(LIMIT));

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setOrders(json.data.orders);
        setTotal(json.data.total);
      } else {
        toast.error(json.error || "Failed to fetch orders");
      }
    } catch {
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, [quickFilter, statusFilter, paymentFilter, searchDebounced, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [quickFilter, statusFilter, paymentFilter, searchDebounced]);

  const handleQuickFilter = (filter: QuickFilter) => {
    setQuickFilter(filter);
    // Reset status dropdown when using quick filters
    if (filter !== "all") {
      setStatusFilter("all");
    }
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    // Switch to "all" quick filter when manually selecting a status
    setQuickFilter("all");
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-6">
      {/* Quick Filter Row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {QUICK_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={quickFilter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleQuickFilter(f.value)}
              className={cn(
                "border-border transition-all",
                quickFilter === f.value
                  ? ""
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.icon}
              {f.label}
              {f.value === "needs_attention" && !loading && quickFilter === "needs_attention" && (
                <span className="ml-1 rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-bold leading-none">
                  {total}
                </span>
              )}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground font-medium">
            {total} order{total !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-card rounded-xl border border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order # or customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-secondary border-border"
              />
            </div>

            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-full sm:w-[180px] bg-secondary border-border">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-full sm:w-[170px] bg-secondary border-border">
                <SelectValue placeholder="Payment status" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="bg-card rounded-xl border border-border overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                  Loading orders...
                </span>
              </div>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="rounded-full bg-secondary p-4 mb-4">
                <Package className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                No orders found
              </h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-sm">
                {search || statusFilter !== "all" || paymentFilter !== "all" || quickFilter !== "all"
                  ? "Try adjusting your filters to find what you're looking for"
                  : "Orders will appear here when customers place them"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Order #</TableHead>
                  <TableHead className="text-muted-foreground">Customer</TableHead>
                  <TableHead className="text-center text-muted-foreground">Items</TableHead>
                  <TableHead className="text-right text-muted-foreground">Total</TableHead>
                  <TableHead className="text-muted-foreground">Payment</TableHead>
                  <TableHead className="text-muted-foreground">Pay Status</TableHead>
                  <TableHead className="text-muted-foreground">Order Status</TableHead>
                  <TableHead className="text-muted-foreground hidden md:table-cell">Date</TableHead>
                  <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="border-border hover:bg-secondary/50 transition-colors"
                  >
                    <TableCell>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-mono text-sm text-primary hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {order.customerName}
                        </p>
                        {order.customerPhone && (
                          <p className="text-xs text-muted-foreground">
                            {order.customerPhone}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {order.itemCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono font-semibold text-foreground">
                        {formatPrice(order.totalAmount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={paymentMethodVariantMap[order.paymentMethod]}>
                        {paymentMethodLabels[order.paymentMethod] || formatStatus(order.paymentMethod)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={paymentStatusVariantMap[order.paymentStatus]}>
                        {formatStatus(order.paymentStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariantMap[order.status]}>
                        {formatStatus(order.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                      {formatDate(order.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/orders/${order.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && orders.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">
              {(page - 1) * LIMIT + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-foreground">
              {Math.min(page * LIMIT, total)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-foreground">{total}</span> orders
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="border-border"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="flex items-center gap-1 px-2">
              <span className="text-sm font-medium text-foreground">{page}</span>
              <span className="text-sm text-muted-foreground">/</span>
              <span className="text-sm text-muted-foreground">{totalPages}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="border-border"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
