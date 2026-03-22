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
  MapPin,
  Plus,
  Trash2,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice, cn } from "@/lib/utils/helpers";

type CustomerAddress = {
  id: string;
  label: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

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

  // Addresses
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const [addrLabel, setAddrLabel] = useState("Home");
  const [addrName, setAddrName] = useState("");
  const [addrPhone, setAddrPhone] = useState("");
  const [addrLine1, setAddrLine1] = useState("");
  const [addrLine2, setAddrLine2] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrState, setAddrState] = useState("Bihar");
  const [addrPincode, setAddrPincode] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      openAuthModal();
    }
  }, [authLoading, user, openAuthModal]);

  useEffect(() => {
    if (user) {
      fetchOrders();
      fetchAddresses();
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

  async function fetchAddresses() {
    setAddressesLoading(true);
    try {
      const res = await fetch("/api/auth/customer/addresses");
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.data || []);
      }
    } catch {
      // Silently fail
    } finally {
      setAddressesLoading(false);
    }
  }

  function resetAddressForm() {
    setAddrLabel("Home");
    setAddrName("");
    setAddrPhone("");
    setAddrLine1("");
    setAddrLine2("");
    setAddrCity("");
    setAddrState("Bihar");
    setAddrPincode("");
    setShowAddressForm(false);
  }

  async function handleAddAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!addrName.trim() || !addrPhone.trim() || !addrLine1.trim() || !addrCity.trim() || !addrPincode.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    setAddressSubmitting(true);
    try {
      const res = await fetch("/api/auth/customer/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: addrLabel,
          name: addrName.trim(),
          phone: addrPhone.trim(),
          line1: addrLine1.trim(),
          line2: addrLine2.trim() || undefined,
          city: addrCity.trim(),
          state: addrState.trim(),
          pincode: addrPincode.trim(),
          isDefault: addresses.length === 0,
        }),
      });
      if (res.ok) {
        toast.success("Address added");
        resetAddressForm();
        fetchAddresses();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to add address");
      }
    } catch {
      toast.error("Failed to add address");
    } finally {
      setAddressSubmitting(false);
    }
  }

  async function handleSetDefaultAddress(addressId: string) {
    try {
      const res = await fetch("/api/auth/customer/addresses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressId, isDefault: true }),
      });
      if (res.ok) {
        toast.success("Default address updated");
        fetchAddresses();
      } else {
        toast.error("Failed to update address");
      }
    } catch {
      toast.error("Failed to update address");
    }
  }

  async function handleDeleteAddress(addressId: string) {
    try {
      const res = await fetch("/api/auth/customer/addresses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressId }),
      });
      if (res.ok) {
        toast.success("Address deleted");
        fetchAddresses();
      } else {
        toast.error("Failed to delete address");
      }
    } catch {
      toast.error("Failed to delete address");
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

          {/* Saved Addresses */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <MapPin className="h-5 w-5 text-amber-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Saved Addresses</h2>
              </div>
              {!showAddressForm && (
                <button
                  onClick={() => setShowAddressForm(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add New Address
                </button>
              )}
            </div>

            {addressesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
              </div>
            ) : (
              <>
                {addresses.length === 0 && !showAddressForm && (
                  <p className="text-gray-500 text-sm text-center py-6">
                    No saved addresses yet. Add one for faster checkout.
                  </p>
                )}

                <div className="space-y-3">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={cn(
                        "p-4 rounded-lg border transition-colors",
                        addr.isDefault
                          ? "border-amber-200 bg-amber-50/50"
                          : "border-gray-200 bg-gray-50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                              {addr.label}
                            </span>
                            {addr.isDefault && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 inline-flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                Default
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-gray-900">{addr.name}</p>
                          <p className="text-sm text-gray-500">{addr.phone}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {addr.line1}
                            {addr.line2 ? `, ${addr.line2}` : ""}
                            <br />
                            {addr.city}, {addr.state} - {addr.pincode}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!addr.isDefault && (
                            <button
                              onClick={() => handleSetDefaultAddress(addr.id)}
                              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                              Set as Default
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Address Form */}
                {showAddressForm && (
                  <form onSubmit={handleAddAddress} className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-4">
                    <h3 className="font-medium text-gray-900">New Address</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1.5">
                          Label <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={addrLabel}
                          onChange={(e) => setAddrLabel(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-colors"
                        >
                          <option value="Home">Home</option>
                          <option value="Office">Office</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1.5">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={addrName}
                          onChange={(e) => setAddrName(e.target.value)}
                          placeholder="Recipient name"
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1.5">
                          Phone <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          value={addrPhone}
                          onChange={(e) => setAddrPhone(e.target.value)}
                          placeholder="+91 XXXXXXXXXX"
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-colors"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-500 mb-1.5">
                          Address Line 1 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={addrLine1}
                          onChange={(e) => setAddrLine1(e.target.value)}
                          placeholder="House/Flat no., Street name"
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-colors"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-500 mb-1.5">
                          Address Line 2
                        </label>
                        <input
                          type="text"
                          value={addrLine2}
                          onChange={(e) => setAddrLine2(e.target.value)}
                          placeholder="Landmark, Area (optional)"
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1.5">
                          City <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={addrCity}
                          onChange={(e) => setAddrCity(e.target.value)}
                          placeholder="City"
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1.5">
                          State <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={addrState}
                          onChange={(e) => setAddrState(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1.5">
                          Pincode <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={addrPincode}
                          onChange={(e) => setAddrPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="6-digit pincode"
                          maxLength={6}
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-colors"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={addressSubmitting}
                        className="px-5 py-2.5 bg-[#d97706] text-white rounded-lg text-sm font-medium hover:bg-[#b45309] transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {addressSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        Save Address
                      </button>
                      <button
                        type="button"
                        onClick={resetAddressForm}
                        className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
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
