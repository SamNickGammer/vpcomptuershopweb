"use client";

import { useEffect, useState } from "react";
import {
  Package,
  ShoppingCart,
  IndianRupee,
  AlertTriangle,
  TrendingUp,
  Inbox,
  FolderOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatPrice, cn } from "@/lib/utils/helpers";

type OrderItem = {
  id: string;
  orderId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
};

type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
};

type DashboardData = {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  lowStockCount: number;
  recentOrders: Order[];
  ordersByStatus: Record<string, number>;
};

function getStatusBadgeVariant(
  status: string
): "warning" | "secondary" | "default" | "success" | "destructive" {
  switch (status) {
    case "pending":
      return "warning";
    case "confirmed":
    case "processing":
      return "secondary";
    case "shipped":
    case "ready_to_ship":
      return "default";
    case "delivered":
      return "success";
    case "cancelled":
    case "returned":
      return "destructive";
    default:
      return "secondary";
  }
}

function getStatusDotColor(status: string): string {
  switch (status) {
    case "pending":
      return "bg-amber-400";
    case "confirmed":
    case "processing":
      return "bg-zinc-400";
    case "shipped":
    case "ready_to_ship":
      return "bg-indigo-400";
    case "delivered":
      return "bg-emerald-400";
    case "cancelled":
    case "returned":
      return "bg-red-400";
    default:
      return "bg-zinc-400";
  }
}

function formatStatusLabel(status: string): string {
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

const statCards = [
  {
    key: "totalProducts" as const,
    label: "Total Products",
    icon: Package,
    iconBg: "bg-indigo-500/10",
    iconColor: "text-indigo-400",
    subtitle: "+12% from last month",
    format: (v: number) => String(v),
  },
  {
    key: "totalOrders" as const,
    label: "Total Orders",
    icon: ShoppingCart,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
    subtitle: "+8% from last month",
    format: (v: number) => String(v),
  },
  {
    key: "totalRevenue" as const,
    label: "Revenue",
    icon: IndianRupee,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-400",
    subtitle: "+23% from last month",
    format: (v: number) => formatPrice(v),
  },
  {
    key: "lowStockCount" as const,
    label: "Low Stock",
    icon: AlertTriangle,
    iconBg: "bg-red-500/10",
    iconColor: "text-red-400",
    subtitle: "items need attention",
    format: (v: number) => String(v),
  },
];

function StatCardSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-24 bg-secondary rounded" />
        <div className="h-9 w-9 bg-secondary rounded-lg" />
      </div>
      <div className="h-8 w-16 bg-secondary rounded mb-2" />
      <div className="h-3 w-32 bg-secondary rounded" />
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <TableRow>
      <TableCell><div className="h-4 w-24 bg-secondary rounded animate-pulse" /></TableCell>
      <TableCell><div className="h-4 w-28 bg-secondary rounded animate-pulse" /></TableCell>
      <TableCell><div className="h-4 w-16 bg-secondary rounded animate-pulse" /></TableCell>
      <TableCell><div className="h-5 w-16 bg-secondary rounded-full animate-pulse" /></TableCell>
      <TableCell className="text-right"><div className="h-4 w-20 bg-secondary rounded animate-pulse ml-auto" /></TableCell>
    </TableRow>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/admin/dashboard");
        const json = await res.json();
        if (!json.success) {
          setError(json.error || "Failed to load dashboard");
          return;
        }
        setData(json.data);
      } catch {
        setError("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <div className="bg-red-500/10 rounded-full p-3 w-fit mx-auto">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <p className="text-foreground font-medium">Something went wrong</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map((card) => {
              const Icon = card.icon;
              const value = data ? data[card.key] : 0;
              return (
                <div
                  key={card.key}
                  className="bg-card rounded-xl border border-border p-6 transition-colors hover:border-border/80"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-muted-foreground">
                      {card.label}
                    </span>
                    <div className={cn("rounded-lg p-2", card.iconBg)}>
                      <Icon className={cn("h-4 w-4", card.iconColor)} />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-foreground">
                    {card.format(value)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    {card.key !== "lowStockCount" && (
                      <TrendingUp className="h-3 w-3 text-emerald-400" />
                    )}
                    {card.key === "lowStockCount"
                      ? `${value} ${card.subtitle}`
                      : card.subtitle}
                  </p>
                </div>
              );
            })}
      </div>

      {/* Recent Orders */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Order #</TableHead>
                  <TableHead className="text-muted-foreground">Customer</TableHead>
                  <TableHead className="text-muted-foreground">Amount</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right text-muted-foreground">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))}
              </TableBody>
            </Table>
          ) : !data || data.recentOrders.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-secondary rounded-full p-4 w-fit mx-auto mb-4">
                <Inbox className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-foreground font-medium">No orders yet</p>
              <p className="text-muted-foreground text-sm mt-1">
                Orders will appear here once customers start placing them.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Order #</TableHead>
                  <TableHead className="text-muted-foreground">Customer</TableHead>
                  <TableHead className="text-muted-foreground">Amount</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right text-muted-foreground">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentOrders.slice(0, 10).map((order) => (
                  <TableRow key={order.id} className="border-border">
                    <TableCell className="font-mono font-medium text-foreground">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {order.customerName}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {formatPrice(order.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getStatusBadgeVariant(order.status)}
                        className={cn(
                          order.status === "shipped" &&
                            "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                        )}
                      >
                        {formatStatusLabel(order.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Orders by Status */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 bg-secondary rounded-full" />
                      <div className="h-4 w-20 bg-secondary rounded" />
                    </div>
                    <div className="h-4 w-8 bg-secondary rounded" />
                  </div>
                ))}
              </div>
            ) : !data || Object.keys(data.ordersByStatus).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(data.ordersByStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          getStatusDotColor(status)
                        )}
                      />
                      <span className="text-sm text-foreground">
                        {formatStatusLabel(status)}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                      {count}
                    </span>
                  </div>
                ))}
                <Separator className="bg-border" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Total</span>
                  <span className="text-sm font-bold text-foreground tabular-nums">
                    {Object.values(data.ordersByStatus).reduce((a, b) => a + b, 0)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Categories */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Top Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-secondary rounded-lg" />
                      <div className="h-4 w-24 bg-secondary rounded" />
                    </div>
                    <div className="h-4 w-12 bg-secondary rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="bg-secondary rounded-full p-3 w-fit mx-auto mb-3">
                  <FolderOpen className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">
                  Category analytics coming soon
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
