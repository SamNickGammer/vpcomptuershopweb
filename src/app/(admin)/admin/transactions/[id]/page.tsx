"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  CreditCard,
  Copy,
  Check,
  AlertCircle,
  RotateCcw,
  ExternalLink,
  Calendar,
  Hash,
  IndianRupee,
  User,
  Mail,
  Package,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatPrice } from "@/lib/utils/helpers";

type TransactionDetail = {
  id: string;
  orderId: string | null;
  customerId: string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  amount: number;
  currency: string;
  status: string;
  method: string | null;
  errorCode: string | null;
  errorDescription: string | null;
  refundId: string | null;
  refundAmount: number | null;
  createdAt: string;
  updatedAt: string;
  orderNumber: string | null;
  orderId2: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
};

function statusBadge(status: string) {
  const base =
    "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold";
  switch (status) {
    case "created":
      return cn(base, "bg-gray-700 text-gray-300");
    case "authorized":
      return cn(base, "bg-yellow-900/50 text-yellow-400");
    case "captured":
      return cn(base, "bg-green-900/50 text-green-400");
    case "failed":
      return cn(base, "bg-red-900/50 text-red-400");
    case "refunded":
      return cn(base, "bg-blue-900/50 text-blue-400");
    default:
      return cn(base, "bg-gray-700 text-gray-300");
  }
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);

  const [txn, setTxn] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Refund state
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [processingRefund, setProcessingRefund] = useState(false);

  const fetchTransaction = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/transactions/${id}`);
      const data = await res.json();
      if (data.success) {
        setTxn(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch transaction:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTransaction();
  }, [fetchTransaction]);

  useEffect(() => {
    if (txn && showRefundDialog) {
      setRefundAmount(String(txn.amount / 100));
    }
  }, [txn, showRefundDialog]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleRefund = async () => {
    if (!txn) return;
    setProcessingRefund(true);
    try {
      const amountInPaise = Math.round(parseFloat(refundAmount) * 100);
      if (isNaN(amountInPaise) || amountInPaise <= 0) {
        toast.error("Please enter a valid refund amount");
        setProcessingRefund(false);
        return;
      }
      if (amountInPaise > txn.amount) {
        toast.error("Refund amount cannot exceed the transaction amount");
        setProcessingRefund(false);
        return;
      }

      const res = await fetch(`/api/admin/transactions/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "refund",
          amount: amountInPaise,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Refund initiated successfully");
        setShowRefundDialog(false);
        fetchTransaction();
      } else {
        toast.error(data.error || "Failed to process refund");
      }
    } catch {
      toast.error("Failed to process refund");
    } finally {
      setProcessingRefund(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            Loading transaction...
          </span>
        </div>
      </div>
    );
  }

  if (!txn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="rounded-full bg-secondary p-4 mb-4">
          <CreditCard className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          Transaction not found
        </h2>
        <p className="text-muted-foreground text-sm mt-1 mb-4">
          This transaction may not exist or the link is invalid.
        </p>
        <Link
          href="/admin/transactions"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/30 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Transactions
        </Link>
      </div>
    );
  }

  const paymentUrl = txn.razorpayOrderId
    ? `https://rzp.io/rzp/${txn.razorpayOrderId}`
    : null;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/transactions"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Transactions
        </Link>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <CreditCard className="h-7 w-7 text-primary" />
          Transaction Details
        </h1>
        <span className={statusBadge(txn.status)}>{txn.status}</span>
      </div>

      {/* Main Info Card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Transaction ID */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Transaction Info
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Hash className="h-3.5 w-3.5" />
                  Transaction ID
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-foreground break-all">
                    {txn.id}
                  </span>
                  <button
                    onClick={() => copyToClipboard(txn.id, "txnId")}
                    className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    {copiedField === "txnId" ? (
                      <Check className="h-3.5 w-3.5 text-green-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CreditCard className="h-3.5 w-3.5" />
                  Status
                </span>
                <span className={statusBadge(txn.status)}>{txn.status}</span>
              </div>

              {txn.razorpayOrderId && (
                <div className="space-y-1">
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Hash className="h-3.5 w-3.5" />
                    Razorpay Order ID
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-foreground break-all">
                      {txn.razorpayOrderId}
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(txn.razorpayOrderId!, "rpOrderId")
                      }
                      className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                      {copiedField === "rpOrderId" ? (
                        <Check className="h-3.5 w-3.5 text-green-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {txn.razorpayPaymentId && (
                <div className="space-y-1">
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Hash className="h-3.5 w-3.5" />
                    Razorpay Payment ID
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-foreground break-all">
                      {txn.razorpayPaymentId}
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(txn.razorpayPaymentId!, "rpPaymentId")
                      }
                      className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                      {copiedField === "rpPaymentId" ? (
                        <Check className="h-3.5 w-3.5 text-green-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <IndianRupee className="h-3.5 w-3.5" />
                  Amount
                </span>
                <span className="font-mono text-lg font-semibold text-foreground">
                  {formatPrice(txn.amount)}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Currency</span>
                <span className="text-sm text-foreground">
                  {txn.currency}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">
                  Payment Method
                </span>
                <span className="text-sm text-foreground capitalize">
                  {txn.method || "---"}
                </span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Customer & Order */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Customer & Order
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  Customer
                </span>
                <span className="text-sm text-foreground">
                  {txn.customerName || "---"}
                </span>
              </div>

              {txn.customerEmail && (
                <div className="space-y-1">
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </span>
                  <span className="text-sm text-foreground">
                    {txn.customerEmail}
                  </span>
                </div>
              )}

              <div className="space-y-1">
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Package className="h-3.5 w-3.5" />
                  Order
                </span>
                {txn.orderNumber && txn.orderId ? (
                  <Link
                    href={`/admin/orders/${txn.orderId}`}
                    className="text-sm text-primary hover:underline font-mono"
                  >
                    {txn.orderNumber}
                  </Link>
                ) : (
                  <span className="text-sm text-muted-foreground">---</span>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Dates */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Timestamps
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Created
                </span>
                <span className="text-sm text-foreground">
                  {formatDateTime(txn.createdAt)}
                </span>
              </div>
              <div className="space-y-1">
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Updated
                </span>
                <span className="text-sm text-foreground">
                  {formatDateTime(txn.updatedAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Error Info */}
          {txn.status === "failed" && (txn.errorCode || txn.errorDescription) && (
            <>
              <div className="border-t border-border" />
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Error Details
                </h3>
                <div className="rounded-lg bg-red-900/20 border border-red-900/30 p-4 space-y-2">
                  {txn.errorCode && (
                    <div>
                      <span className="text-xs text-red-400/70">
                        Error Code
                      </span>
                      <p className="text-sm font-mono text-red-300">
                        {txn.errorCode}
                      </p>
                    </div>
                  )}
                  {txn.errorDescription && (
                    <div>
                      <span className="text-xs text-red-400/70">
                        Description
                      </span>
                      <p className="text-sm text-red-300">
                        {txn.errorDescription}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Refund Info */}
          {txn.status === "refunded" && txn.refundId && (
            <>
              <div className="border-t border-border" />
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Refund Details
                </h3>
                <div className="rounded-lg bg-blue-900/20 border border-blue-900/30 p-4 space-y-3">
                  <div>
                    <span className="text-xs text-blue-400/70">Refund ID</span>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono text-blue-300">
                        {txn.refundId}
                      </p>
                      <button
                        onClick={() =>
                          copyToClipboard(txn.refundId!, "refundId")
                        }
                        className="p-1 rounded hover:bg-muted/50 text-blue-400/70 hover:text-blue-300 transition-colors"
                      >
                        {copiedField === "refundId" ? (
                          <Check className="h-3.5 w-3.5 text-green-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  {txn.refundAmount !== null && (
                    <div>
                      <span className="text-xs text-blue-400/70">
                        Refund Amount
                      </span>
                      <p className="text-sm font-mono font-semibold text-blue-300">
                        {formatPrice(txn.refundAmount)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Payment URL Section (for "created" status) */}
      {txn.status === "created" && paymentUrl && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Payment URL
          </h3>
          <p className="text-sm text-muted-foreground">
            Share this link with the customer to complete payment.
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-lg bg-secondary/50 border border-border px-4 py-2.5 font-mono text-sm text-foreground break-all">
              {paymentUrl}
            </div>
            <button
              onClick={() => copyToClipboard(paymentUrl, "paymentUrl")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
            >
              {copiedField === "paymentUrl" ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Payment Link
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Refund Section (for "captured" status) */}
      {txn.status === "captured" && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Refund
          </h3>
          <p className="text-sm text-muted-foreground">
            Initiate a full or partial refund for this transaction via Razorpay.
          </p>
          {!showRefundDialog ? (
            <button
              onClick={() => setShowRefundDialog(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red-700/50 bg-red-900/20 text-red-400 text-sm font-medium hover:bg-red-900/40 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Initiate Refund
            </button>
          ) : (
            <div className="rounded-lg border border-border bg-secondary/30 p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Refund Amount (INR)
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={txn.amount / 100}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-card border border-border text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Full amount: {formatPrice(txn.amount)}. Enter a smaller amount
                  for partial refund.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefund}
                  disabled={processingRefund}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingRefund ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  Confirm Refund
                </button>
                <button
                  onClick={() => setShowRefundDialog(false)}
                  className="px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
