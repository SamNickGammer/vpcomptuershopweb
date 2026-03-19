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
  Link as LinkIcon,
  Loader2,
  ImageIcon,
  Trash2,
  RefreshCw,
  Package,
  Sparkles,
  Eye,
  DollarSign,
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
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

type OptionEntry = {
  id: string;
  name: string;
  values: string[];
};

type VariantImageEntry = {
  id: string;
  url: string;
  altText: string;
};

type VariantSpecEntry = {
  id: string;
  key: string;
  value: string;
};

type VariantEntry = {
  id: string;
  name: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  lowStockThreshold: string;
  isDefault: boolean;
  isActive: boolean;
  images: VariantImageEntry[];
  specs: VariantSpecEntry[];
  optionValueIndices: number[];
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

const CONDITION_BADGE_PREVIEW: Record<
  string,
  { label: string; className: string }
> = {
  new: {
    label: "New",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  refurbished: {
    label: "Refurbished",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  used: {
    label: "Used",
    className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  },
};

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

function cartesianProduct<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];
  return arrays.reduce<T[][]>(
    (acc, curr) => acc.flatMap((a) => curr.map((c) => [...a, c])),
    [[]]
  );
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

  // Basic Info
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [condition, setCondition] = useState<string>("new");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Options & Variants
  const [options, setOptions] = useState<OptionEntry[]>([]);
  const [variants, setVariants] = useState<VariantEntry[]>([]);

  // Variant Details — selected variant
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");

  // Image upload
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  // Set All Prices
  const [bulkPrice, setBulkPrice] = useState("");

  // Submit
  const [submitting, setSubmitting] = useState(false);

  // Delete
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // New option value input
  const [optionValueInputs, setOptionValueInputs] = useState<
    Record<string, string>
  >({});

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

        // Parse options
        const loadedOptions: OptionEntry[] = (p.options || []).map(
          (o: { id?: string; name: string; values: { id?: string; value: string }[] }) => ({
            id: o.id || generateId(),
            name: o.name,
            values: o.values.map(
              (v: { value: string }) => v.value
            ),
          })
        );
        setOptions(loadedOptions);

        // Parse variants
        const loadedVariants: VariantEntry[] = (p.variants || []).map(
          (v: {
            id: string;
            name: string;
            sku: string;
            price: number;
            compareAtPrice: number | null;
            images: Array<{ url: string; altText?: string }>;
            specs: Array<{ key: string; value: string }>;
            stock: number;
            lowStockThreshold: number;
            isDefault: boolean;
            isActive: boolean;
            optionValueIndices?: number[];
          }) => ({
            id: v.id || generateId(),
            name: v.name,
            sku: v.sku,
            price: String(v.price / 100),
            compareAtPrice: v.compareAtPrice
              ? String(v.compareAtPrice / 100)
              : "",
            stock: String(v.stock),
            lowStockThreshold: String(v.lowStockThreshold),
            isDefault: v.isDefault,
            isActive: v.isActive,
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
            optionValueIndices: v.optionValueIndices || [],
          })
        );
        setVariants(loadedVariants);

        if (loadedVariants.length > 0) {
          setSelectedVariantId(loadedVariants[0].id);
        }
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

  // Keep selectedVariantId in sync
  useEffect(() => {
    if (
      variants.length > 0 &&
      !variants.find((v) => v.id === selectedVariantId)
    ) {
      setSelectedVariantId(variants[0].id);
    }
  }, [variants, selectedVariantId]);

  // ── Option Handlers ──────────────────────────────────────────────────────

  const handleAddOption = () => {
    setOptions((prev) => [
      ...prev,
      { id: generateId(), name: "", values: [] },
    ]);
  };

  const handleRemoveOption = (optionId: string) => {
    setOptions((prev) => prev.filter((o) => o.id !== optionId));
  };

  const handleOptionNameChange = (optionId: string, newName: string) => {
    setOptions((prev) =>
      prev.map((o) => (o.id === optionId ? { ...o, name: newName } : o))
    );
  };

  const handleAddOptionValue = (optionId: string) => {
    const val = (optionValueInputs[optionId] || "").trim();
    if (!val) return;
    setOptions((prev) =>
      prev.map((o) =>
        o.id === optionId && !o.values.includes(val)
          ? { ...o, values: [...o.values, val] }
          : o
      )
    );
    setOptionValueInputs((prev) => ({ ...prev, [optionId]: "" }));
  };

  const handleRemoveOptionValue = (optionId: string, value: string) => {
    setOptions((prev) =>
      prev.map((o) =>
        o.id === optionId
          ? { ...o, values: o.values.filter((v) => v !== value) }
          : o
      )
    );
  };

  // ── Generate Variants ────────────────────────────────────────────────────

  const handleGenerateVariants = () => {
    const validOptions = options.filter(
      (o) => o.name.trim() && o.values.length > 0
    );

    if (validOptions.length === 0) {
      setVariants([
        {
          id: generateId(),
          name: "Default",
          sku: generateSku(),
          price: "",
          compareAtPrice: "",
          stock: "0",
          lowStockThreshold: "2",
          isDefault: true,
          isActive: true,
          images: [],
          specs: [],
          optionValueIndices: [],
        },
      ]);
      toast.success("Reset to single Default variant");
      return;
    }

    const valueSets = validOptions.map((o) =>
      o.values.map((v, i) => ({ value: v, index: i }))
    );
    const combinations = cartesianProduct(valueSets);

    const newVariants: VariantEntry[] = combinations.map(
      (combo, comboIdx) => {
        const variantName = combo.map((c) => c.value).join(" / ");
        // Try to find existing variant with same name to preserve data
        const existing = variants.find((v) => v.name === variantName);
        return {
          id: existing?.id || generateId(),
          name: variantName,
          sku: existing?.sku || generateSku(),
          price: existing?.price || "",
          compareAtPrice: existing?.compareAtPrice || "",
          stock: existing?.stock || "0",
          lowStockThreshold: existing?.lowStockThreshold || "2",
          isDefault: comboIdx === 0,
          isActive: existing?.isActive ?? true,
          images: existing?.images || [],
          specs: existing?.specs || [],
          optionValueIndices: combo.map((c) => c.index),
        };
      }
    );

    setVariants(newVariants);
    toast.success(
      `Generated ${newVariants.length} variant${newVariants.length !== 1 ? "s" : ""}`
    );
  };

  // ── Variant Handlers ─────────────────────────────────────────────────────

  const handleVariantChange = (
    variantId: string,
    field: keyof VariantEntry,
    value: string | boolean
  ) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === variantId ? { ...v, [field]: value } : v))
    );
  };

  const handleRemoveVariant = (variantId: string) => {
    if (variants.length <= 1) {
      toast.error("Must have at least one variant");
      return;
    }
    setVariants((prev) => {
      const filtered = prev.filter((v) => v.id !== variantId);
      if (!filtered.some((v) => v.isDefault) && filtered.length > 0) {
        filtered[0].isDefault = true;
      }
      return filtered;
    });
  };

  const handleSetAllPrices = () => {
    if (!bulkPrice || Number(bulkPrice) <= 0) {
      toast.error("Enter a valid price");
      return;
    }
    setVariants((prev) => prev.map((v) => ({ ...v, price: bulkPrice })));
    toast.success(`Set price to Rs.${bulkPrice} for all variants`);
  };

  // ── Variant Image Handlers ───────────────────────────────────────────────

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedVariantId) return;

    setUploading(true);
    const newImages: VariantImageEntry[] = [];

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
        v.id === selectedVariantId
          ? { ...v, images: [...v.images, ...newImages] }
          : v
      )
    );
    setUploading(false);
    e.target.value = "";
  };

  const handleAddImageUrl = () => {
    if (!imageUrl.trim() || !selectedVariantId) return;
    try {
      new URL(imageUrl);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }
    setVariants((prev) =>
      prev.map((v) =>
        v.id === selectedVariantId
          ? {
              ...v,
              images: [
                ...v.images,
                { id: generateId(), url: imageUrl.trim(), altText: "" },
              ],
            }
          : v
      )
    );
    setImageUrl("");
  };

  const handleRemoveImage = (variantId: string, imageId: string) => {
    setVariants((prev) =>
      prev.map((v) =>
        v.id === variantId
          ? { ...v, images: v.images.filter((img) => img.id !== imageId) }
          : v
      )
    );
  };

  const handleImageAltText = (
    variantId: string,
    imageId: string,
    altText: string
  ) => {
    setVariants((prev) =>
      prev.map((v) =>
        v.id === variantId
          ? {
              ...v,
              images: v.images.map((img) =>
                img.id === imageId ? { ...img, altText } : img
              ),
            }
          : v
      )
    );
  };

  // ── Variant Spec Handlers ────────────────────────────────────────────────

  const handleAddSpec = (variantId: string, key = "", value = "") => {
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

  const handleRemoveSpec = (variantId: string, specId: string) => {
    setVariants((prev) =>
      prev.map((v) =>
        v.id === variantId
          ? { ...v, specs: v.specs.filter((s) => s.id !== specId) }
          : v
      )
    );
  };

  const handleSpecChange = (
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

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!condition) {
      toast.error("Please select a condition");
      return;
    }

    for (const v of variants) {
      if (!v.name.trim()) {
        toast.error("All variants must have a name");
        return;
      }
      if (!v.sku.trim()) {
        toast.error("All variants must have a SKU");
        return;
      }
      if (!v.price || Number(v.price) <= 0) {
        toast.error(`Variant "${v.name}" requires a price`);
        return;
      }
    }

    for (const v of variants) {
      for (const s of v.specs) {
        if (!s.key.trim() || !s.value.trim()) {
          toast.error(
            `Variant "${v.name}": all specs must have both key and value`
          );
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const validOptions = options.filter(
        (o) => o.name.trim() && o.values.length > 0
      );

      const body = {
        name: name.trim(),
        description: description.trim() || null,
        categoryId: categoryId || null,
        condition,
        isFeatured,
        isActive,
        options: validOptions.map((o) => ({
          name: o.name.trim(),
          values: o.values,
        })),
        variants: variants.map((v) => ({
          name: v.name.trim(),
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
          stock: parseInt(v.stock) || 0,
          lowStockThreshold: parseInt(v.lowStockThreshold) || 2,
          isDefault: v.isDefault,
          isActive: v.isActive,
          optionValueIndices: v.optionValueIndices,
        })),
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

  // ── Delete ───────────────────────────────────────────────────────────────

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

  // ── Loading State ────────────────────────────────────────────────────────

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
        <div className="h-10 w-full animate-pulse rounded-lg bg-secondary" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 h-80 animate-pulse rounded-xl bg-secondary" />
          <div className="h-80 animate-pulse rounded-xl bg-secondary" />
        </div>
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

      {/* Tabs */}
      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="bg-secondary rounded-lg p-1 w-full grid grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="options">Options & Variants</TabsTrigger>
          <TabsTrigger value="details">Variant Details</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Basic Info ────────────────────────────────────────────── */}
        <TabsContent value="basic">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card className="bg-card rounded-xl border-border">
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-foreground">
                    Product Details
                  </CardTitle>
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
                      onChange={(e) => setName(e.target.value)}
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
                          <SelectItem value="refurbished">
                            Refurbished
                          </SelectItem>
                          <SelectItem value="used">Used</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="bg-card rounded-xl border-border">
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-foreground">Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 px-4 py-3">
                    <div>
                      <Label
                        htmlFor="featured"
                        className="text-foreground cursor-pointer"
                      >
                        Featured Product
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Show on homepage
                      </p>
                    </div>
                    <Switch
                      id="featured"
                      checked={isFeatured}
                      onCheckedChange={setIsFeatured}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 px-4 py-3">
                    <div>
                      <Label
                        htmlFor="active"
                        className="text-foreground cursor-pointer"
                      >
                        Active
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Visible on storefront
                      </p>
                    </div>
                    <Switch
                      id="active"
                      checked={isActive}
                      onCheckedChange={setIsActive}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── Tab 2: Options & Variants ───────────────────────────────────── */}
        <TabsContent value="options" className="space-y-6">
          {/* Product Options */}
          <Card className="bg-card rounded-xl border-border">
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-foreground">
                    Product Options
                  </CardTitle>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Define option groups like Color, RAM, Storage. Each option
                    has multiple values.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddOption}
                  className="border-border hover:bg-secondary"
                >
                  <Plus className="h-4 w-4" />
                  Add Option
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {options.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
                    <Sparkles className="h-7 w-7 text-muted-foreground/50" />
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground max-w-xs">
                    No options defined. Your product will have a single
                    &ldquo;Default&rdquo; variant. Add options to create
                    multiple variants.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {options.map((option, optIdx) => (
                    <Card
                      key={option.id}
                      className="bg-secondary/50 rounded-lg border-border p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Option {optIdx + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => handleRemoveOption(option.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">
                            Option Name
                          </Label>
                          <Input
                            placeholder="e.g., Color, RAM, Storage"
                            value={option.name}
                            onChange={(e) =>
                              handleOptionNameChange(option.id, e.target.value)
                            }
                            className="bg-background border-border rounded-lg"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">
                            Values
                          </Label>
                          <div className="flex flex-wrap gap-2">
                            {option.values.map((val) => (
                              <Badge
                                key={val}
                                variant="outline"
                                className="bg-background border-border text-foreground px-3 py-1.5 text-sm gap-1.5"
                              >
                                {val}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveOptionValue(option.id, val)
                                  }
                                  className="text-muted-foreground hover:text-red-400 transition-colors"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Input
                              placeholder="Type a value and press Enter"
                              value={optionValueInputs[option.id] || ""}
                              onChange={(e) =>
                                setOptionValueInputs((prev) => ({
                                  ...prev,
                                  [option.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddOptionValue(option.id);
                                }
                              }}
                              className="bg-background border-border rounded-lg"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddOptionValue(option.id)}
                              className="border-border hover:bg-secondary shrink-0"
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Variants */}
          <Card className="bg-card rounded-xl border-border">
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-foreground">Variants</CardTitle>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {options.length > 0
                      ? "Generate variants from option combinations, then set price and stock."
                      : "Single Default variant. Add options above to create more."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {options.length > 0 && (
                    <Button
                      type="button"
                      onClick={handleGenerateVariants}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                    >
                      <Sparkles className="h-4 w-4" />
                      Generate Variants
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* Set All Prices */}
              {variants.length > 1 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                  <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground shrink-0">
                    Set all prices:
                  </span>
                  <div className="relative flex-1 max-w-[200px]">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                      &#8377;
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Price"
                      value={bulkPrice}
                      onChange={(e) => setBulkPrice(e.target.value)}
                      className="pl-7 bg-background border-border rounded-lg text-sm h-8"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSetAllPrices}
                    className="border-border hover:bg-secondary h-8"
                  >
                    Apply
                  </Button>
                </div>
              )}

              {/* Variant list */}
              <div className="space-y-3">
                {variants.map((variant, index) => (
                  <Card
                    key={variant.id}
                    className="bg-secondary/50 rounded-lg border-border p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {variant.isDefault
                            ? "Default Variant"
                            : `Variant ${index + 1}`}
                        </span>
                        {variant.isDefault && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-primary/10 text-primary border-primary/20"
                          >
                            Default
                          </Badge>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => handleRemoveVariant(variant.id)}
                        disabled={variants.length <= 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-12">
                      <div className="sm:col-span-3 space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          Name
                        </Label>
                        <Input
                          placeholder="e.g., Red / 8GB"
                          value={variant.name}
                          onChange={(e) =>
                            handleVariantChange(
                              variant.id,
                              "name",
                              e.target.value
                            )
                          }
                          className="bg-background border-border rounded-lg"
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-1.5">
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
                            className="bg-background border-border rounded-lg font-mono text-xs"
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
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          Price (&#8377;) *
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
                          className="bg-background border-border rounded-lg font-mono text-xs"
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-1.5">
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
                          className="bg-background border-border rounded-lg font-mono text-xs"
                        />
                      </div>
                      <div className="sm:col-span-1 space-y-1.5">
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
                          className="bg-background border-border rounded-lg font-mono text-xs"
                        />
                      </div>
                      <div className="sm:col-span-2 flex items-end pb-0.5">
                        <div className="flex items-center gap-2">
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
                          <Label className="text-xs text-muted-foreground">
                            Active
                          </Label>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Variant Details ──────────────────────────────────────── */}
        <TabsContent value="details" className="space-y-6">
          {/* Variant Selector */}
          <Card className="bg-card rounded-xl border-border">
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground">
                  Variant Details
                </CardTitle>
                <Select
                  value={selectedVariantId}
                  onValueChange={setSelectedVariantId}
                >
                  <SelectTrigger className="w-[260px] bg-secondary border-border rounded-lg">
                    <SelectValue placeholder="Select variant" />
                  </SelectTrigger>
                  <SelectContent>
                    {variants.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name || "Unnamed"}
                        {v.isDefault ? " (Default)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
          </Card>

          {selectedVariant && (
            <>
              {/* Images for selected variant */}
              <Card className="bg-card rounded-xl border-border">
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-foreground">
                    Images for &ldquo;{selectedVariant.name}&rdquo;
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label
                      htmlFor="file-upload-edit"
                      className={cn(
                        "flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-8 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-secondary/50",
                        uploading && "pointer-events-none opacity-50"
                      )}
                    >
                      {uploading ? (
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      ) : (
                        <UploadCloud className="h-8 w-8 text-muted-foreground" />
                      )}
                      <p className="mt-3 text-sm font-medium text-foreground">
                        {uploading ? "Uploading..." : "Upload Images"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        PNG, JPG up to 5MB
                      </p>
                    </label>
                    <input
                      id="file-upload-edit"
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />

                    <div className="flex flex-col justify-center space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Or add by URL
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="https://example.com/image.jpg"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            className="pl-9 bg-secondary border-border rounded-lg"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddImageUrl();
                              }
                            }}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAddImageUrl}
                          className="border-border hover:bg-secondary"
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>

                  {selectedVariant.images.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
                      <ImageIcon className="h-7 w-7 text-muted-foreground/50" />
                      <p className="mt-3 text-sm text-muted-foreground">
                        No images for this variant yet
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {selectedVariant.images.map((img) => (
                        <div
                          key={img.id}
                          className="rounded-xl overflow-hidden border border-border relative group"
                        >
                          <div className="relative aspect-square">
                            <Image
                              src={img.url}
                              alt={img.altText || "Variant image"}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-red-500/50 hover:text-white"
                                onClick={() =>
                                  handleRemoveImage(
                                    selectedVariantId,
                                    img.id
                                  )
                                }
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="p-2.5 bg-card">
                            <Input
                              placeholder="Alt text"
                              value={img.altText}
                              onChange={(e) =>
                                handleImageAltText(
                                  selectedVariantId,
                                  img.id,
                                  e.target.value
                                )
                              }
                              className="bg-secondary border-border rounded-lg text-xs h-8"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Specs for selected variant */}
              <Card className="bg-card rounded-xl border-border">
                <CardHeader className="border-b border-border">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-foreground">
                      Specs for &ldquo;{selectedVariant.name}&rdquo;
                    </CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleAddSpec(selectedVariantId)}
                      className="border-border hover:bg-secondary"
                    >
                      <Plus className="h-4 w-4" />
                      Add Spec
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Quick add
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_SPECS.filter(
                        (s) =>
                          !selectedVariant.specs.some((sp) => sp.key === s)
                      ).map((spec) => (
                        <Button
                          key={spec}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs border-border hover:bg-secondary hover:border-primary/50 hover:text-primary"
                          onClick={() =>
                            handleAddSpec(selectedVariantId, spec, "")
                          }
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          {spec}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator className="bg-border" />

                  {selectedVariant.specs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <p className="text-sm text-muted-foreground">
                        No specs for this variant. Use quick-add or
                        &ldquo;Add Spec&rdquo;.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedVariant.specs.map((spec) => (
                        <div
                          key={spec.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border"
                        >
                          <Input
                            placeholder="Key (e.g., RAM)"
                            value={spec.key}
                            onChange={(e) =>
                              handleSpecChange(
                                selectedVariantId,
                                spec.id,
                                "key",
                                e.target.value
                              )
                            }
                            className="flex-1 bg-background border-border rounded-lg"
                          />
                          <Input
                            placeholder="Value (e.g., 16GB)"
                            value={spec.value}
                            onChange={(e) =>
                              handleSpecChange(
                                selectedVariantId,
                                spec.id,
                                "value",
                                e.target.value
                              )
                            }
                            className="flex-1 bg-background border-border rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                            onClick={() =>
                              handleRemoveSpec(selectedVariantId, spec.id)
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ── Tab 4: Preview ──────────────────────────────────────────────── */}
        <TabsContent value="preview">
          <Card className="bg-card rounded-xl border-border">
            <CardHeader className="border-b border-border">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-foreground">
                  Product Preview
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground">
                  {name || "Untitled Product"}
                </h2>
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs font-medium",
                      CONDITION_BADGE_PREVIEW[condition]?.className
                    )}
                  >
                    {CONDITION_BADGE_PREVIEW[condition]?.label || condition}
                  </Badge>
                  {isFeatured && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-primary/10 text-primary border-primary/20"
                    >
                      Featured
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      isActive
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                    )}
                  >
                    {isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              <Separator className="bg-border" />

              {options.filter((o) => o.name.trim() && o.values.length > 0)
                .length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    Options
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {options
                      .filter((o) => o.name.trim() && o.values.length > 0)
                      .map((o) => (
                        <div key={o.id} className="text-sm">
                          <span className="text-muted-foreground">
                            {o.name}:
                          </span>{" "}
                          <span className="text-foreground">
                            {o.values.join(", ")}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Variants ({variants.length})
                </h3>
                <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                  {variants.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between px-4 py-3 bg-secondary/30"
                    >
                      <div className="flex items-center gap-3">
                        {v.images.length > 0 ? (
                          <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-border">
                            <Image
                              src={v.images[0].url}
                              alt={v.images[0].altText || v.name}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          </div>
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary border border-border">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {v.name}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {v.sku}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-mono font-medium text-foreground">
                            {v.price
                              ? formatPrice(Number(v.price) * 100)
                              : "--"}
                          </div>
                          {v.compareAtPrice && (
                            <div className="text-xs text-muted-foreground line-through font-mono">
                              {formatPrice(Number(v.compareAtPrice) * 100)}
                            </div>
                          )}
                        </div>
                        <div className="text-right min-w-[60px]">
                          <div
                            className={cn(
                              "text-sm font-medium",
                              parseInt(v.stock) === 0
                                ? "text-red-400"
                                : "text-foreground"
                            )}
                          >
                            {v.stock || "0"} in stock
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            v.isActive
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                          )}
                        >
                          {v.isActive ? "Active" : "Off"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
              also remove all options, variants, and their images, specs, and
              stock data. This action cannot be undone.
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
