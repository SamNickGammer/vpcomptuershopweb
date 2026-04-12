"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  X,
  UploadCloud,
  Loader2,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatPrice } from "@/lib/utils/helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// ── Types ────────────────────────────────────────────────────────────────────

type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
};

type ImageEntry = {
  id: string;
  url: string;
  altText: string;
};

type SpecEntry = {
  id: string;
  key: string;
  value: string;
};

type BulkPricingTierEntry = {
  id: string;
  minQuantity: string;
  unitPrice: string;
  freeShipping: boolean;
  label: string;
};

type VariantEntry = {
  id: string;
  name: string;
  displayName: string;
  label: string;
  description: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  images: ImageEntry[];
  specs: SpecEntry[];
  bulkPricing: BulkPricingTierEntry[];
  isActive: boolean;
  isDefault: boolean;
};

const COMMON_SPECS = [
  "RAM",
  "Processor",
  "Storage",
  "Display",
  "Graphics",
  "Battery",
  "OS",
  "Weight",
  "Warranty",
  "Ports",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

function generateSku() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "VP-";
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function makeDefaultVariant(): VariantEntry {
  return {
    id: generateId(),
    name: "Default",
    displayName: "",
    label: "",
    description: "",
    sku: generateSku(),
    price: "",
    compareAtPrice: "",
    stock: "0",
    images: [],
    specs: [],
    bulkPricing: [],
    isActive: true,
    isDefault: true,
  };
}

// ── Component ────────────────────────────────────────────────────────────────

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const router = useRouter();

  // Loading
  const [loading, setLoading] = useState(true);

  // Categories
  const [categories, setCategories] = useState<Category[]>([]);

  // Product Details
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [condition, setCondition] = useState<string>("new");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [shippingWeightGrams, setShippingWeightGrams] = useState("0");
  const [shippingLengthCm, setShippingLengthCm] = useState("0");
  const [shippingBreadthCm, setShippingBreadthCm] = useState("0");
  const [shippingHeightCm, setShippingHeightCm] = useState("0");

  // Variants
  const [variants, setVariants] = useState<VariantEntry[]>([]);
  const [expandedVariants, setExpandedVariants] = useState<Set<string>>(
    new Set()
  );
  const [variantImageUrls, setVariantImageUrls] = useState<
    Record<string, string>
  >({});
  const [variantUploading, setVariantUploading] = useState<
    Record<string, boolean>
  >({});

  // Track which variants have had their displayName manually edited
  const [displayNameManual, setDisplayNameManual] = useState<
    Record<string, boolean>
  >({});

  // Submit & Delete
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Auto-update displayName when product name changes ─────────────────────

  const updateDisplayNames = useCallback(
    (productName: string, variantList: VariantEntry[]) => {
      return variantList.map((v) => {
        if (displayNameManual[v.id]) return v;
        return {
          ...v,
          displayName: `${productName} ${v.name}`.trim(),
        };
      });
    },
    [displayNameManual]
  );

  const handleNameChange = (newName: string) => {
    setName(newName);
    setVariants((prev) => updateDisplayNames(newName, prev));
  };

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/categories");
      const json = await res.json();
      if (json.success) {
        setCategories(json.data);
      }
    } catch {
      // Non-critical
    }
  }, []);

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`);
      const json = await res.json();
      if (json.success) {
        const p = json.data;
        setName(p.name);
        setDescription(p.description || "");
        setCategoryId(p.categoryId || "");
        setCondition(p.condition);
        setIsFeatured(p.isFeatured);
        setIsActive(p.isActive);
        setShippingWeightGrams(String(p.shippingWeightGrams || 0));
        setShippingLengthCm(String(p.shippingDimensions?.lengthCm || 0));
        setShippingBreadthCm(String(p.shippingDimensions?.breadthCm || 0));
        setShippingHeightCm(String(p.shippingDimensions?.heightCm || 0));

        // Variants
        const loadedVariants: VariantEntry[] = (p.variants || []).map(
          (v: {
            variantId: string;
            name: string;
            displayName?: string;
            label?: string;
            description?: string;
            sku: string;
            price: number;
            compareAtPrice?: number | null;
            images: Array<{ url: string; altText?: string }>;
            specs: Array<{ key: string; value: string }>;
            bulkPricing?: Array<{
              minQuantity: number;
              unitPrice: number;
              freeShipping?: boolean;
              label?: string;
            }>;
            stock: number;
            isDefault?: boolean;
            isActive?: boolean;
          }) => ({
            id: v.variantId || generateId(),
            name: v.name,
            displayName: v.displayName || "",
            label: v.label || "",
            description: v.description || "",
            sku: v.sku,
            price: String(v.price / 100),
            compareAtPrice: v.compareAtPrice
              ? String(v.compareAtPrice / 100)
              : "",
            stock: String(v.stock),
            images: (v.images || []).map(
              (img: { url: string; altText?: string }) => ({
                id: generateId(),
                url: img.url,
                altText: img.altText || "",
              })
            ),
            specs: (v.specs || []).map(
              (s: { key: string; value: string }) => ({
                id: generateId(),
                key: s.key,
                value: s.value,
              })
            ),
            bulkPricing: (v.bulkPricing || []).map(
              (tier: {
                minQuantity: number;
                unitPrice: number;
                freeShipping?: boolean;
                label?: string;
              }) => ({
                id: generateId(),
                minQuantity: String(tier.minQuantity),
                unitPrice: String(tier.unitPrice / 100),
                freeShipping: tier.freeShipping ?? false,
                label: tier.label || "",
              })
            ),
            isActive: v.isActive ?? true,
            isDefault: v.isDefault ?? false,
          })
        );

        // If no variants were loaded, create a default variant from product-level data
        if (loadedVariants.length === 0) {
          const defaultVariant = makeDefaultVariant();
          defaultVariant.price = String(p.basePrice / 100);
          defaultVariant.compareAtPrice = p.compareAtPrice
            ? String(p.compareAtPrice / 100)
            : "";
          defaultVariant.stock = String(p.stock);
          defaultVariant.displayName = p.name;
          defaultVariant.sku = p.sku || defaultVariant.sku;
          defaultVariant.images = (p.images || []).map(
            (img: { url: string; altText?: string }) => ({
              id: generateId(),
              url: img.url,
              altText: img.altText || "",
            })
          );
          defaultVariant.specs = (p.specs || []).map(
            (s: { key: string; value: string }) => ({
              id: generateId(),
              key: s.key,
              value: s.value,
            })
          );
          defaultVariant.bulkPricing = (p.bulkPricing || []).map(
            (tier: {
              minQuantity: number;
              unitPrice: number;
              freeShipping?: boolean;
              label?: string;
            }) => ({
              id: generateId(),
              minQuantity: String(tier.minQuantity),
              unitPrice: String(tier.unitPrice / 100),
              freeShipping: tier.freeShipping ?? false,
              label: tier.label || "",
            })
          );
          loadedVariants.push(defaultVariant);
        }

        // Ensure at least one variant is marked as default
        if (!loadedVariants.some((v) => v.isDefault)) {
          loadedVariants[0].isDefault = true;
        }

        setVariants(loadedVariants);
        setExpandedVariants(new Set([loadedVariants[0].id]));

        // Mark all loaded variants as having manually set displayNames
        // (since they come from DB, we don't want auto-update to overwrite them)
        const manualMap: Record<string, boolean> = {};
        for (const v of loadedVariants) {
          if (v.displayName) {
            manualMap[v.id] = true;
          }
        }
        setDisplayNameManual(manualMap);
      } else {
        toast.error(json.error || "Product not found");
        router.push("/admin/products");
      }
    } catch {
      toast.error("Failed to load product");
      router.push("/admin/products");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchCategories();
    fetchProduct();
  }, [fetchCategories, fetchProduct]);

  // ── Variant Handlers ───────────────────────────────────────────────────────

  const toggleExpanded = (variantId: string) => {
    setExpandedVariants((prev) => {
      const next = new Set(prev);
      if (next.has(variantId)) next.delete(variantId);
      else next.add(variantId);
      return next;
    });
  };

  const handleAddVariant = () => {
    const newVariant: VariantEntry = {
      id: generateId(),
      name: "",
      displayName: name.trim(),
      label: "",
      description: "",
      sku: generateSku(),
      price: "",
      compareAtPrice: "",
      stock: "0",
      images: [],
      specs: [],
      bulkPricing: [],
      isActive: true,
      isDefault: false,
    };
    setVariants((prev) => [...prev, newVariant]);
    setExpandedVariants((prev) => new Set(prev).add(newVariant.id));
  };

  const handleRemoveVariant = (variantId: string) => {
    const variant = variants.find((v) => v.id === variantId);
    if (variant?.isDefault) {
      toast.error("Cannot remove the default variant");
      return;
    }
    setVariants((prev) => prev.filter((v) => v.id !== variantId));
    setExpandedVariants((prev) => {
      const next = new Set(prev);
      next.delete(variantId);
      return next;
    });
  };

  const handleVariantChange = (
    variantId: string,
    field: keyof VariantEntry,
    value: string | boolean
  ) => {
    setVariants((prev) =>
      prev.map((v) => {
        if (v.id !== variantId) return v;
        const updated = { ...v, [field]: value };
        // Auto-update displayName when variant name changes
        if (field === "name" && !displayNameManual[variantId]) {
          updated.displayName = `${name} ${value as string}`.trim();
        }
        return updated;
      })
    );
  };

  const handleDisplayNameChange = (variantId: string, value: string) => {
    setDisplayNameManual((prev) => ({ ...prev, [variantId]: true }));
    setVariants((prev) =>
      prev.map((v) =>
        v.id === variantId ? { ...v, displayName: value } : v
      )
    );
  };

  const handleAutoDisplayName = (variantId: string) => {
    setDisplayNameManual((prev) => ({ ...prev, [variantId]: false }));
    setVariants((prev) =>
      prev.map((v) =>
        v.id === variantId
          ? { ...v, displayName: `${name} ${v.name}`.trim() }
          : v
      )
    );
  };

  // Variant image handlers
  const handleVariantImageUpload = async (
    variantId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setVariantUploading((prev) => ({ ...prev, [variantId]: true }));
    const newImages: ImageEntry[] = [];

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });
        const json = await res.json();
        if (json.success) {
          newImages.push({
            id: generateId(),
            url: json.data.url,
            altText: "",
          });
        } else {
          toast.error(`Failed to upload ${file.name}: ${json.error}`);
        }
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setVariants((prev) =>
      prev.map((v) =>
        v.id === variantId
          ? { ...v, images: [...v.images, ...newImages] }
          : v
      )
    );
    setVariantUploading((prev) => ({ ...prev, [variantId]: false }));
    e.target.value = "";
  };

  const handleAddVariantImageUrl = (variantId: string) => {
    const url = (variantImageUrls[variantId] || "").trim();
    if (!url) return;
    try {
      new URL(url);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }
    setVariants((prev) =>
      prev.map((v) =>
        v.id === variantId
          ? {
              ...v,
              images: [...v.images, { id: generateId(), url, altText: "" }],
            }
          : v
      )
    );
    setVariantImageUrls((prev) => ({ ...prev, [variantId]: "" }));
  };

  const handleRemoveVariantImage = (variantId: string, imageId: string) => {
    setVariants((prev) =>
      prev.map((v) =>
        v.id === variantId
          ? { ...v, images: v.images.filter((img) => img.id !== imageId) }
          : v
      )
    );
  };

  // Variant spec handlers
  const handleAddVariantSpec = (
    variantId: string,
    key = "",
    value = ""
  ) => {
    setVariants((prev) =>
      prev.map((v) =>
        v.id === variantId
          ? {
              ...v,
              specs: [...v.specs, { id: generateId(), key, value }],
            }
          : v
      )
    );
  };

  const handleRemoveVariantSpec = (variantId: string, specId: string) => {
    setVariants((prev) =>
      prev.map((v) =>
        v.id === variantId
          ? { ...v, specs: v.specs.filter((s) => s.id !== specId) }
          : v
      )
    );
  };

  const handleVariantSpecChange = (
    variantId: string,
    specId: string,
    field: "key" | "value",
    val: string
  ) => {
    setVariants((prev) =>
      prev.map((v) =>
        v.id === variantId
          ? {
              ...v,
              specs: v.specs.map((s) =>
                s.id === specId ? { ...s, [field]: val } : s
              ),
            }
          : v
      )
    );
  };

  const handleAddBulkPricingTier = (variantId: string) => {
    setVariants((prev) =>
      prev.map((v) =>
        v.id === variantId
          ? {
              ...v,
              bulkPricing: [
                ...v.bulkPricing,
                {
                  id: generateId(),
                  minQuantity: "",
                  unitPrice: "",
                  freeShipping: false,
                  label: "",
                },
              ],
            }
          : v
      )
    );
  };

  const handleRemoveBulkPricingTier = (variantId: string, tierId: string) => {
    setVariants((prev) =>
      prev.map((v) =>
        v.id === variantId
          ? {
              ...v,
              bulkPricing: v.bulkPricing.filter((tier) => tier.id !== tierId),
            }
          : v
      )
    );
  };

  const handleBulkPricingTierChange = (
    variantId: string,
    tierId: string,
    field: keyof BulkPricingTierEntry,
    value: string | boolean
  ) => {
    setVariants((prev) =>
      prev.map((v) =>
        v.id === variantId
          ? {
              ...v,
              bulkPricing: v.bulkPricing.map((tier) =>
                tier.id === tierId ? { ...tier, [field]: value } : tier
              ),
            }
          : v
      )
    );
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!condition) {
      toast.error("Please select a condition");
      return;
    }

    // Find default variant
    const defaultVariant = variants.find((v) => v.isDefault);
    if (!defaultVariant) {
      toast.error("A default variant is required");
      return;
    }

    if (!defaultVariant.price || Number(defaultVariant.price) <= 0) {
      toast.error("Default variant requires a valid price");
      return;
    }

    for (const v of variants) {
      if (!v.name.trim()) {
        toast.error("All variants must have a name");
        return;
      }
      if (!v.sku.trim()) {
        toast.error(`Variant "${v.name}" must have a SKU`);
        return;
      }
      if (!v.price || Number(v.price) <= 0) {
        toast.error(`Variant "${v.name}" requires a valid price`);
        return;
      }
      for (const s of v.specs) {
        if (!s.key.trim() || !s.value.trim()) {
          toast.error(
            `Variant "${v.name}": all specs must have both key and value`
          );
          return;
        }
      }
      for (const tier of v.bulkPricing) {
        if (!tier.minQuantity || Number(tier.minQuantity) < 2) {
          toast.error(`Variant "${v.name}": bulk tier quantity must be at least 2`);
          return;
        }
        if (!tier.unitPrice || Number(tier.unitPrice) < 0) {
          toast.error(`Variant "${v.name}": bulk tier price is required`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      // Set product-level basePrice, images, specs, stock from default variant
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        categoryId: categoryId || null,
        condition,
        sku: defaultVariant.sku.trim() || undefined,
        basePrice: Math.round(Number(defaultVariant.price) * 100),
        compareAtPrice: defaultVariant.compareAtPrice
          ? Math.round(Number(defaultVariant.compareAtPrice) * 100)
          : null,
        images: defaultVariant.images.map((img) => ({
          url: img.url,
          altText: img.altText || undefined,
        })),
        specs: defaultVariant.specs.map((s) => ({
          key: s.key.trim(),
          value: s.value.trim(),
        })),
        bulkPricing: defaultVariant.bulkPricing.map((tier) => ({
          minQuantity: Math.max(2, Math.round(Number(tier.minQuantity) || 0)),
          unitPrice: Math.max(0, Math.round(Number(tier.unitPrice) * 100)),
          freeShipping: tier.freeShipping,
          label: tier.label.trim(),
        })),
        shippingWeightGrams: Math.max(0, Math.round(Number(shippingWeightGrams) || 0)),
        shippingDimensions: {
          lengthCm: Math.max(0, Math.round(Number(shippingLengthCm) || 0)),
          breadthCm: Math.max(0, Math.round(Number(shippingBreadthCm) || 0)),
          heightCm: Math.max(0, Math.round(Number(shippingHeightCm) || 0)),
        },
        stock: parseInt(defaultVariant.stock) || 0,
        lowStockThreshold: 2,
        variants: variants.map((v) => ({
          variantId: v.id,
          name: v.name.trim(),
          displayName: v.displayName.trim() || `${name.trim()} ${v.name.trim()}`.trim(),
          label: v.label.trim(),
          description: v.description.trim(),
          sku: v.sku.trim(),
          price: Math.round(Number(v.price) * 100),
          compareAtPrice: v.compareAtPrice
            ? Math.round(Number(v.compareAtPrice) * 100)
            : null,
          images: v.images.map((img) => ({
            url: img.url,
            altText: img.altText || undefined,
          })),
          specs: v.specs.map((s) => ({
            key: s.key.trim(),
            value: s.value.trim(),
          })),
          bulkPricing: v.bulkPricing.map((tier) => ({
            minQuantity: Math.max(2, Math.round(Number(tier.minQuantity) || 0)),
            unitPrice: Math.max(0, Math.round(Number(tier.unitPrice) * 100)),
            freeShipping: tier.freeShipping,
            label: tier.label.trim(),
          })),
          stock: parseInt(v.stock) || 0,
          isDefault: v.isDefault,
          isActive: v.isActive,
        })),
        isFeatured,
        isActive,
      };

      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (json.success) {
        toast.success("Product updated successfully");
        router.push("/admin/products");
      } else {
        toast.error(json.error || "Failed to update product");
      }
    } catch {
      toast.error("Failed to update product");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Product deleted successfully");
        router.push("/admin/products");
      } else {
        toast.error(json.error || "Failed to delete product");
      }
    } catch {
      toast.error("Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  // ── Loading State ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-9 w-9 animate-pulse rounded-lg bg-secondary" />
          <div className="space-y-2">
            <div className="h-6 w-40 animate-pulse rounded bg-secondary" />
            <div className="h-4 w-64 animate-pulse rounded bg-secondary" />
          </div>
        </div>
        <div className="h-80 animate-pulse rounded-xl bg-secondary" />
        <div className="h-40 animate-pulse rounded-xl bg-secondary" />
        <div className="h-60 animate-pulse rounded-xl bg-secondary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-9 w-9 rounded-lg border border-border hover:bg-secondary"
          >
            <Link href="/admin/products">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Edit Product
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{name}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
          className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>

      <div className="space-y-6">
        {/* ── Section 1: Product Details ─────────────────────────────────── */}
        <Card className="bg-card rounded-xl border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-foreground">Product Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">
                Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Dell Latitude E7470 Laptop"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="bg-secondary border-border rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Describe the product in detail..."
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-secondary border-border rounded-lg resize-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-foreground">Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="bg-secondary border-border rounded-lg">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">
                  Condition <span className="text-red-400">*</span>
                </Label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger className="bg-secondary border-border rounded-lg">
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="refurbished">Refurbished</SelectItem>
                    <SelectItem value="used">Used</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="featured"
                  checked={isFeatured}
                  onCheckedChange={setIsFeatured}
                />
                <Label htmlFor="featured" className="text-foreground cursor-pointer text-sm">
                  Featured
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="active" className="text-foreground cursor-pointer text-sm">
                  Active
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card rounded-xl border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-foreground">Shipping Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <p className="text-sm text-muted-foreground">
              These values are used during checkout to estimate Shiprocket charges before payment.
            </p>
            <div className="space-y-2">
              <Label htmlFor="shippingWeightGrams" className="text-foreground">
                Packed Weight (grams)
              </Label>
              <Input
                id="shippingWeightGrams"
                type="number"
                min="0"
                value={shippingWeightGrams}
                onChange={(e) => setShippingWeightGrams(e.target.value)}
                className="bg-secondary border-border rounded-lg"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="shippingLengthCm" className="text-foreground">
                  Length (cm)
                </Label>
                <Input
                  id="shippingLengthCm"
                  type="number"
                  min="0"
                  value={shippingLengthCm}
                  onChange={(e) => setShippingLengthCm(e.target.value)}
                  className="bg-secondary border-border rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shippingBreadthCm" className="text-foreground">
                  Breadth (cm)
                </Label>
                <Input
                  id="shippingBreadthCm"
                  type="number"
                  min="0"
                  value={shippingBreadthCm}
                  onChange={(e) => setShippingBreadthCm(e.target.value)}
                  className="bg-secondary border-border rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shippingHeightCm" className="text-foreground">
                  Height (cm)
                </Label>
                <Input
                  id="shippingHeightCm"
                  type="number"
                  min="0"
                  value={shippingHeightCm}
                  onChange={(e) => setShippingHeightCm(e.target.value)}
                  className="bg-secondary border-border rounded-lg"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 2: Variants ────────────────────────────────────────── */}
        <Card className="bg-card rounded-xl border-border">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-foreground">
                  Variants{" "}
                  <Badge
                    variant="outline"
                    className="ml-2 text-xs bg-primary/10 text-primary border-primary/20"
                  >
                    {variants.length}
                  </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Every product has at least one variant (Default). Add more for different configurations.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleAddVariant}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                Add Variant
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-4">
            <div className="space-y-4">
              {variants.map((variant) => {
                const isExpanded = expandedVariants.has(variant.id);
                return (
                  <Card
                    key={variant.id}
                    className="bg-secondary/30 rounded-lg border-border overflow-hidden"
                  >
                    {/* Variant header */}
                    <div
                      className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-secondary/50 transition-colors"
                      onClick={() => toggleExpanded(variant.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {variant.isDefault && (
                          <Badge
                            variant="outline"
                            className="text-[10px] shrink-0 bg-blue-500/10 text-blue-400 border-blue-500/20"
                          >
                            Default
                          </Badge>
                        )}
                        <span className="font-medium text-foreground truncate">
                          {variant.name || "Unnamed Variant"}
                        </span>
                        {variant.label && (
                          <Badge
                            variant="outline"
                            className="text-[10px] shrink-0 bg-violet-500/10 text-violet-400 border-violet-500/20"
                          >
                            {variant.label}
                          </Badge>
                        )}
                        {variant.price && (
                          <span className="text-sm text-muted-foreground font-mono shrink-0">
                            {formatPrice(Number(variant.price) * 100)}
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] shrink-0",
                            parseInt(variant.stock) === 0
                              ? "bg-red-500/10 text-red-400 border-red-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          )}
                        >
                          {variant.stock || "0"} in stock
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Switch
                            checked={variant.isActive}
                            onCheckedChange={(checked) =>
                              handleVariantChange(
                                variant.id,
                                "isActive",
                                checked
                              )
                            }
                          />
                          <span className="text-xs text-muted-foreground">
                            {variant.isActive ? "Active" : "Off"}
                          </span>
                        </div>
                        {!variant.isDefault && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveVariant(variant.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="border-t border-border px-5 py-5 space-y-6">
                        {/* Row 1: Label, Name */}
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">
                              Label
                            </Label>
                            <Input
                              placeholder='e.g., "Storage", "Color", "Configuration"'
                              value={variant.label}
                              onChange={(e) =>
                                handleVariantChange(
                                  variant.id,
                                  "label",
                                  e.target.value
                                )
                              }
                              className="bg-secondary border-border rounded-lg"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">
                              Name <span className="text-red-400">*</span>
                            </Label>
                            <Input
                              placeholder="e.g., 32GB"
                              value={variant.name}
                              onChange={(e) =>
                                handleVariantChange(
                                  variant.id,
                                  "name",
                                  e.target.value
                                )
                              }
                              className="bg-secondary border-border rounded-lg"
                            />
                          </div>
                        </div>

                        {/* Row 2: Display Name */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">
                            Display Name
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="Full name shown on storefront"
                              value={variant.displayName}
                              onChange={(e) =>
                                handleDisplayNameChange(
                                  variant.id,
                                  e.target.value
                                )
                              }
                              className="bg-secondary border-border rounded-lg flex-1"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="border-border hover:bg-secondary shrink-0 text-xs h-9"
                              onClick={() => handleAutoDisplayName(variant.id)}
                              title="Auto-generate from product name + variant name"
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Auto
                            </Button>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Auto-filled as &ldquo;Product Name + Variant Name&rdquo;. Edit to customize.
                          </p>
                        </div>

                        {/* Row 3: Description */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">
                            Description
                          </Label>
                          <Textarea
                            placeholder="Variant-specific description..."
                            rows={2}
                            value={variant.description}
                            onChange={(e) =>
                              handleVariantChange(
                                variant.id,
                                "description",
                                e.target.value
                              )
                            }
                            className="bg-secondary border-border rounded-lg resize-none"
                          />
                        </div>

                        {/* Row 4: SKU, Price, Compare Price, Stock */}
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">
                              SKU
                            </Label>
                            <div className="flex items-center gap-1">
                              <Input
                                placeholder="VP-XXXX"
                                value={variant.sku}
                                onChange={(e) =>
                                  handleVariantChange(
                                    variant.id,
                                    "sku",
                                    e.target.value
                                  )
                                }
                                className="bg-secondary border-border rounded-lg font-mono text-sm"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground hover:bg-secondary"
                                onClick={() =>
                                  handleVariantChange(
                                    variant.id,
                                    "sku",
                                    generateSku()
                                  )
                                }
                                title="Auto-generate SKU"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">
                              Price (&#8377;){" "}
                              <span className="text-red-400">*</span>
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="25000"
                              value={variant.price}
                              onChange={(e) =>
                                handleVariantChange(
                                  variant.id,
                                  "price",
                                  e.target.value
                                )
                              }
                              className="bg-secondary border-border rounded-lg font-mono text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">
                              Compare (&#8377;)
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="30000"
                              value={variant.compareAtPrice}
                              onChange={(e) =>
                                handleVariantChange(
                                  variant.id,
                                  "compareAtPrice",
                                  e.target.value
                                )
                              }
                              className="bg-secondary border-border rounded-lg font-mono text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">
                              Stock
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              value={variant.stock}
                              onChange={(e) =>
                                handleVariantChange(
                                  variant.id,
                                  "stock",
                                  e.target.value
                                )
                              }
                              className="bg-secondary border-border rounded-lg font-mono text-sm"
                            />
                          </div>
                        </div>

                        <Separator className="bg-border" />

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-medium text-foreground">
                                Bulk Pricing
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                Add quantity-based per-piece pricing and optional free shipping for large orders.
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddBulkPricingTier(variant.id)}
                              className="border-border hover:bg-secondary"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add Tier
                            </Button>
                          </div>

                          {variant.bulkPricing.length > 0 ? (
                            <div className="space-y-3">
                              {variant.bulkPricing.map((tier) => (
                                <div
                                  key={tier.id}
                                  className="rounded-lg border border-border bg-secondary/40 p-4"
                                >
                                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    <div className="space-y-2">
                                      <Label className="text-xs text-muted-foreground">
                                        Minimum Qty
                                      </Label>
                                      <Input
                                        type="number"
                                        min="2"
                                        value={tier.minQuantity}
                                        onChange={(e) =>
                                          handleBulkPricingTierChange(
                                            variant.id,
                                            tier.id,
                                            "minQuantity",
                                            e.target.value
                                          )
                                        }
                                        className="bg-secondary border-border rounded-lg font-mono text-sm"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-xs text-muted-foreground">
                                        Unit Price (&#8377;)
                                      </Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={tier.unitPrice}
                                        onChange={(e) =>
                                          handleBulkPricingTierChange(
                                            variant.id,
                                            tier.id,
                                            "unitPrice",
                                            e.target.value
                                          )
                                        }
                                        className="bg-secondary border-border rounded-lg font-mono text-sm"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-xs text-muted-foreground">
                                        Label
                                      </Label>
                                      <Input
                                        placeholder="Dealer offer"
                                        value={tier.label}
                                        onChange={(e) =>
                                          handleBulkPricingTierChange(
                                            variant.id,
                                            tier.id,
                                            "label",
                                            e.target.value
                                          )
                                        }
                                        className="bg-secondary border-border rounded-lg text-sm"
                                      />
                                    </div>
                                    <div className="flex items-end justify-between gap-3">
                                      <div className="flex items-center gap-2 pb-2">
                                        <Switch
                                          checked={tier.freeShipping}
                                          onCheckedChange={(checked) =>
                                            handleBulkPricingTierChange(
                                              variant.id,
                                              tier.id,
                                              "freeShipping",
                                              checked
                                            )
                                          }
                                        />
                                        <Label className="text-xs text-foreground cursor-pointer">
                                          Free Shipping
                                        </Label>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                                        onClick={() =>
                                          handleRemoveBulkPricingTier(
                                            variant.id,
                                            tier.id
                                          )
                                        }
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              No bulk pricing tiers configured for this variant.
                            </p>
                          )}
                        </div>

                        <Separator className="bg-border" />

                        {/* Variant Images */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium text-foreground">
                            Images
                          </h4>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <label
                              htmlFor={`variant-upload-${variant.id}`}
                              className={cn(
                                "flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-secondary/50",
                                variantUploading[variant.id] &&
                                  "pointer-events-none opacity-50"
                              )}
                            >
                              {variantUploading[variant.id] ? (
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              ) : (
                                <UploadCloud className="h-6 w-6 text-muted-foreground" />
                              )}
                              <p className="mt-2 text-xs font-medium text-foreground">
                                {variantUploading[variant.id]
                                  ? "Uploading..."
                                  : "Upload Images"}
                              </p>
                            </label>
                            <input
                              id={`variant-upload-${variant.id}`}
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e) =>
                                handleVariantImageUpload(variant.id, e)
                              }
                              disabled={variantUploading[variant.id]}
                            />

                            <div className="flex flex-col justify-center space-y-2">
                              <p className="text-xs text-muted-foreground">
                                Or add by URL
                              </p>
                              <div className="flex items-center gap-2">
                                <Input
                                  placeholder="https://example.com/image.jpg"
                                  value={
                                    variantImageUrls[variant.id] || ""
                                  }
                                  onChange={(e) =>
                                    setVariantImageUrls((prev) => ({
                                      ...prev,
                                      [variant.id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleAddVariantImageUrl(variant.id);
                                    }
                                  }}
                                  className="bg-secondary border-border rounded-lg text-sm"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleAddVariantImageUrl(variant.id)
                                  }
                                  className="border-border hover:bg-secondary shrink-0"
                                >
                                  Add
                                </Button>
                              </div>
                            </div>
                          </div>

                          {variant.images.length > 0 && (
                            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                              {variant.images.map((img) => (
                                <div
                                  key={img.id}
                                  className="rounded-lg overflow-hidden border border-border relative group"
                                >
                                  <div className="relative aspect-square">
                                    <Image
                                      src={img.url}
                                      alt={img.altText || "Variant image"}
                                      fill
                                      className="object-cover"
                                      sizes="100px"
                                    />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-red-500/50 hover:text-white"
                                        onClick={() =>
                                          handleRemoveVariantImage(
                                            variant.id,
                                            img.id
                                          )
                                        }
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <Separator className="bg-border" />

                        {/* Variant Specs */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-foreground">
                              Specifications
                            </h4>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleAddVariantSpec(variant.id)
                              }
                              className="border-border hover:bg-secondary h-8 text-xs"
                            >
                              <Plus className="h-3 w-3" />
                              Add Spec
                            </Button>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {COMMON_SPECS.filter(
                              (s) =>
                                !variant.specs.some((sp) => sp.key === s)
                            ).map((spec) => (
                              <Button
                                key={spec}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs border-border hover:bg-secondary hover:border-primary/50 hover:text-primary"
                                onClick={() =>
                                  handleAddVariantSpec(
                                    variant.id,
                                    spec,
                                    ""
                                  )
                                }
                              >
                                <Plus className="mr-1 h-3 w-3" />
                                {spec}
                              </Button>
                            ))}
                          </div>

                          {variant.specs.length > 0 && (
                            <div className="space-y-2">
                              {variant.specs.map((spec) => (
                                <div
                                  key={spec.id}
                                  className="flex items-center gap-2 p-2.5 rounded-lg bg-background border border-border"
                                >
                                  <Input
                                    placeholder="Key"
                                    value={spec.key}
                                    onChange={(e) =>
                                      handleVariantSpecChange(
                                        variant.id,
                                        spec.id,
                                        "key",
                                        e.target.value
                                      )
                                    }
                                    className="flex-1 bg-secondary border-border rounded-lg text-sm h-9"
                                  />
                                  <Input
                                    placeholder="Value"
                                    value={spec.value}
                                    onChange={(e) =>
                                      handleVariantSpecChange(
                                        variant.id,
                                        spec.id,
                                        "value",
                                        e.target.value
                                      )
                                    }
                                    className="flex-1 bg-secondary border-border rounded-lg text-sm h-9"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                                    onClick={() =>
                                      handleRemoveVariantSpec(
                                        variant.id,
                                        spec.id
                                      )
                                    }
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Sticky Bar */}
      <div className="sticky bottom-0 z-10 -mx-6 border-t border-border bg-background/80 backdrop-blur-xl px-6 py-4">
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            asChild
            className="border-border hover:bg-secondary"
          >
            <Link href="/admin/products">Cancel</Link>
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 min-w-[160px]"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Update Product
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Delete Product
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to delete &ldquo;{name}&rdquo;? This will
              remove all product data including variants. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
              className="border-border hover:bg-secondary"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
