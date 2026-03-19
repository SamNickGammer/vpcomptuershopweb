"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPrice, cn } from "@/lib/utils/helpers";

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderAmount: number | null;
  maxDiscountAmount: number | null;
  usageLimit: number | null;
  usageCount: number;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type FormData = {
  code: string;
  description: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderAmount: string;
  maxDiscountAmount: string;
  usageLimit: string;
  validFrom: string;
  validTo: string;
  isActive: boolean;
};

const defaultFormData: FormData = {
  code: "",
  description: "",
  discountType: "percentage",
  discountValue: 0,
  minOrderAmount: "",
  maxDiscountAmount: "",
  usageLimit: "",
  validFrom: "",
  validTo: "",
  isActive: true,
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isExpired(validTo: string | null): boolean {
  if (!validTo) return false;
  return new Date(validTo) < new Date();
}

function SkeletonRow() {
  return (
    <TableRow className="border-border">
      <TableCell>
        <div className="h-4 w-24 bg-secondary rounded animate-pulse" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-32 bg-secondary rounded animate-pulse" />
      </TableCell>
      <TableCell>
        <div className="h-5 w-20 bg-secondary rounded-full animate-pulse" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-16 bg-secondary rounded animate-pulse" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-20 bg-secondary rounded animate-pulse" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-24 bg-secondary rounded animate-pulse" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-32 bg-secondary rounded animate-pulse" />
      </TableCell>
      <TableCell>
        <div className="h-5 w-16 bg-secondary rounded-full animate-pulse" />
      </TableCell>
      <TableCell>
        <div className="h-8 w-16 bg-secondary rounded animate-pulse ml-auto" />
      </TableCell>
    </TableRow>
  );
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchCoupons = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/coupons");
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Failed to load coupons");
        return;
      }
      setCoupons(json.data);
    } catch {
      toast.error("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  function openAddDialog() {
    setEditingCoupon(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  }

  function openEditDialog(coupon: Coupon) {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description || "",
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderAmount: coupon.minOrderAmount
        ? String(coupon.minOrderAmount / 100)
        : "",
      maxDiscountAmount: coupon.maxDiscountAmount
        ? String(coupon.maxDiscountAmount / 100)
        : "",
      usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : "",
      validFrom: coupon.validFrom
        ? new Date(coupon.validFrom).toISOString().slice(0, 10)
        : "",
      validTo: coupon.validTo
        ? new Date(coupon.validTo).toISOString().slice(0, 10)
        : "",
      isActive: coupon.isActive,
    });
    setDialogOpen(true);
  }

  function openDeleteDialog(coupon: Coupon) {
    setDeletingCoupon(coupon);
    setDeleteDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.code.trim()) {
      toast.error("Coupon code is required");
      return;
    }

    if (formData.discountValue <= 0) {
      toast.error("Discount value must be greater than 0");
      return;
    }

    if (
      formData.discountType === "percentage" &&
      formData.discountValue > 100
    ) {
      toast.error("Percentage discount cannot exceed 100%");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim() || null,
        discountType: formData.discountType,
        discountValue: formData.discountValue,
        minOrderAmount: formData.minOrderAmount
          ? Math.round(parseFloat(formData.minOrderAmount) * 100)
          : null,
        maxDiscountAmount: formData.maxDiscountAmount
          ? Math.round(parseFloat(formData.maxDiscountAmount) * 100)
          : null,
        usageLimit: formData.usageLimit
          ? parseInt(formData.usageLimit)
          : null,
        validFrom: formData.validFrom || null,
        validTo: formData.validTo || null,
        isActive: formData.isActive,
      };

      const isEditing = !!editingCoupon;
      const url = isEditing
        ? `/api/admin/coupons/${editingCoupon.id}`
        : "/api/admin/coupons";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.error || "Failed to save coupon");
        return;
      }

      toast.success(isEditing ? "Coupon updated" : "Coupon created");
      setDialogOpen(false);
      setFormData(defaultFormData);
      setEditingCoupon(null);
      await fetchCoupons();
    } catch {
      toast.error("Failed to save coupon");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingCoupon) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/coupons/${deletingCoupon.id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.error || "Failed to delete coupon");
        return;
      }

      toast.success("Coupon deleted");
      setDeleteDialogOpen(false);
      setDeletingCoupon(null);
      await fetchCoupons();
    } catch {
      toast.error("Failed to delete coupon");
    } finally {
      setDeleting(false);
    }
  }

  function getStatusBadge(coupon: Coupon) {
    if (!coupon.isActive) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    if (isExpired(coupon.validTo)) {
      return <Badge variant="warning">Expired</Badge>;
    }
    return <Badge variant="success">Active</Badge>;
  }

  function renderDiscountValue(coupon: Coupon) {
    if (coupon.discountType === "percentage") {
      return `${coupon.discountValue}%`;
    }
    return formatPrice(coupon.discountValue * 100);
  }

  function renderUsage(coupon: Coupon) {
    if (coupon.usageLimit) {
      return `${coupon.usageCount}/${coupon.usageLimit}`;
    }
    return coupon.usageCount > 0
      ? `${coupon.usageCount} / Unlimited`
      : "Unlimited";
  }

  function renderValidPeriod(coupon: Coupon) {
    if (!coupon.validFrom && !coupon.validTo) return "Always";
    return `${formatDate(coupon.validFrom)} - ${formatDate(coupon.validTo)}`;
  }

  const tableHeaders = (
    <TableRow className="border-border hover:bg-transparent">
      <TableHead className="text-muted-foreground">Code</TableHead>
      <TableHead className="text-muted-foreground">Description</TableHead>
      <TableHead className="text-muted-foreground">Type</TableHead>
      <TableHead className="text-muted-foreground">Value</TableHead>
      <TableHead className="text-muted-foreground">Min Order</TableHead>
      <TableHead className="text-muted-foreground">Usage</TableHead>
      <TableHead className="text-muted-foreground">Valid Period</TableHead>
      <TableHead className="text-muted-foreground">Status</TableHead>
      <TableHead className="text-right text-muted-foreground">
        Actions
      </TableHead>
    </TableRow>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-end">
        <Button
          onClick={openAddDialog}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Coupon
        </Button>
      </div>

      {/* Coupons Table */}
      <Card className="bg-card border-border rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">
            All Coupons
            {!loading && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({coupons.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Table>
              <TableHeader>{tableHeaders}</TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </TableBody>
            </Table>
          ) : coupons.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-secondary rounded-full p-4 w-fit mx-auto mb-4">
                <Ticket className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-foreground font-medium">No coupons yet</p>
              <p className="text-muted-foreground text-sm mt-1">
                Create your first coupon to offer discounts to customers.
              </p>
              <Button
                onClick={openAddDialog}
                className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Create Coupon
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>{tableHeaders}</TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <TableRow key={coupon.id} className="border-border">
                    <TableCell className="font-mono text-sm font-medium text-primary uppercase">
                      {coupon.code}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {coupon.description || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={coupon.discountType === "percentage" ? "info" : "purple"}>
                        {coupon.discountType === "percentage"
                          ? "Percentage"
                          : "Fixed"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground font-medium">
                      {renderDiscountValue(coupon)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {coupon.minOrderAmount
                        ? formatPrice(coupon.minOrderAmount)
                        : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {renderUsage(coupon)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {renderValidPeriod(coupon)}
                    </TableCell>
                    <TableCell>{getStatusBadge(coupon)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                          onClick={() => openEditDialog(coupon)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => openDeleteDialog(coupon)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Coupon Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingCoupon ? "Edit Coupon" : "Create Coupon"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editingCoupon
                ? "Update the coupon details below."
                : "Fill in the details to create a new coupon."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Code */}
            <div className="space-y-2">
              <Label htmlFor="code" className="text-foreground">
                Coupon Code <span className="text-red-400">*</span>
              </Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    code: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="e.g. SAVE20, WELCOME10"
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground font-mono uppercase"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Optional description for this coupon"
                rows={2}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground resize-none"
              />
            </div>

            {/* Discount Type */}
            <div className="space-y-2">
              <Label className="text-foreground">Discount Type</Label>
              <Select
                value={formData.discountType}
                onValueChange={(value: "percentage" | "fixed") =>
                  setFormData((prev) => ({ ...prev, discountType: value }))
                }
              >
                <SelectTrigger className="bg-secondary border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Discount Value */}
            <div className="space-y-2">
              <Label htmlFor="discountValue" className="text-foreground">
                Discount Value <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                {formData.discountType === "fixed" && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    ₹
                  </span>
                )}
                <Input
                  id="discountValue"
                  type="number"
                  min={0}
                  max={formData.discountType === "percentage" ? 100 : undefined}
                  step={formData.discountType === "percentage" ? 1 : 0.01}
                  value={formData.discountValue || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      discountValue: parseFloat(e.target.value) || 0,
                    }))
                  }
                  placeholder={
                    formData.discountType === "percentage" ? "10" : "500"
                  }
                  className={cn(
                    "bg-secondary border-border text-foreground placeholder:text-muted-foreground",
                    formData.discountType === "fixed" && "pl-7"
                  )}
                />
                {formData.discountType === "percentage" && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    %
                  </span>
                )}
              </div>
            </div>

            {/* Min Order Amount */}
            <div className="space-y-2">
              <Label htmlFor="minOrderAmount" className="text-foreground">
                Minimum Order Amount
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  ₹
                </span>
                <Input
                  id="minOrderAmount"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.minOrderAmount}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      minOrderAmount: e.target.value,
                    }))
                  }
                  placeholder="No minimum"
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground pl-7"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty for no minimum order requirement.
              </p>
            </div>

            {/* Max Discount Amount — only for percentage */}
            {formData.discountType === "percentage" && (
              <div className="space-y-2">
                <Label htmlFor="maxDiscountAmount" className="text-foreground">
                  Max Discount Cap
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    ₹
                  </span>
                  <Input
                    id="maxDiscountAmount"
                    type="number"
                    min={0}
                    step={0.01}
                    value={formData.maxDiscountAmount}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        maxDiscountAmount: e.target.value,
                      }))
                    }
                    placeholder="No cap"
                    className="bg-secondary border-border text-foreground placeholder:text-muted-foreground pl-7"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Maximum discount amount in rupees. Leave empty for no cap.
                </p>
              </div>
            )}

            {/* Usage Limit */}
            <div className="space-y-2">
              <Label htmlFor="usageLimit" className="text-foreground">
                Usage Limit
              </Label>
              <Input
                id="usageLimit"
                type="number"
                min={1}
                value={formData.usageLimit}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    usageLimit: e.target.value,
                  }))
                }
                placeholder="Unlimited"
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground w-40"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for unlimited usage.
              </p>
            </div>

            {/* Valid From / To */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="validFrom" className="text-foreground">
                  Valid From
                </Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      validFrom: e.target.value,
                    }))
                  }
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validTo" className="text-foreground">
                  Valid To
                </Label>
                <Input
                  id="validTo"
                  type="date"
                  value={formData.validTo}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      validTo: e.target.value,
                    }))
                  }
                  className="bg-secondary border-border text-foreground"
                />
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/50 p-4">
              <div>
                <Label
                  htmlFor="isActive"
                  className="cursor-pointer text-foreground"
                >
                  Active
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Inactive coupons cannot be applied at checkout
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isActive: checked }))
                }
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
                className="border-border text-foreground hover:bg-secondary"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingCoupon ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Delete Coupon
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to delete coupon{" "}
              <span className="font-semibold text-foreground font-mono">
                {deletingCoupon?.code}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
              className="border-border text-foreground hover:bg-secondary"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
