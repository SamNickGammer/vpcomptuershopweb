"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingBag,
  MapPin,
  CreditCard,
  Tag,
  Trash2,
  Loader2,
  ShieldCheck,
  ArrowLeft,
  Minus,
  Plus,
  Truck,
  Smartphone,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice, cn } from "@/lib/utils/helpers";

type CouponResult = {
  valid: boolean;
  discount: number;
  code: string;
  error?: string;
};

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading, openAuthModal } = useAuth();
  const { items, totalItems, totalPrice, clearCart, removeItem, updateQuantity } = useCart();

  // Shipping form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Bihar");
  const [pincode, setPincode] = useState("");

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online" | "upi">("cod");

  // Coupon
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponResult | null>(null);

  // Order
  const [placing, setPlacing] = useState(false);

  // Pre-fill user info
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user) {
      openAuthModal();
    }
  }, [authLoading, user, openAuthModal]);

  const discount = appliedCoupon?.valid ? appliedCoupon.discount : 0;
  const finalTotal = totalPrice - discount;

  async function handleApplyCoupon() {
    if (!couponCode.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }
    setCouponLoading(true);
    try {
      const res = await fetch("/api/checkout/validate-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim().toUpperCase(), subtotal: totalPrice }),
      });
      const data = await res.json();
      if (data.data?.valid) {
        setAppliedCoupon(data.data);
        toast.success(`Coupon applied! You save ${formatPrice(data.data.discount)}`);
      } else {
        setAppliedCoupon(null);
        toast.error(data.data?.error || data.error || "Invalid coupon");
      }
    } catch {
      toast.error("Failed to validate coupon");
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponCode("");
    toast.info("Coupon removed");
  }

  async function handlePlaceOrder() {
    // Validate fields
    if (!name.trim() || !email.trim() || !line1.trim() || !city.trim() || !pincode.trim()) {
      toast.error("Please fill in all required shipping fields");
      return;
    }
    if (!/^\d{6}$/.test(pincode.trim())) {
      toast.error("Please enter a valid 6-digit pincode");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    setPlacing(true);
    try {
      const res = await fetch("/api/checkout/place-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            variantId: item.variantId,
            productName: item.productName,
            variantName: item.variantName,
            quantity: item.quantity,
            unitPrice: item.price,
          })),
          shippingAddress: {
            line1: line1.trim(),
            line2: line2.trim() || undefined,
            city: city.trim(),
            state: state.trim(),
            pincode: pincode.trim(),
          },
          customerName: name.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim() || undefined,
          paymentMethod,
          couponCode: appliedCoupon?.valid ? appliedCoupon.code : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.data?.orderNumber) {
        clearCart();
        toast.success("Order placed successfully!");
        router.push(`/track-order?orderNumber=${data.data.orderNumber}`);
      } else {
        toast.error(data.error || "Failed to place order");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setPlacing(false);
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
        <ShieldCheck className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold text-foreground">Login Required</h1>
        <p className="text-muted-foreground text-center">
          Please log in to proceed with checkout.
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

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <ShoppingBag className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold text-foreground">Your cart is empty</h1>
        <p className="text-muted-foreground text-center">
          Add some products to your cart before checking out.
        </p>
        <Link
          href="/products"
          className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Continue Shopping
        </Link>
        <h1 className="text-3xl font-bold text-foreground">Checkout</h1>
        <p className="text-muted-foreground mt-1">
          {totalItems} {totalItems === 1 ? "item" : "items"} in your cart
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shipping Information */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Shipping Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                  Address Line 1 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  placeholder="House/Flat no., Street name"
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={line2}
                  onChange={(e) => setLine2(e.target.value)}
                  placeholder="Landmark, Area (optional)"
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                  City <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                  State <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                  Pincode <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit pincode"
                  maxLength={6}
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Payment Method</h2>
            </div>

            <div className="space-y-3">
              <label
                className={cn(
                  "flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all",
                  paymentMethod === "cod"
                    ? "border-primary bg-primary/5"
                    : "border-border bg-secondary hover:border-primary/30"
                )}
              >
                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  checked={paymentMethod === "cod"}
                  onChange={() => setPaymentMethod("cod")}
                  className="sr-only"
                />
                <div
                  className={cn(
                    "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                    paymentMethod === "cod" ? "border-primary" : "border-muted-foreground/30"
                  )}
                >
                  {paymentMethod === "cod" && (
                    <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                  )}
                </div>
                <Banknote className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium text-foreground">Cash on Delivery</p>
                  <p className="text-sm text-muted-foreground">Pay when you receive your order</p>
                </div>
              </label>

              <label className="flex items-center gap-4 p-4 rounded-lg border border-border bg-secondary/50 cursor-not-allowed opacity-50">
                <input type="radio" name="payment" disabled className="sr-only" />
                <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/20" />
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium text-muted-foreground">Online Payment</p>
                  <p className="text-sm text-muted-foreground">Coming soon</p>
                </div>
                <span className="text-xs px-2 py-1 bg-secondary border border-border rounded-full text-muted-foreground">
                  Soon
                </span>
              </label>

              <label className="flex items-center gap-4 p-4 rounded-lg border border-border bg-secondary/50 cursor-not-allowed opacity-50">
                <input type="radio" name="payment" disabled className="sr-only" />
                <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/20" />
                <Smartphone className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium text-muted-foreground">UPI</p>
                  <p className="text-sm text-muted-foreground">Coming soon</p>
                </div>
                <span className="text-xs px-2 py-1 bg-secondary border border-border rounded-full text-muted-foreground">
                  Soon
                </span>
              </label>
            </div>
          </div>

          {/* Coupon Code */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Tag className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Coupon Code</h2>
              <span className="text-sm text-muted-foreground">(optional)</span>
            </div>

            {appliedCoupon?.valid ? (
              <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div>
                  <p className="font-medium text-green-400">
                    Coupon &quot;{appliedCoupon.code}&quot; applied
                  </p>
                  <p className="text-sm text-green-400/70">
                    You save {formatPrice(appliedCoupon.discount)}
                  </p>
                </div>
                <button
                  onClick={removeCoupon}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  className="flex-1 px-4 py-3 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors uppercase"
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={couponLoading}
                  className="px-6 py-3 bg-secondary border border-border rounded-lg font-medium text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {couponLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Apply"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-xl p-6 sticky top-24">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ShoppingBag className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Order Summary</h2>
            </div>

            {/* Cart Items */}
            <div className="space-y-4 mb-6 max-h-80 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.variantId} className="flex gap-3">
                  <div className="h-16 w-16 rounded-lg bg-secondary border border-border overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.productName}
                        width={64}
                        height={64}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <ShoppingBag className="h-6 w-6 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.productName}
                    </p>
                    {item.variantName && item.variantName !== "Default" && (
                      <p className="text-xs text-muted-foreground">{item.variantName}</p>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                          className="h-6 w-6 rounded bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-sm text-foreground w-6 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                          className="h-6 w-6 rounded bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(item.variantId)}
                    className="p-1 text-muted-foreground hover:text-red-400 transition-colors self-start"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">{formatPrice(totalPrice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5" /> Shipping
                </span>
                <span className="text-green-400 font-medium">Free</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-400">Discount</span>
                  <span className="text-green-400">-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="text-lg font-semibold text-foreground">Total</span>
                <span className="text-lg font-bold text-primary">{formatPrice(finalTotal)}</span>
              </div>
            </div>

            {/* Place Order Button */}
            <button
              onClick={handlePlaceOrder}
              disabled={placing}
              className="w-full mt-6 py-4 bg-primary text-white rounded-xl font-semibold text-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {placing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Placing Order...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5" />
                  Place Order
                </>
              )}
            </button>

            <p className="text-xs text-muted-foreground text-center mt-3">
              By placing this order, you agree to our terms and conditions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
