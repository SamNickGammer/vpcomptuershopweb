"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { formatPrice, cn } from "@/lib/utils/helpers";

type Transaction = {
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
  customerName: string | null;
  customerEmail: string | null;
};

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "created", label: "Created" },
  { value: "authorized", label: "Authorized" },
  { value: "captured", label: "Captured" },
  { value: "refunded", label: "Refunded" },
  { value: "failed", label: "Failed" },
];

function statusBadge(status: string) {
  const base = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
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

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("limit", "20");

      const res = await fetch(`/api/admin/transactions?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.data.transactions);
        setTotalPages(data.data.totalPages);
        setTotal(data.data.total);
      }
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function shortId(id: string) {
    return id.slice(0, 8) + "...";
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <CreditCard className="h-7 w-7 text-primary" />
            Transactions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} total transaction{total !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <AlertCircle className="h-12 w-12 mb-4" />
          <p className="text-lg font-medium">No transactions found</p>
          <p className="text-sm">
            {statusFilter
              ? "Try changing the status filter."
              : "Transactions will appear here once payments are made."}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Transaction ID
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Order #
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Customer
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    Amount
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Method
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Razorpay Payment ID
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr
                    key={txn.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-foreground">
                      {shortId(txn.id)}
                    </td>
                    <td className="px-4 py-3 text-foreground font-medium">
                      {txn.orderNumber || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-foreground">
                          {txn.customerName || "—"}
                        </p>
                        {txn.customerEmail && (
                          <p className="text-xs text-muted-foreground">
                            {txn.customerEmail}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">
                      {formatPrice(txn.amount)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">
                      {txn.method || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={statusBadge(txn.status)}>
                        {txn.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {txn.razorpayPaymentId || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {formatDate(txn.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
