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
  pending: "bg-yellow-50 text-yellow-600 border-yellow-200",
  confirmed: "bg-blue-50 text-blue-600 border-blue-200",
  processing: "bg-indigo-50 text-indigo-600 border-indigo-200",
  ready_to_ship: "bg-purple-50 text-purple-600 border-purple-200",
  shipped: "bg-cyan-50 text-cyan-600 border-cyan-200",
  delivered: "bg-green-50 text-green-600 border-green-200",
  cancelled: "bg-red-50 text-red-500 border-red-200",
  returned: "bg-orange-50 text-orange-600 border-orange-200",
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-600 border-yellow-200",
  paid: "bg-green-50 text-green-600 border-green-200",
  failed: "bg-red-50 text-red-500 border-red-200",
  refunded: "bg-orange-50 text-orange-600 border-orange-200",
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
      <div className="min-h-[60vh] flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 bg-white">
        <User className="h-16 w-16 text-gray-400" />
        <h1 className="text-2xl font-bold text-gray-900">Login Required</h1>
        <p className="text-gray-500 text-center">
          Please log in to view your account.
        </p>
        <button
          onClick={() => openAuthModal("login")}
          className="px-6 py-3 bg-[#d97706] text-white rounded-lg font-medium hover:bg-[#b45309] transition-colors"
        >
          Log In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 bg-white min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Account</h1>
        <p className="text-gray-500 mt-1">
          Welcome back, <span className="text-gray-900 font-medium">{user.name}</span>
        </p>
        <p className="text-sm text-gray-500">{user.email}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-gray-50 p-1 rounded-xl border border-gray-200 w-fit">
        <button
          onClick={() => setActiveTab("orders")}
          className={cn(
            "px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
            activeTab === "orders"
              ? "bg-white text-gray-900 shadow-sm border border-gray-200"
              : "text-gray-500 hover:text-gray-900"
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
              ? "bg-white text-gray-900 shadow-sm border border-gray-200"
              : "text-gray-500 hover:text-gray-900"
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
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No orders yet</h2>
              <p className="text-gray-500 mb-6">
                You haven&apos;t placed any orders yet. Start shopping to see your orders here.
              </p>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#d97706] text-white rounded-lg font-medium hover:bg-[#b45309] transition-colors"
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
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-50 rounded-lg">
                        <Package className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <Link
                          href={`/track-order?orderNumber=${order.orderNumber}`}
                          className="font-semibold text-gray-900 hover:text-amber-600 transition-colors inline-flex items-center gap-1"
                        >
                          {order.orderNumber}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
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
                  <div className="text-sm text-gray-500 mb-3">
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
                      <span className="text-gray-400">
                        {" "}
                        +{order.items.length - 3} more
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <span className="text-lg font-bold text-gray-900">
                      {formatPrice(order.totalAmount)}
                    </span>
                    <Link
                      href={`/track-order?orderNumber=${order.orderNumber}`}
                      className="text-sm text-amber-600 hover:text-amber-700 transition-colors inline-flex items-center gap-1 font-medium"
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
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Personal Information</h2>

            <div className="space-y-5">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <User className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="font-medium text-gray-900">{user.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Mail className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Phone className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium text-gray-400">Not set</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Account Settings</h2>

            <div className="space-y-3">
              <button className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left group">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Edit3 className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Edit Profile</p>
                  <p className="text-sm text-gray-500">
                    Update your name, phone number, and other details
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
              </button>

              <button className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left group">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Lock className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Change Password</p>
                  <p className="text-sm text-gray-500">
                    Update your password for security
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
              </button>

              <button
                onClick={logout}
                className="w-full flex items-center gap-4 p-4 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors text-left group"
              >
                <div className="p-2 bg-red-100 rounded-lg">
                  <LogOut className="h-5 w-5 text-red-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-red-500">Log Out</p>
                  <p className="text-sm text-red-400">
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
