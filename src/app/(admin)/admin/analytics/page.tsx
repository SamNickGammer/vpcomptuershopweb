"use client";

import { useEffect, useState, useCallback } from "react";
import {
  IndianRupee,
  TrendingUp,
  ShoppingCart,
  Package,
  AlertTriangle,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  BarChart3,
  Inbox,
  Tag,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { formatPrice, cn } from "@/lib/utils/helpers";

// ── Types ──────────────────────────────────────────────────────────────────────

type RevenueByDay = {
  date: string;
  revenue: number;
  orders: number;
};

type OrderByStatus = {
  status: string;
  count: number;
};

type PaymentMethod = {
  method: string;
  count: number;
  revenue: number;
};

type TopProduct = {
  productName: string;
  variantName: string;
  quantitySold: number;
  revenue: number;
};

type CategoryStat = {
  categoryName: string;
  productCount: number;
  totalStock: number;
};

type CouponStat = {
  code: string;
  usageCount: number;
  discountType: string;
  discountValue: number;
};

type AnalyticsData = {
  revenue: {
    total: number;
    orderCount: number;
    averageOrderValue: number;
  };
  revenueByDay: RevenueByDay[];
  ordersByStatus: OrderByStatus[];
  paymentMethods: PaymentMethod[];
  topProducts: TopProduct[];
  categoryStats: CategoryStat[];
  inventorySummary: {
    totalVariants: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
  };
  couponStats: CouponStat[];
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500",
  confirmed: "bg-blue-500",
  processing: "bg-indigo-500",
  ready_to_ship: "bg-sky-500",
  shipped: "bg-purple-500",
  delivered: "bg-emerald-500",
  cancelled: "bg-red-500",
  returned: "bg-orange-500",
};

const STATUS_BG: Record<string, string> = {
  pending: "bg-amber-500/20",
  confirmed: "bg-blue-500/20",
  processing: "bg-indigo-500/20",
  ready_to_ship: "bg-sky-500/20",
  shipped: "bg-purple-500/20",
  delivered: "bg-emerald-500/20",
  cancelled: "bg-red-500/20",
  returned: "bg-orange-500/20",
};

const STATUS_TEXT: Record<string, string> = {
  pending: "text-amber-400",
  confirmed: "text-blue-400",
  processing: "text-indigo-400",
  ready_to_ship: "text-sky-400",
  shipped: "text-purple-400",
  delivered: "text-emerald-400",
  cancelled: "text-red-400",
  returned: "text-orange-400",
};

function formatStatusLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function getPaymentIcon(method: string) {
  switch (method) {
    case "cod":
      return Banknote;
    case "online":
      return CreditCard;
    case "upi":
      return Smartphone;
    case "bank_transfer":
      return Building2;
    default:
      return CreditCard;
  }
}

function formatPaymentLabel(method: string): string {
  switch (method) {
    case "cod":
      return "Cash on Delivery";
    case "online":
      return "Online Payment";
    case "upi":
      return "UPI";
    case "bank_transfer":
      return "Bank Transfer";
    default:
      return method.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

// ── Skeleton Components ────────────────────────────────────────────────────────

function RevenueCardSkeleton() {
  return (
    <Card className="bg-[#0c0c0e] border-[#27272a]">
      <CardContent className="p-6">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 w-28 bg-[#18181b] rounded" />
            <div className="h-10 w-10 bg-[#18181b] rounded-xl" />
          </div>
          <div className="h-9 w-32 bg-[#18181b] rounded mb-2" />
          <div className="h-3.5 w-24 bg-[#18181b] rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <Card className="bg-[#0c0c0e] border-[#27272a]">
      <CardHeader>
        <div className="h-5 w-32 bg-[#18181b] rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1.5 h-52 animate-pulse">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-[#18181b] rounded-t"
              style={{ height: `${Math.random() * 60 + 20}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-3 w-10 bg-[#18181b] rounded" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusChartSkeleton() {
  return (
    <Card className="bg-[#0c0c0e] border-[#27272a]">
      <CardHeader>
        <div className="h-5 w-32 bg-[#18181b] rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <div className="h-3.5 w-24 bg-[#18181b] rounded" />
                <div className="h-3.5 w-8 bg-[#18181b] rounded" />
              </div>
              <div className="h-3 w-full bg-[#18181b] rounded-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="bg-[#0c0c0e] border-[#27272a]">
      <CardHeader>
        <div className="h-5 w-36 bg-[#18181b] rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3 animate-pulse">
          <div className="flex gap-4 pb-2 border-b border-[#27272a]">
            <div className="h-3.5 w-8 bg-[#18181b] rounded" />
            <div className="h-3.5 w-40 bg-[#18181b] rounded flex-1" />
            <div className="h-3.5 w-16 bg-[#18181b] rounded" />
            <div className="h-3.5 w-20 bg-[#18181b] rounded" />
          </div>
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex gap-4 py-1">
              <div className="h-4 w-8 bg-[#18181b] rounded" />
              <div className="h-4 w-40 bg-[#18181b] rounded flex-1" />
              <div className="h-4 w-16 bg-[#18181b] rounded" />
              <div className="h-4 w-20 bg-[#18181b] rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function InventorySkeleton() {
  return (
    <Card className="bg-[#0c0c0e] border-[#27272a]">
      <CardHeader>
        <div className="h-5 w-40 bg-[#18181b] rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 bg-[#18181b] rounded-full" />
                <div className="h-4 w-24 bg-[#18181b] rounded" />
              </div>
              <div className="h-5 w-12 bg-[#18181b] rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Revenue Bar Chart ──────────────────────────────────────────────────────────

function RevenueChart({ data }: { data: RevenueByDay[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="bg-[#18181b] rounded-full p-4 mb-4">
          <BarChart3 className="h-8 w-8 text-[#a1a1aa]" />
        </div>
        <p className="text-[#fafafa] font-medium">No revenue data</p>
        <p className="text-[#a1a1aa] text-sm mt-1">
          Revenue data will appear here once orders are placed.
        </p>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = data.reduce((sum, d) => sum + d.orders, 0);

  // Show every Nth label to avoid crowding
  const labelInterval = data.length <= 7 ? 1 : data.length <= 14 ? 2 : data.length <= 30 ? 5 : 10;

  return (
    <div>
      <div
        className="relative flex items-end gap-[3px] h-56 overflow-x-auto pb-8 scrollbar-thin"
        style={{ minWidth: data.length > 30 ? `${data.length * 24}px` : "100%" }}
      >
        {data.map((day, i) => {
          const heightPct = Math.max((day.revenue / maxRevenue) * 100, 2);
          const isHovered = hoveredIndex === i;

          return (
            <div
              key={day.date}
              className="relative flex flex-col items-center flex-1 min-w-[16px] group"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                  <div className="bg-[#fafafa] text-[#0c0c0e] rounded-lg px-3 py-2 shadow-xl text-xs whitespace-nowrap">
                    <p className="font-semibold">{formatShortDate(day.date)}</p>
                    <p className="text-[#3f3f46]">
                      {formatPrice(day.revenue)} &middot; {day.orders} order{day.orders !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="w-2 h-2 bg-[#fafafa] rotate-45 mx-auto -mt-1" />
                </div>
              )}

              {/* Bar */}
              <div className="w-full flex-1 flex items-end">
                <div
                  className={cn(
                    "w-full rounded-t-md transition-all duration-200 cursor-pointer",
                    isHovered
                      ? "bg-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                      : "bg-gradient-to-t from-indigo-600 to-indigo-400"
                  )}
                  style={{ height: `${heightPct}%` }}
                />
              </div>

              {/* X-axis label */}
              <span
                className={cn(
                  "absolute -bottom-6 text-[10px] text-[#a1a1aa] whitespace-nowrap",
                  i % labelInterval !== 0 && "hidden"
                )}
              >
                {formatShortDate(day.date)}
              </span>
            </div>
          );
        })}
      </div>

      <Separator className="bg-[#27272a] mt-2" />
      <div className="flex items-center justify-between mt-3 text-sm">
        <span className="text-[#a1a1aa]">
          Period total: <span className="text-[#fafafa] font-semibold">{formatPrice(totalRevenue)}</span>
        </span>
        <span className="text-[#a1a1aa]">
          {totalOrders} order{totalOrders !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

// ── Orders by Status Chart ─────────────────────────────────────────────────────

function OrdersStatusChart({ data }: { data: OrderByStatus[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-[#a1a1aa] text-sm">No orders in this period</p>
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => b.count - a.count);
  const maxCount = Math.max(...sorted.map((d) => d.count), 1);

  return (
    <div className="space-y-3.5">
      {sorted.map((item) => {
        const widthPct = Math.max((item.count / maxCount) * 100, 4);
        const color = STATUS_COLORS[item.status] || "bg-zinc-500";
        const bgColor = STATUS_BG[item.status] || "bg-zinc-500/20";
        const textColor = STATUS_TEXT[item.status] || "text-zinc-400";

        return (
          <div key={item.status} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className={cn("text-sm font-medium", textColor)}>
                {formatStatusLabel(item.status)}
              </span>
              <span className="text-sm font-semibold text-[#fafafa] tabular-nums">
                {item.count}
              </span>
            </div>
            <div className={cn("h-2.5 rounded-full overflow-hidden", bgColor)}>
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  color
                )}
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Payment Methods List ───────────────────────────────────────────────────────

function PaymentMethodsList({ data }: { data: PaymentMethod[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-[#a1a1aa] text-sm">No payment data available</p>
      </div>
    );
  }

  const totalCount = data.reduce((sum, d) => sum + d.count, 0);
  const sorted = [...data].sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-4">
      {sorted.map((pm) => {
        const Icon = getPaymentIcon(pm.method);
        const percentage = totalCount > 0 ? Math.round((pm.count / totalCount) * 100) : 0;

        return (
          <div key={pm.method} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-[#18181b] rounded-lg p-2">
                  <Icon className="h-4 w-4 text-[#a1a1aa]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#fafafa]">
                    {formatPaymentLabel(pm.method)}
                  </p>
                  <p className="text-xs text-[#a1a1aa]">
                    {pm.count} order{pm.count !== 1 ? "s" : ""} &middot; {formatPrice(pm.revenue)}
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold text-[#fafafa] tabular-nums">
                {percentage}%
              </span>
            </div>
            <div className="h-1.5 bg-[#18181b] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-700 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  const fetchAnalytics = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?period=${p}`);
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Failed to load analytics");
        return;
      }
      setData(json.data);
    } catch {
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(period);
  }, [period, fetchAnalytics]);

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Period Selector */}
      <div className="flex items-center justify-end">
        <Select value={period} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-[180px] bg-[#0c0c0e] border-[#27272a] text-[#fafafa]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent className="bg-[#18181b] border-[#27272a]">
            <SelectItem value="7d" className="text-[#fafafa] focus:bg-[#27272a] focus:text-[#fafafa]">
              Last 7 Days
            </SelectItem>
            <SelectItem value="30d" className="text-[#fafafa] focus:bg-[#27272a] focus:text-[#fafafa]">
              Last 30 Days
            </SelectItem>
            <SelectItem value="90d" className="text-[#fafafa] focus:bg-[#27272a] focus:text-[#fafafa]">
              Last 90 Days
            </SelectItem>
            <SelectItem value="all" className="text-[#fafafa] focus:bg-[#27272a] focus:text-[#fafafa]">
              All Time
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Row 1: Revenue Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading ? (
          <>
            <RevenueCardSkeleton />
            <RevenueCardSkeleton />
            <RevenueCardSkeleton />
          </>
        ) : (
          <>
            {/* Total Revenue */}
            <Card className="bg-[#0c0c0e] border-[#27272a] hover:border-[#3f3f46] transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-[#a1a1aa]">Total Revenue</span>
                  <div className="bg-emerald-500/10 rounded-xl p-2.5">
                    <IndianRupee className="h-5 w-5 text-emerald-400" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-[#fafafa] tracking-tight">
                  {formatPrice(data?.revenue.total ?? 0)}
                </div>
                <p className="text-xs text-[#a1a1aa] mt-1.5">
                  from {data?.revenue.orderCount ?? 0} order{(data?.revenue.orderCount ?? 0) !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>

            {/* Average Order Value */}
            <Card className="bg-[#0c0c0e] border-[#27272a] hover:border-[#3f3f46] transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-[#a1a1aa]">Average Order Value</span>
                  <div className="bg-blue-500/10 rounded-xl p-2.5">
                    <TrendingUp className="h-5 w-5 text-blue-400" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-[#fafafa] tracking-tight">
                  {formatPrice(data?.revenue.averageOrderValue ?? 0)}
                </div>
                <p className="text-xs text-[#a1a1aa] mt-1.5">per order average</p>
              </CardContent>
            </Card>

            {/* Orders Count */}
            <Card className="bg-[#0c0c0e] border-[#27272a] hover:border-[#3f3f46] transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-[#a1a1aa]">Orders Count</span>
                  <div className="bg-purple-500/10 rounded-xl p-2.5">
                    <ShoppingCart className="h-5 w-5 text-purple-400" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-[#fafafa] tracking-tight">
                  {data?.revenue.orderCount ?? 0}
                </div>
                <p className="text-xs text-[#a1a1aa] mt-1.5">total orders placed</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Row 2: Revenue Chart */}
      {loading ? (
        <ChartSkeleton />
      ) : (
        <Card className="bg-[#0c0c0e] border-[#27272a]">
          <CardHeader>
            <CardTitle className="text-lg text-[#fafafa]">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={data?.revenueByDay ?? []} />
          </CardContent>
        </Card>
      )}

      {/* Row 3: Orders by Status + Payment Methods */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <>
            <StatusChartSkeleton />
            <StatusChartSkeleton />
          </>
        ) : (
          <>
            <Card className="bg-[#0c0c0e] border-[#27272a]">
              <CardHeader>
                <CardTitle className="text-lg text-[#fafafa]">Orders by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <OrdersStatusChart data={data?.ordersByStatus ?? []} />
              </CardContent>
            </Card>

            <Card className="bg-[#0c0c0e] border-[#27272a]">
              <CardHeader>
                <CardTitle className="text-lg text-[#fafafa]">Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentMethodsList data={data?.paymentMethods ?? []} />
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Row 4: Top Selling Products + Inventory Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <>
            <TableSkeleton rows={5} />
            <InventorySkeleton />
          </>
        ) : (
          <>
            {/* Top Selling Products */}
            <Card className="bg-[#0c0c0e] border-[#27272a]">
              <CardHeader>
                <CardTitle className="text-lg text-[#fafafa]">Top Selling Products</CardTitle>
              </CardHeader>
              <CardContent>
                {(data?.topProducts ?? []).length === 0 ? (
                  <div className="text-center py-10">
                    <div className="bg-[#18181b] rounded-full p-3 w-fit mx-auto mb-3">
                      <Inbox className="h-6 w-6 text-[#a1a1aa]" />
                    </div>
                    <p className="text-[#a1a1aa] text-sm">No sales data yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#27272a]">
                          <th className="text-left text-[#a1a1aa] font-medium pb-3 pr-3 w-8">#</th>
                          <th className="text-left text-[#a1a1aa] font-medium pb-3 pr-3">Product</th>
                          <th className="text-left text-[#a1a1aa] font-medium pb-3 pr-3">Variant</th>
                          <th className="text-right text-[#a1a1aa] font-medium pb-3 pr-3">Qty</th>
                          <th className="text-right text-[#a1a1aa] font-medium pb-3">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data!.topProducts.map((product, i) => (
                          <tr
                            key={`${product.productName}-${product.variantName}-${i}`}
                            className="border-b border-[#27272a]/50 last:border-0"
                          >
                            <td className="py-3 pr-3 text-[#a1a1aa] tabular-nums">{i + 1}</td>
                            <td className="py-3 pr-3 text-[#fafafa] font-medium max-w-[180px] truncate">
                              {product.productName}
                            </td>
                            <td className="py-3 pr-3 text-[#a1a1aa] text-xs max-w-[120px] truncate">
                              {product.variantName}
                            </td>
                            <td className="py-3 pr-3 text-right text-[#fafafa] tabular-nums">
                              {product.quantitySold}
                            </td>
                            <td className="py-3 text-right text-[#fafafa] font-mono text-xs tabular-nums">
                              {formatPrice(product.revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Inventory Overview */}
            <Card className="bg-[#0c0c0e] border-[#27272a]">
              <CardHeader>
                <CardTitle className="text-lg text-[#fafafa]">Inventory Overview</CardTitle>
              </CardHeader>
              <CardContent>
                {!data?.inventorySummary ? (
                  <div className="text-center py-10">
                    <p className="text-[#a1a1aa] text-sm">No inventory data</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {[
                      {
                        label: "Total Variants",
                        value: data.inventorySummary.totalVariants,
                        color: "bg-[#a1a1aa]",
                        textColor: "text-[#fafafa]",
                      },
                      {
                        label: "In Stock",
                        value: data.inventorySummary.inStock,
                        color: "bg-emerald-400",
                        textColor: "text-emerald-400",
                      },
                      {
                        label: "Low Stock",
                        value: data.inventorySummary.lowStock,
                        color: "bg-amber-400",
                        textColor: "text-amber-400",
                      },
                      {
                        label: "Out of Stock",
                        value: data.inventorySummary.outOfStock,
                        color: "bg-red-400",
                        textColor: "text-red-400",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#18181b]/50 hover:bg-[#18181b] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn("h-2.5 w-2.5 rounded-full", item.color)} />
                          <span className="text-sm text-[#a1a1aa]">{item.label}</span>
                        </div>
                        <span className={cn("text-lg font-bold tabular-nums", item.textColor)}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Row 5: Category Performance + Coupon Usage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <>
            <TableSkeleton rows={4} />
            <TableSkeleton rows={3} />
          </>
        ) : (
          <>
            {/* Category Performance */}
            <Card className="bg-[#0c0c0e] border-[#27272a]">
              <CardHeader>
                <CardTitle className="text-lg text-[#fafafa]">Category Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {(data?.categoryStats ?? []).length === 0 ? (
                  <div className="text-center py-10">
                    <div className="bg-[#18181b] rounded-full p-3 w-fit mx-auto mb-3">
                      <Package className="h-6 w-6 text-[#a1a1aa]" />
                    </div>
                    <p className="text-[#a1a1aa] text-sm">No categories yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#27272a]">
                          <th className="text-left text-[#a1a1aa] font-medium pb-3 pr-3">Category</th>
                          <th className="text-right text-[#a1a1aa] font-medium pb-3 pr-3">Products</th>
                          <th className="text-right text-[#a1a1aa] font-medium pb-3">Total Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data!.categoryStats.map((cat) => (
                          <tr
                            key={cat.categoryName}
                            className="border-b border-[#27272a]/50 last:border-0"
                          >
                            <td className="py-3 pr-3 text-[#fafafa] font-medium">
                              {cat.categoryName}
                            </td>
                            <td className="py-3 pr-3 text-right text-[#a1a1aa] tabular-nums">
                              {cat.productCount}
                            </td>
                            <td className="py-3 text-right text-[#fafafa] tabular-nums font-mono text-xs">
                              {cat.totalStock}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Coupon Usage */}
            <Card className="bg-[#0c0c0e] border-[#27272a]">
              <CardHeader>
                <CardTitle className="text-lg text-[#fafafa]">Coupon Usage</CardTitle>
              </CardHeader>
              <CardContent>
                {(data?.couponStats ?? []).length === 0 ? (
                  <div className="text-center py-10">
                    <div className="bg-[#18181b] rounded-full p-3 w-fit mx-auto mb-3">
                      <Tag className="h-6 w-6 text-[#a1a1aa]" />
                    </div>
                    <p className="text-[#a1a1aa] text-sm">No coupons used yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#27272a]">
                          <th className="text-left text-[#a1a1aa] font-medium pb-3 pr-3">Code</th>
                          <th className="text-left text-[#a1a1aa] font-medium pb-3 pr-3">Type</th>
                          <th className="text-right text-[#a1a1aa] font-medium pb-3 pr-3">Value</th>
                          <th className="text-right text-[#a1a1aa] font-medium pb-3">Usage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data!.couponStats.map((coupon) => (
                          <tr
                            key={coupon.code}
                            className="border-b border-[#27272a]/50 last:border-0"
                          >
                            <td className="py-3 pr-3">
                              <span className="font-mono text-indigo-400 font-semibold text-xs bg-indigo-500/10 px-2 py-1 rounded">
                                {coupon.code}
                              </span>
                            </td>
                            <td className="py-3 pr-3">
                              <Badge
                                variant={coupon.discountType === "percentage" ? "info" : "success"}
                                className="text-xs"
                              >
                                {coupon.discountType === "percentage" ? "%" : "Fixed"}
                              </Badge>
                            </td>
                            <td className="py-3 pr-3 text-right text-[#fafafa] tabular-nums">
                              {coupon.discountType === "percentage"
                                ? `${coupon.discountValue}%`
                                : formatPrice(coupon.discountValue)}
                            </td>
                            <td className="py-3 text-right text-[#fafafa] font-semibold tabular-nums">
                              {coupon.usageCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
