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
  ChevronDown,
  ChevronUp,
  Eye,
  Info,
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

// ── Types ────────────────────────────────────────────────────────────────────

type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
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

const CONDITION_BADGES: Record<string, { label: string; className: string }> = {
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

function createEmptyVariant(isDefault: boolean): VariantEntry {
  return {
    id: generateId(),
    name: isDefault ? "Default" : "",
    sku: generateSku(),
    price: "",
    compareAtPrice: "",
    stock: "0",
    lowStockThreshold: "2",
    isDefault,
    isActive: true,
    images: [],
    specs: [],
  };
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AddProductPage() {
  const router = useRouter();

  // Categories
  const [categories, setCategories] = useState<Category[]>([]);

  // Basic Info
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [condition, setCondition] = useState<string>("new");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Product-level images (synced to default variant)
  const [productImages, setProductImages] = useState<VariantImageEntry[]>([]);
  const [productImageUrl, setProductImageUrl] = useState("");
  const [productImageUploading, setProductImageUploading] = useState(false);

  // Variants
  const [variants, setVariants] = useState<VariantEntry[]>([
    createEmptyVariant(true),
  ]);

  // Expanded variants (track which are open)
  const [expandedVariants, setExpandedVariants] = useState<Set<string>>(
    new Set([variants[0].id])
  );

  // Per-variant image URL inputs
  const [variantImageUrls, setVariantImageUrls] = useState<
    Record<string, string>
  >({});

  // Per-variant uploading state
  const [variantUploading, setVariantUploading] = useState<
    Record<string, boolean>
  >({});

  // Submit
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch categories ───────────────────────────────────────────────────────

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

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Sync product images to default variant
  useEffect(() => {
    setVariants((prev) =>
      prev.map((v) => (v.isDefault ? { ...v, images: productImages } : v))
    );
  }, [productImages]);

  // ── Toggle expand/collapse ─────────────────────────────────────────────────

  const toggleExpanded = (variantId: string) => {
    setExpandedVariants((prev) => {
      const next = new Set(prev);
      if (next.has(variantId)) {
        next.delete(variantId);
      } else {
        next.add(variantId);
      }
      return next;
    });
  };

  // ── Product Image Handlers ─────────────────────────────────────────────────

  const handleProductImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setProductImageUploading(true);
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

    setProductImages((prev) => [...prev, ...newImages]);
    setProductImageUploading(false);
    e.target.value = "";
  };

  const handleAddProductImageUrl = () => {
    if (!productImageUrl.trim()) return;
    try {
      new URL(productImageUrl);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }
    setProductImages((prev) => [
      ...prev,
      { id: generateId(), url: productImageUrl.trim(), altText: "" },
    ]);
    setProductImageUrl("");
  };

  const handleRemoveProductImage = (imageId: string) => {
    setProductImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  const handleProductImageAltText = (imageId: string, altText: string) => {
    setProductImages((prev) =>
      prev.map((img) => (img.id === imageId ? { ...img, altText } : img))
    );
  };

  // ── Variant Handlers ───────────────────────────────────────────────────────

  const handleAddVariant = () => {
    const newVariant = createEmptyVariant(false);
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
      prev.map((v) => (v.id === variantId ? { ...v, [field]: value } : v))
    );
  };

  // ── Variant Image Handlers ─────────────────────────────────────────────────

  const handleVariantImageUpload = async (
    variantId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setVariantUploading((prev) => ({ ...prev, [variantId]: true }));
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
              images: [
                ...v.images,
                { id: generateId(), url, altText: "" },
              ],
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

  const handleVariantImageAltText = (
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

  // ── Variant Spec Handlers ──────────────────────────────────────────────────

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
    }

    setSubmitting(true);
    try {
      const body = {
        name: name.trim(),
        description: description.trim() || undefined,
        categoryId: categoryId || null,
        condition,
        isFeatured,
        isActive,
        options: [],
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
          optionValueIndices: [],
        })),
      };

      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (json.success) {
        toast.success("Product created successfully");
        router.push("/admin/products");
      } else {
        toast.error(json.error || "Failed to create product");
      }
    } catch {
      toast.error("Failed to create product");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
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
            Add New Product
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create a new product listing with variants
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="bg-secondary rounded-lg p-1 w-full grid grid-cols-3">
          <TabsTrigger value="info">Product Info</TabsTrigger>
          <TabsTrigger value="variants">Variants</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Product Info ─────────────────────────────────────────── */}
        <TabsContent value="info" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column */}
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

            {/* Right Column */}
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

          {/* Product Images */}
          <Card className="bg-card rounded-xl border-border">
            <CardHeader className="border-b border-border">
              <div>
                <CardTitle className="text-foreground">
                  Product Images
                </CardTitle>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Main images for your product. These are used as the default
                  variant images.
                </p>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Upload zone */}
                <label
                  htmlFor="product-image-upload"
                  className={cn(
                    "flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-8 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-secondary/50",
                    productImageUploading && "pointer-events-none opacity-50"
                  )}
                >
                  {productImageUploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  ) : (
                    <UploadCloud className="h-8 w-8 text-muted-foreground" />
                  )}
                  <p className="mt-3 text-sm font-medium text-foreground">
                    {productImageUploading ? "Uploading..." : "Upload Images"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    PNG, JPG up to 5MB
                  </p>
                </label>
                <input
                  id="product-image-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleProductImageUpload}
                  disabled={productImageUploading}
                />

                {/* URL input */}
                <div className="flex flex-col justify-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Or add by URL
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="https://example.com/image.jpg"
                        value={productImageUrl}
                        onChange={(e) => setProductImageUrl(e.target.value)}
                        className="pl-9 bg-secondary border-border rounded-lg"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddProductImageUrl();
                          }
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddProductImageUrl}
                      className="border-border hover:bg-secondary"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              {/* Image gallery */}
              {productImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
                  <ImageIcon className="h-7 w-7 text-muted-foreground/50" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    No product images yet
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {productImages.map((img) => (
                    <div
                      key={img.id}
                      className="rounded-xl overflow-hidden border border-border relative group"
                    >
                      <div className="relative aspect-square">
                        <Image
                          src={img.url}
                          alt={img.altText || "Product image"}
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
                            onClick={() => handleRemoveProductImage(img.id)}
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
                            handleProductImageAltText(img.id, e.target.value)
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
        </TabsContent>

        {/* ── Tab 2: Variants ──────────────────────────────────────────────── */}
        <TabsContent value="variants" className="space-y-6">
          {/* Info bar */}
          <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary/50 p-4">
            <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Add different versions of your product (e.g., different colors,
              RAM, storage). If your product has no variants, the default
              variant below is used.
            </p>
          </div>

          {/* Add Variant button */}
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleAddVariant}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              Add Variant
            </Button>
          </div>

          {/* Variant list */}
          <div className="space-y-4">
            {variants.map((variant) => {
              const isExpanded = expandedVariants.has(variant.id);
              const stockNum = parseInt(variant.stock) || 0;

              return (
                <Card
                  key={variant.id}
                  className="bg-card rounded-xl border-border overflow-hidden"
                >
                  {/* Collapsed header */}
                  <div
                    className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                    onClick={() => toggleExpanded(variant.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-foreground truncate">
                          {variant.isDefault
                            ? "Default Variant"
                            : variant.name || "Unnamed Variant"}
                        </span>
                        {variant.isDefault && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-primary/10 text-primary border-primary/20 shrink-0"
                          >
                            Default
                          </Badge>
                        )}
                      </div>
                      {variant.price && (
                        <span className="text-sm text-muted-foreground font-mono shrink-0">
                          {formatPrice(Number(variant.price) * 100)}
                        </span>
                      )}
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] shrink-0",
                          stockNum === 0
                            ? "bg-red-500/10 text-red-400 border-red-500/20"
                            : stockNum <= parseInt(variant.lowStockThreshold)
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        )}
                      >
                        {stockNum} in stock
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
                      {/* Row 1: Name, SKU, Price, Compare At Price */}
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">
                            Name
                          </Label>
                          <Input
                            placeholder={
                              variant.isDefault
                                ? "Default"
                                : "e.g., Red - 8GB RAM - 256GB SSD"
                            }
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
                            Compare At Price (&#8377;)
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
                      </div>

                      {/* Row 2: Stock, Low Stock Threshold, Active */}
                      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
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

                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">
                            Low Stock Threshold
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            value={variant.lowStockThreshold}
                            onChange={(e) =>
                              handleVariantChange(
                                variant.id,
                                "lowStockThreshold",
                                e.target.value
                              )
                            }
                            className="bg-secondary border-border rounded-lg font-mono text-sm"
                          />
                        </div>
                      </div>

                      <Separator className="bg-border" />

                      {/* Images section */}
                      {variant.isDefault ? (
                        <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary/30 p-4">
                          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <p className="text-sm text-muted-foreground">
                            Default variant images are managed in the{" "}
                            <span className="text-foreground font-medium">
                              Product Info
                            </span>{" "}
                            tab under &ldquo;Product Images&rdquo;.
                            {productImages.length > 0 && (
                              <span>
                                {" "}
                                Currently {productImages.length} image
                                {productImages.length !== 1 ? "s" : ""}.
                              </span>
                            )}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium text-foreground">
                            Images
                          </h4>
                          <div className="grid gap-4 sm:grid-cols-2">
                            {/* Upload zone */}
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

                            {/* URL input */}
                            <div className="flex flex-col justify-center space-y-2">
                              <p className="text-xs text-muted-foreground">
                                Or add by URL
                              </p>
                              <div className="flex items-center gap-2">
                                <Input
                                  placeholder="https://example.com/image.jpg"
                                  value={variantImageUrls[variant.id] || ""}
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

                          {/* Thumbnails */}
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
                      )}

                      <Separator className="bg-border" />

                      {/* Specs section */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-foreground">
                            Specifications
                          </h4>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddSpec(variant.id)}
                            className="border-border hover:bg-secondary h-8 text-xs"
                          >
                            <Plus className="h-3 w-3" />
                            Add Spec
                          </Button>
                        </div>

                        {/* Quick-add chips */}
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
                                handleAddSpec(variant.id, spec, "")
                              }
                            >
                              <Plus className="mr-1 h-3 w-3" />
                              {spec}
                            </Button>
                          ))}
                        </div>

                        {/* Spec entries */}
                        {variant.specs.length > 0 && (
                          <div className="space-y-2">
                            {variant.specs.map((spec) => (
                              <div
                                key={spec.id}
                                className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50 border border-border"
                              >
                                <Input
                                  placeholder="Key (e.g., RAM)"
                                  value={spec.key}
                                  onChange={(e) =>
                                    handleSpecChange(
                                      variant.id,
                                      spec.id,
                                      "key",
                                      e.target.value
                                    )
                                  }
                                  className="flex-1 bg-background border-border rounded-lg text-sm h-9"
                                />
                                <Input
                                  placeholder="Value (e.g., 16GB)"
                                  value={spec.value}
                                  onChange={(e) =>
                                    handleSpecChange(
                                      variant.id,
                                      spec.id,
                                      "value",
                                      e.target.value
                                    )
                                  }
                                  className="flex-1 bg-background border-border rounded-lg text-sm h-9"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                                  onClick={() =>
                                    handleRemoveSpec(variant.id, spec.id)
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
        </TabsContent>

        {/* ── Tab 3: Preview ───────────────────────────────────────────────── */}
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
              {/* Product Info */}
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground">
                  {name || "Untitled Product"}
                </h2>
                {description && (
                  <p className="text-sm text-muted-foreground">
                    {description}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs font-medium",
                      CONDITION_BADGES[condition]?.className
                    )}
                  >
                    {CONDITION_BADGES[condition]?.label || condition}
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

              {/* Variants summary */}
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
                          <div className="text-sm font-medium text-foreground flex items-center gap-2">
                            {v.name || "Unnamed"}
                            {v.isDefault && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-primary/10 text-primary border-primary/20"
                              >
                                Default
                              </Badge>
                            )}
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

              {/* Specs preview */}
              {variants.some((v) => v.specs.length > 0) && (
                <>
                  <Separator className="bg-border" />
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      Specifications
                    </h3>
                    {variants.map(
                      (v) =>
                        v.specs.length > 0 && (
                          <div key={v.id} className="space-y-2">
                            <p className="text-xs text-muted-foreground font-medium">
                              {v.name || "Unnamed"}
                            </p>
                            <div className="rounded-lg border border-border overflow-hidden">
                              {v.specs.map((spec, i) => (
                                <div
                                  key={spec.id}
                                  className={cn(
                                    "flex items-center justify-between px-4 py-2 text-sm",
                                    i % 2 === 0
                                      ? "bg-secondary/20"
                                      : "bg-secondary/40"
                                  )}
                                >
                                  <span className="text-muted-foreground">
                                    {spec.key || "--"}
                                  </span>
                                  <span className="text-foreground font-medium">
                                    {spec.value || "--"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                    )}
                  </div>
                </>
              )}
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
            Create Product
          </Button>
        </div>
      </div>
    </div>
  );
}
