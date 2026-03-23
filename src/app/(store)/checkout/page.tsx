"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProductImage } from "@/components/ui/product-image";
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
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/hooks/useCart";
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

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | "new">("new");
  const [saveAddress, setSaveAddress] = useState(true);
  const [addressesLoaded, setAddressesLoaded] = useState(false);

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

  // Fetch saved addresses
  useEffect(() => {
    if (user) {
      fetch("/api/auth/customer/addresses")
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.data && data.data.length > 0) {
            setSavedAddresses(data.data);
            const defaultAddr = data.data.find((a: CustomerAddress) => a.isDefault) || data.data[0];
            setSelectedAddressId(defaultAddr.id);
            fillFromAddress(defaultAddr);
          }
        })
        .catch(() => {})
        .finally(() => setAddressesLoaded(true));
    }
  }, [user]);

  function fillFromAddress(addr: CustomerAddress) {
    setName(addr.name);
    setPhone(addr.phone);
    setLine1(addr.line1);
    setLine2(addr.line2 || "");
    setCity(addr.city);
    setState(addr.state);
    setPincode(addr.pincode);
  }

  function handleAddressSelect(id: string | "new") {
    setSelectedAddressId(id);
    if (id === "new") {
      setName(user?.name || "");
      setPhone("");
      setLine1("");
      setLine2("");
      setCity("");
      setState("Bihar");
      setPincode("");
      setSaveAddress(true);
    } else {
      const addr = savedAddresses.find((a) => a.id === id);
      if (addr) {
        fillFromAddress(addr);
        setSaveAddress(false);
      }
    }
  }

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

  function loadRazorpay(): Promise<void> {
    return new Promise((resolve) => {
      if (document.getElementById("razorpay-script")) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  }

  async function saveNewAddress() {
    if (selectedAddressId === "new" && saveAddress && line1.trim()) {
      try {
        await fetch("/api/auth/customer/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: "Home",
            name: name.trim(),
            phone: phone.trim(),
            line1: line1.trim(),
            line2: line2.trim() || undefined,
            city: city.trim(),
            state: state.trim(),
            pincode: pincode.trim(),
            isDefault: savedAddresses.length === 0,
          }),
        });
      } catch {
        // Non-critical, don't block order success
      }
    }
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
      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            variantName: item.variantName,
            quantity: item.quantity,
            unitPrice: item.price,
          })),
          shippingAddress: {
            name: name.trim(),
            phone: phone.trim(),
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

      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to place order");
        return;
      }

      // COD flow
      if (data.data.paymentMethod === "cod") {
        await saveNewAddress();
        clearCart();
        toast.success("Order placed successfully!");
        router.push(`/track-order?orderNumber=${data.data.orderNumber}`);
        return;
      }

      // Online / UPI flow — open Razorpay checkout
      await loadRazorpay();

      const options = {
        key: data.data.razorpayKeyId,
        amount: data.data.amount,
        currency: data.data.currency,
        name: "V&P Computer Shop",
        description: `Order ${data.data.orderNumber}`,
        order_id: data.data.razorpayOrderId,
        prefill: {
          name: data.data.customerName,
          email: data.data.customerEmail,
          contact: data.data.customerPhone,
        },
        theme: { color: "#d97706" },
        handler: async function (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) {
          // Payment success — verify on server
          try {
            const verifyRes = await fetch("/api/checkout/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderId: data.data.orderId,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              await saveNewAddress();
              clearCart();
              router.push(
                `/track-order?orderNumber=${verifyData.data.orderNumber}`
              );
              toast.success("Payment successful! Order confirmed.");
            } else {
              toast.error("Payment verification failed. Please contact support.");
            }
          } catch {
            toast.error("Payment verification failed. Please contact support.");
          }
        },
        modal: {
          ondismiss: function () {
            toast.info("Payment cancelled.");
          },
        },
      };

      const rzp = new (window as unknown as { Razorpay: new (opts: typeof options) => { open: () => void; on: (event: string, handler: (response: { error: { code: string; description: string; metadata: { order_id: string } } }) => void) => void } }).Razorpay(options);

      rzp.on(
        "payment.failed",
        async function (response: {
          error: {
            code: string;
            description: string;
            metadata: { order_id: string };
          };
        }) {
          await fetch("/api/checkout/payment-failed", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.error.metadata.order_id,
              error_code: response.error.code,
              error_description: response.error.description,
              orderId: data.data.orderId,
            }),
          });
          toast.error("Payment failed: " + response.error.description);
        }
      );

      rzp.open();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setPlacing(false);
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
        <ShieldCheck className="h-16 w-16 text-gray-400" />
        <h1 className="text-2xl font-bold text-gray-900">Login Required</h1>
        <p className="text-gray-500 text-center">
          Please log in to proceed with checkout.
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

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 bg-white">
        <ShoppingBag className="h-16 w-16 text-gray-400" />
        <h1 className="text-2xl font-bold text-gray-900">Your cart is empty</h1>
        <p className="text-gray-500 text-center">
          Add some products to your cart before checking out.
        </p>
        <Link
          href="/products"
          className="px-6 py-3 bg-[#d97706] text-white rounded-lg font-medium hover:bg-[#b45309] transition-colors"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  const inputClasses = "w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-colors";

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 bg-white min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Continue Shopping
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        <p className="text-gray-500 mt-1">
          {totalItems} {totalItems === 1 ? "item" : "items"} in your cart
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shipping Information */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-50 rounded-lg">
                <MapPin className="h-5 w-5 text-amber-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Shipping Information</h2>
            </div>

            {/* Saved Address Selection */}
            {savedAddresses.length > 0 && (
              <div className="mb-6 space-y-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Select Address</p>
                {savedAddresses.map((addr) => (
                  <label
                    key={addr.id}
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                      selectedAddressId === addr.id
                        ? "border-amber-500 bg-amber-50"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300"
                    )}
                  >
                    <input
                      type="radio"
                      name="savedAddress"
                      value={addr.id}
                      checked={selectedAddressId === addr.id}
                      onChange={() => handleAddressSelect(addr.id)}
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        "mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                        selectedAddressId === addr.id ? "border-amber-600" : "border-gray-300"
                      )}
                    >
                      {selectedAddressId === addr.id && (
                        <div className="h-2.5 w-2.5 rounded-full bg-amber-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
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
                      <p className="text-sm font-medium text-gray-900">{addr.name}</p>
                      <p className="text-xs text-gray-500">{addr.phone}</p>
                      <p className="text-xs text-gray-500">
                        {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} - {addr.pincode}
                      </p>
                    </div>
                  </label>
                ))}

                {/* Use New Address option */}
                <label
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                    selectedAddressId === "new"
                      ? "border-amber-500 bg-amber-50"
                      : "border-gray-200 bg-gray-50 hover:border-gray-300"
                  )}
                >
                  <input
                    type="radio"
                    name="savedAddress"
                    value="new"
                    checked={selectedAddressId === "new"}
                    onChange={() => handleAddressSelect("new")}
                    className="sr-only"
                  />
                  <div
                    className={cn(
                      "h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                      selectedAddressId === "new" ? "border-amber-600" : "border-gray-300"
                    )}
                  >
                    {selectedAddressId === "new" && (
                      <div className="h-2.5 w-2.5 rounded-full bg-amber-600" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-900">Use a New Address</span>
                  </div>
                </label>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className={inputClasses}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className={inputClasses}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                  className={inputClasses}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1.5">
                  Address Line 1 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  placeholder="House/Flat no., Street name"
                  className={inputClasses}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1.5">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={line2}
                  onChange={(e) => setLine2(e.target.value)}
                  placeholder="Landmark, Area (optional)"
                  className={inputClasses}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className={inputClasses}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">
                  State <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className={inputClasses}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">
                  Pincode <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit pincode"
                  maxLength={6}
                  className={inputClasses}
                />
              </div>
            </div>

            {/* Save address checkbox */}
            {selectedAddressId === "new" && (
              <label className="flex items-center gap-3 mt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveAddress}
                  onChange={(e) => setSaveAddress(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm text-gray-600">Save this address for future orders</span>
              </label>
            )}
          </div>

          {/* Payment Method */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-50 rounded-lg">
                <CreditCard className="h-5 w-5 text-amber-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Payment Method</h2>
            </div>

            <div className="space-y-3">
              <label
                className={cn(
                  "flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all",
                  paymentMethod === "cod"
                    ? "border-amber-500 bg-amber-50"
                    : "border-gray-200 bg-gray-50 hover:border-gray-300"
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
                    paymentMethod === "cod" ? "border-amber-600" : "border-gray-300"
                  )}
                >
                  {paymentMethod === "cod" && (
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-600" />
                  )}
                </div>
                <Banknote className="h-5 w-5 text-gray-500" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Cash on Delivery</p>
                  <p className="text-sm text-gray-500">Pay when you receive your order</p>
                </div>
              </label>

              <label
                className={cn(
                  "flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all",
                  paymentMethod === "online"
                    ? "border-amber-500 bg-amber-50"
                    : "border-gray-200 bg-gray-50 hover:border-gray-300"
                )}
              >
                <input
                  type="radio"
                  name="payment"
                  value="online"
                  checked={paymentMethod === "online"}
                  onChange={() => setPaymentMethod("online")}
                  className="sr-only"
                />
                <div
                  className={cn(
                    "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                    paymentMethod === "online" ? "border-amber-600" : "border-gray-300"
                  )}
                >
                  {paymentMethod === "online" && (
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-600" />
                  )}
                </div>
                <CreditCard className="h-5 w-5 text-gray-500" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Online Payment</p>
                  <p className="text-sm text-gray-500">Pay via Card, Net Banking, Wallet</p>
                </div>
              </label>

              <label
                className={cn(
                  "flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all",
                  paymentMethod === "upi"
                    ? "border-amber-500 bg-amber-50"
                    : "border-gray-200 bg-gray-50 hover:border-gray-300"
                )}
              >
                <input
                  type="radio"
                  name="payment"
                  value="upi"
                  checked={paymentMethod === "upi"}
                  onChange={() => setPaymentMethod("upi")}
                  className="sr-only"
                />
                <div
                  className={cn(
                    "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                    paymentMethod === "upi" ? "border-amber-600" : "border-gray-300"
                  )}
                >
                  {paymentMethod === "upi" && (
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-600" />
                  )}
                </div>
                <Smartphone className="h-5 w-5 text-gray-500" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">UPI</p>
                  <p className="text-sm text-gray-500">Pay via Google Pay, PhonePe, Paytm</p>
                </div>
              </label>
            </div>
          </div>

          {/* Coupon Code */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Tag className="h-5 w-5 text-amber-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Coupon Code</h2>
              <span className="text-sm text-gray-500">(optional)</span>
            </div>

            {appliedCoupon?.valid ? (
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <p className="font-medium text-green-600">
                    Coupon &quot;{appliedCoupon.code}&quot; applied
                  </p>
                  <p className="text-sm text-green-600/70">
                    You save {formatPrice(appliedCoupon.discount)}
                  </p>
                </div>
                <button
                  onClick={removeCoupon}
                  className="p-2 text-red-500 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
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
                  className={cn(inputClasses, "flex-1 uppercase")}
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={couponLoading}
                  className="px-6 py-3 bg-gray-100 border border-gray-200 rounded-lg font-medium text-gray-900 hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
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
          <div className="bg-white border border-gray-200 rounded-xl p-6 sticky top-24">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-50 rounded-lg">
                <ShoppingBag className="h-5 w-5 text-amber-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Order Summary</h2>
            </div>

            {/* Cart Items */}
            <div className="space-y-4 mb-6 max-h-80 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.variantId} className="flex gap-3">
                  <div className="h-16 w-16 rounded-lg bg-gray-50 border border-gray-200 overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <ProductImage
                        src={item.image}
                        alt={item.productName}
                        width={64}
                        height={64}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <ShoppingBag className="h-6 w-6 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.productName}
                    </p>
                    {item.variantName && item.variantName !== "Default" && (
                      <p className="text-xs text-gray-500">{item.variantName}</p>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                          className="h-6 w-6 rounded bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-sm text-gray-900 w-6 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                          className="h-6 w-6 rounded bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(item.variantId)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors self-start"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-gray-200 pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900">{formatPrice(totalPrice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5" /> Shipping
                </span>
                <span className="text-green-600 font-medium">Free</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Discount</span>
                  <span className="text-green-600">-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-3 flex justify-between">
                <span className="text-lg font-semibold text-gray-900">Total</span>
                <span className="text-lg font-bold text-gray-900">{formatPrice(finalTotal)}</span>
              </div>
            </div>

            {/* Place Order Button */}
            <button
              onClick={handlePlaceOrder}
              disabled={placing}
              className="w-full mt-6 py-4 bg-[#d97706] text-white rounded-xl font-semibold text-lg hover:bg-[#b45309] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

            <p className="text-xs text-gray-400 text-center mt-3">
              By placing this order, you agree to our terms and conditions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
