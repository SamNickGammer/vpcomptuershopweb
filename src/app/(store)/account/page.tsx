"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  User,
  Package,
  Mail,
  Phone,
  Loader2,
  ShoppingBag,
  Clock,
  ExternalLink,
  Edit3,
  Lock,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice, cn } from "@/lib/utils/helpers";

type OrderItemSummary = {
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
};

type OrderSummary = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  totalAmount: number;
  createdAt: string;
  items: OrderItemSummary[];
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  confirmed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  processing: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  ready_to_ship: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  shipped: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  delivered: "bg-green-500/10 text-green-400 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
  returned: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  paid: "bg-green-500/10 text-green-400 border-green-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
  refunded: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

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

export default function AccountPage() {
  const { user, loading: authLoading, logout, openAuthModal } = useAuth();
  const [activeTab, setActiveTab] = useState<"orders" | "profile">("orders");
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      openAuthModal();
    }
  }, [authLoading, user, openAuthModal]);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  async function fetchOrders() {
    setOrdersLoading(true);
    try {
      const res = await fetch("/api/auth/customer/me");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.data?.orders || []);
      }
    } catch {
      // Silently fail
    } finally {
      setOrdersLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <User className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold text-foreground">Login Required</h1>
        <p className="text-muted-foreground text-center">
          Please log in to view your account.
        </p>
        <button
          onClick={() => openAuthModal("login")}
          className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Log In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">My Account</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, <span className="text-foreground font-medium">{user.name}</span>
        </p>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-secondary/50 p-1 rounded-xl border border-border w-fit">
        <button
          onClick={() => setActiveTab("orders")}
          className={cn(
            "px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
            activeTab === "orders"
              ? "bg-card text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Package className="h-4 w-4" />
          Orders
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={cn(
            "px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
            activeTab === "profile"
              ? "bg-card text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <User className="h-4 w-4" />
          Profile
        </button>
      </div>

      {/* Orders Tab */}
      {activeTab === "orders" && (
        <div>
          {ordersLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">No orders yet</h2>
              <p className="text-muted-foreground mb-6">
                You haven&apos;t placed any orders yet. Start shopping to see your orders here.
              </p>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                <ShoppingBag className="h-4 w-4" />
                Browse Products
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-card border border-border rounded-xl p-5 hover:border-primary/20 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <Link
                          href={`/track-order?orderNumber=${order.orderNumber}`}
                          className="font-semibold text-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                        >
                          {order.orderNumber}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDate(order.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium border",
                          STATUS_STYLES[order.status] || STATUS_STYLES.pending
                        )}
                      >
                        {formatStatus(order.status)}
                      </span>
                      <span
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium border",
                          PAYMENT_STATUS_STYLES[order.paymentStatus] ||
                            PAYMENT_STATUS_STYLES.pending
                        )}
                      >
                        {formatStatus(order.paymentStatus)}
                      </span>
                    </div>
                  </div>

                  {/* Items summary */}
                  <div className="text-sm text-muted-foreground mb-3">
                    {order.items.slice(0, 3).map((item, idx) => (
                      <span key={idx}>
                        {item.productName}
                        {item.variantName && item.variantName !== "Default"
                          ? ` (${item.variantName})`
                          : ""}{" "}
                        x{item.quantity}
                        {idx < Math.min(order.items.length, 3) - 1 ? ", " : ""}
                      </span>
                    ))}
                    {order.items.length > 3 && (
                      <span className="text-muted-foreground/70">
                        {" "}
                        +{order.items.length - 3} more
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="text-lg font-bold text-foreground">
                      {formatPrice(order.totalAmount)}
                    </span>
                    <Link
                      href={`/track-order?orderNumber=${order.orderNumber}`}
                      className="text-sm text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1 font-medium"
                    >
                      Track Order
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          {/* Profile Info */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">Personal Information</h2>

            <div className="space-y-5">
              <div className="flex items-center gap-4 p-4 bg-secondary rounded-lg">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium text-foreground">{user.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-secondary rounded-lg">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium text-foreground">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-secondary rounded-lg">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium text-muted-foreground">Not set</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">Account Settings</h2>

            <div className="space-y-3">
              <button className="w-full flex items-center gap-4 p-4 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors text-left group">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Edit3 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Edit Profile</p>
                  <p className="text-sm text-muted-foreground">
                    Update your name, phone number, and other details
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>

              <button className="w-full flex items-center gap-4 p-4 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors text-left group">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Change Password</p>
                  <p className="text-sm text-muted-foreground">
                    Update your password for security
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>

              <button
                onClick={logout}
                className="w-full flex items-center gap-4 p-4 bg-red-500/5 border border-red-500/10 rounded-lg hover:bg-red-500/10 transition-colors text-left group"
              >
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <LogOut className="h-5 w-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-red-400">Log Out</p>
                  <p className="text-sm text-red-400/60">
                    Sign out of your account
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
