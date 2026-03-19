"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  Package,
  AlertTriangle,
  PackageX,
  Boxes,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatPrice } from "@/lib/utils/helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

/* ---------- Types (matches new API shape) ---------- */

interface InventoryItem {
  id: string;
  variantId: string;
  name: string;
  sku: string | null;
  price: number;
  stock: number;
  lowStockThreshold: number;
  isDefault: boolean;
  product: {
    id: string;
    name: string;
  };
}

/* ---------- Constants ---------- */

const REASONS = [
  { value: "purchase", label: "Purchase" },
  { value: "sale", label: "Sale" },
  { value: "return", label: "Return" },
  { value: "adjustment", label: "Adjustment" },
  { value: "damage", label: "Damage" },
];

const QUICK_ADJUSTMENTS = [
  { label: "+1", value: 1 },
  { label: "+5", value: 5 },
  { label: "+10", value: 10 },
  { label: "-1", value: -1 },
  { label: "-5", value: -5 },
  { label: "-10", value: -10 },
];

/* ---------- Helpers ---------- */

function getStockStatus(
  stock: number,
  threshold: number
): { label: string; variant: "success" | "warning" | "destructive" } {
  if (stock <= 0) return { label: "Out of Stock", variant: "destructive" };
  if (stock <= threshold) return { label: "Low Stock", variant: "warning" };
  return { label: "In Stock", variant: "success" };
}

function getStockColor(stock: number, threshold: number): string {
  if (stock <= 0) return "text-red-400";
  if (stock <= threshold) return "text-amber-400";
  return "text-emerald-400";
}

/* ---------- Skeleton ---------- */

function TableSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-b-0"
        >
          <div className="flex-1 space-y-2">
            <div className="h-4 w-36 bg-secondary rounded animate-pulse" />
            <div className="h-3 w-20 bg-secondary rounded animate-pulse" />
          </div>
          <div className="h-4 w-20 bg-secondary rounded animate-pulse" />
          <div className="h-4 w-16 bg-secondary rounded animate-pulse" />
          <div className="h-4 w-12 bg-secondary rounded animate-pulse" />
          <div className="h-4 w-10 bg-secondary rounded animate-pulse" />
          <div className="h-6 w-16 bg-secondary rounded-full animate-pulse" />
          <div className="h-8 w-16 bg-secondary rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/* ---------- Page ---------- */

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Update dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [changeQty, setChangeQty] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (lowStockOnly) params.set("lowStock", "true");

      const res = await fetch(`/api/admin/inventory?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setItems(json.data);
      } else {
        toast.error(json.error || "Failed to fetch inventory");
      }
    } catch {
      toast.error("Failed to fetch inventory");
    } finally {
      setLoading(false);
    }
  }, [lowStockOnly]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const openUpdateDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    setChangeQty("");
    setReason("");
    setNote("");
    setDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedItem) return;
    const qty = parseInt(changeQty, 10);
    if (isNaN(qty) || qty === 0) {
      toast.error("Please enter a valid non-zero quantity");
      return;
    }
    if (!reason) {
      toast.error("Please select a reason");
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: selectedItem.variantId,
          changeQuantity: qty,
          reason,
          note: note || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Stock updated successfully");
        setDialogOpen(false);
        fetchInventory();
      } else {
        toast.error(json.error || "Failed to update stock");
      }
    } catch {
      toast.error("Failed to update stock");
    } finally {
      setUpdating(false);
    }
  };

  // Computed stats
  const totalItems = items.length;
  const lowStockCount = items.filter(
    (i) => i.stock > 0 && i.stock <= i.lowStockThreshold
  ).length;
  const outOfStockCount = items.filter((i) => i.stock <= 0).length;

  return (
    <div className="space-y-6">
      {/* Top bar: toggle + count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? (
            <span className="inline-block h-4 w-24 bg-secondary rounded animate-pulse align-middle" />
          ) : (
            <>
              <span className="font-medium text-foreground">{totalItems}</span>{" "}
              item{totalItems !== 1 ? "s" : ""}
            </>
          )}
        </p>
        <div className="flex items-center gap-3">
          <Switch
            checked={lowStockOnly}
            onCheckedChange={setLowStockOnly}
            id="low-stock-toggle"
          />
          <Label
            htmlFor="low-stock-toggle"
            className="text-sm font-medium cursor-pointer flex items-center gap-2 text-foreground"
          >
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Low Stock Only
          </Label>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card rounded-xl border border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {loading ? (
                    <span className="inline-block h-8 w-12 bg-secondary rounded animate-pulse" />
                  ) : (
                    totalItems
                  )}
                </p>
              </div>
              <div className="rounded-full bg-primary/10 p-3">
                <Boxes className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card rounded-xl border border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-3xl font-bold text-amber-400 mt-1">
                  {loading ? (
                    <span className="inline-block h-8 w-12 bg-secondary rounded animate-pulse" />
                  ) : (
                    lowStockCount
                  )}
                </p>
              </div>
              <div className="rounded-full bg-amber-500/10 p-3">
                <TrendingDown className="h-6 w-6 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card rounded-xl border border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
                <p className="text-3xl font-bold text-red-400 mt-1">
                  {loading ? (
                    <span className="inline-block h-8 w-12 bg-secondary rounded animate-pulse" />
                  ) : (
                    outOfStockCount
                  )}
                </p>
              </div>
              <div className="rounded-full bg-red-500/10 p-3">
                <PackageX className="h-6 w-6 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Table */}
      <Card className="bg-card rounded-xl border border-border overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton />
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="rounded-full bg-secondary p-4 mb-4">
                <Package className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                No inventory items
              </h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-sm">
                {lowStockOnly
                  ? "No low stock items found. All items are well stocked."
                  : "Inventory will appear here when products with variants are added."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">
                    Product
                  </TableHead>
                  <TableHead className="text-muted-foreground">SKU</TableHead>
                  <TableHead className="text-muted-foreground">
                    Price
                  </TableHead>
                  <TableHead className="text-center text-muted-foreground">
                    Stock
                  </TableHead>
                  <TableHead className="text-center text-muted-foreground">
                    Threshold
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="text-right text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const status = getStockStatus(
                    item.stock,
                    item.lowStockThreshold
                  );
                  return (
                    <TableRow
                      key={item.variantId}
                      className="border-border hover:bg-secondary/50 transition-colors"
                    >
                      {/* Product column */}
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">
                            {item.product.name}
                          </p>
                          {!item.isDefault && item.name && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {item.name}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* SKU column */}
                      <TableCell>
                        {item.sku ? (
                          <span className="font-mono text-sm text-muted-foreground">
                            {item.sku}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground/50">
                            —
                          </span>
                        )}
                      </TableCell>

                      {/* Price column */}
                      <TableCell>
                        <span className="text-sm text-foreground">
                          {formatPrice(item.price)}
                        </span>
                      </TableCell>

                      {/* Stock column */}
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            "text-lg font-bold font-mono",
                            getStockColor(item.stock, item.lowStockThreshold)
                          )}
                        >
                          {item.stock}
                        </span>
                      </TableCell>

                      {/* Threshold column */}
                      <TableCell className="text-center text-muted-foreground">
                        {item.lowStockThreshold}
                      </TableCell>

                      {/* Status column */}
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>

                      {/* Actions column */}
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openUpdateDialog(item)}
                          className="border-border"
                        >
                          Update
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Update Stock Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Update Stock</DialogTitle>
            <DialogDescription>
              {selectedItem
                ? `${selectedItem.product.name}${!selectedItem.isDefault && selectedItem.name ? ` — ${selectedItem.name}` : ""}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-5 py-2">
              {/* Current stock display */}
              <div className="rounded-xl bg-secondary border border-border p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Current Stock
                </p>
                <p
                  className={cn(
                    "text-4xl font-bold font-mono",
                    getStockColor(
                      selectedItem.stock,
                      selectedItem.lowStockThreshold
                    )
                  )}
                >
                  {selectedItem.stock}
                </p>
              </div>

              {/* Quick adjust buttons */}
              <div className="space-y-2">
                <Label className="text-foreground text-xs uppercase tracking-wider">
                  Quick Adjust
                </Label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_ADJUSTMENTS.map((adj) => (
                    <Button
                      key={adj.label}
                      variant="outline"
                      size="sm"
                      className={cn(
                        "font-mono text-xs border-border min-w-[48px]",
                        adj.value > 0
                          ? "hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30"
                          : "hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                      )}
                      onClick={() => setChangeQty(String(adj.value))}
                    >
                      {adj.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Quantity input */}
              <div className="space-y-2">
                <Label className="text-foreground">Change Quantity</Label>
                <Input
                  type="number"
                  placeholder="e.g. 5 to add, -2 to remove"
                  value={changeQty}
                  onChange={(e) => setChangeQty(e.target.value)}
                  className="bg-secondary border-border font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Positive to add, negative to remove
                </p>
              </div>

              {/* Reason select */}
              <div className="space-y-2">
                <Label className="text-foreground">Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Note textarea */}
              <div className="space-y-2">
                <Label className="text-foreground">
                  Note{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  placeholder="Additional details..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="bg-secondary border-border resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={updating}
              className="border-border"
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updating}>
              {updating && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Update Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
