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

type VariantEntry = {
  id: string;
  name: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  images: ImageEntry[];
  specs: SpecEntry[];
  isActive: boolean;
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
  const [sku, setSku] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Pricing & Stock
  const [basePrice, setBasePrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [lowStockThreshold, setLowStockThreshold] = useState("2");

  // Images
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  // Specs
  const [specs, setSpecs] = useState<SpecEntry[]>([]);

  // Variants
  const [showVariants, setShowVariants] = useState(false);
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

  // Submit & Delete
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
        setSku(p.sku || "");
        setIsFeatured(p.isFeatured);
        setIsActive(p.isActive);

        // Pricing & stock -- convert paise to rupees
        setBasePrice(String(p.basePrice / 100));
        setCompareAtPrice(
          p.compareAtPrice ? String(p.compareAtPrice / 100) : ""
        );
        setStock(String(p.stock));
        setLowStockThreshold(String(p.lowStockThreshold));

        // Images
        const loadedImages: ImageEntry[] = (p.images || []).map(
          (img: { url: string; altText?: string }) => ({
            id: generateId(),
            url: img.url,
            altText: img.altText || "",
          })
        );
        setImages(loadedImages);

        // Specs
        const loadedSpecs: SpecEntry[] = (p.specs || []).map(
          (s: { key: string; value: string }) => ({
            id: generateId(),
            key: s.key,
            value: s.value,
          })
        );
        setSpecs(loadedSpecs);

        // Variants
        const loadedVariants: VariantEntry[] = (p.variants || []).map(
          (v: {
            variantId: string;
            name: string;
            sku: string;
            price: number;
            compareAtPrice?: number | null;
            images: Array<{ url: string; altText?: string }>;
            specs: Array<{ key: string; value: string }>;
            stock: number;
            isActive?: boolean;
          }) => ({
            id: v.variantId || generateId(),
            name: v.name,
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
            isActive: v.isActive ?? true,
          })
        );
        setVariants(loadedVariants);
        if (loadedVariants.length > 0) {
          setShowVariants(true);
          setExpandedVariants(new Set([loadedVariants[0].id]));
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

  // ── Image Handlers ─────────────────────────────────────────────────────────

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
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

    setImages((prev) => [...prev, ...newImages]);
    setUploading(false);
    e.target.value = "";
  };

  const handleAddImageUrl = () => {
    if (!imageUrl.trim()) return;
    try {
      new URL(imageUrl);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }
    setImages((prev) => [
      ...prev,
      { id: generateId(), url: imageUrl.trim(), altText: "" },
    ]);
    setImageUrl("");
  };

  const handleRemoveImage = (imageId: string) => {
    setImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  const handleImageAltText = (imageId: string, altText: string) => {
    setImages((prev) =>
      prev.map((img) => (img.id === imageId ? { ...img, altText } : img))
    );
  };

  // ── Spec Handlers ──────────────────────────────────────────────────────────

  const handleAddSpec = (key = "", value = "") => {
    setSpecs((prev) => [...prev, { id: generateId(), key, value }]);
  };

  const handleRemoveSpec = (specId: string) => {
    setSpecs((prev) => prev.filter((s) => s.id !== specId));
  };

  const handleSpecChange = (
    specId: string,
    field: "key" | "value",
    val: string
  ) => {
    setSpecs((prev) =>
      prev.map((s) => (s.id === specId ? { ...s, [field]: val } : s))
    );
  };

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
      sku: generateSku(),
      price: "",
      compareAtPrice: "",
      stock: "0",
      images: [],
      specs: [],
      isActive: true,
    };
    setVariants((prev) => [...prev, newVariant]);
    setExpandedVariants((prev) => new Set(prev).add(newVariant.id));
    if (!showVariants) setShowVariants(true);
  };

  const handleRemoveVariant = (variantId: string) => {
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
    if (!basePrice || Number(basePrice) <= 0) {
      toast.error("Base price is required");
      return;
    }

    for (const s of specs) {
      if (!s.key.trim() || !s.value.trim()) {
        toast.error("All specs must have both key and value");
        return;
      }
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
        description: description.trim() || null,
        categoryId: categoryId || null,
        condition,
        sku: sku.trim() || undefined,
        basePrice: Math.round(Number(basePrice) * 100),
        compareAtPrice: compareAtPrice
          ? Math.round(Number(compareAtPrice) * 100)
          : null,
        images: images.map((img) => ({
          url: img.url,
          altText: img.altText || undefined,
        })),
        specs: specs.map((s) => ({
          key: s.key.trim(),
          value: s.value.trim(),
        })),
        stock: parseInt(stock) || 0,
        lowStockThreshold: parseInt(lowStockThreshold) || 2,
        variants: variants.map((v) => ({
          variantId: v.id,
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

            <div className="grid gap-4 sm:grid-cols-3">
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

              <div className="space-y-2">
                <Label className="text-foreground">SKU</Label>
                <div className="flex items-center gap-1">
                  <Input
                    placeholder="VP-XXXX"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="bg-secondary border-border rounded-lg font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground hover:bg-secondary"
                    onClick={() => setSku(generateSku())}
                    title="Auto-generate SKU"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
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

        {/* ── Section 2: Pricing & Stock ─────────────────────────────────── */}
        <Card className="bg-card rounded-xl border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-foreground">Pricing &amp; Stock</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label className="text-foreground">
                  Base Price (&#8377;) <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="25000"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  className="bg-secondary border-border rounded-lg font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">
                  Compare At Price (&#8377;)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="30000"
                  value={compareAtPrice}
                  onChange={(e) => setCompareAtPrice(e.target.value)}
                  className="bg-secondary border-border rounded-lg font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Stock</Label>
                <Input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="bg-secondary border-border rounded-lg font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Low Stock Threshold</Label>
                <Input
                  type="number"
                  min="0"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  className="bg-secondary border-border rounded-lg font-mono text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 3: Images ──────────────────────────────────────────── */}
        <Card className="bg-card rounded-xl border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-foreground">Images</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label
                htmlFor="product-file-upload"
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
                id="product-file-upload"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploading}
              />

              <div className="flex flex-col justify-center space-y-3">
                <p className="text-sm text-muted-foreground">Or add by URL</p>
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

            {images.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
                <ImageIcon className="h-7 w-7 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">
                  No images yet
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((img) => (
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
                          onClick={() => handleRemoveImage(img.id)}
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
                          handleImageAltText(img.id, e.target.value)
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

        {/* ── Section 4: Specifications ──────────────────────────────────── */}
        <Card className="bg-card rounded-xl border-border">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground">Specifications</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddSpec()}
                className="border-border hover:bg-secondary h-8 text-xs"
              >
                <Plus className="h-3 w-3" />
                Add Spec
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {COMMON_SPECS.filter(
                (s) => !specs.some((sp) => sp.key === s)
              ).map((spec) => (
                <Button
                  key={spec}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-border hover:bg-secondary hover:border-primary/50 hover:text-primary"
                  onClick={() => handleAddSpec(spec, "")}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  {spec}
                </Button>
              ))}
            </div>

            {specs.length > 0 && (
              <div className="space-y-2">
                {specs.map((spec) => (
                  <div
                    key={spec.id}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50 border border-border"
                  >
                    <Input
                      placeholder="Key (e.g., RAM)"
                      value={spec.key}
                      onChange={(e) =>
                        handleSpecChange(spec.id, "key", e.target.value)
                      }
                      className="flex-1 bg-background border-border rounded-lg text-sm h-9"
                    />
                    <Input
                      placeholder="Value (e.g., 16GB)"
                      value={spec.value}
                      onChange={(e) =>
                        handleSpecChange(spec.id, "value", e.target.value)
                      }
                      className="flex-1 bg-background border-border rounded-lg text-sm h-9"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                      onClick={() => handleRemoveSpec(spec.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {specs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No specifications added yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Section 5: Variants ────────────────────────────────────────── */}
        <Card className="bg-card rounded-xl border-border">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => setShowVariants(!showVariants)}
              >
                {showVariants ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <CardTitle className="text-foreground">
                    Variants{" "}
                    {variants.length > 0 && (
                      <Badge
                        variant="outline"
                        className="ml-2 text-xs bg-primary/10 text-primary border-primary/20"
                      >
                        {variants.length}
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Optional. Add different configurations.
                  </p>
                </div>
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

          {showVariants && (
            <CardContent className="pt-6 space-y-4">
              {variants.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-sm text-muted-foreground max-w-xs">
                    No variants. The product will be sold as a single item.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {variants.map((variant) => {
                    const isExpanded = expandedVariants.has(variant.id);
                    return (
                      <Card
                        key={variant.id}
                        className="bg-secondary/30 rounded-lg border-border overflow-hidden"
                      >
                        <div
                          className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-secondary/50 transition-colors"
                          onClick={() => toggleExpanded(variant.id)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-medium text-foreground truncate">
                              {variant.name || "Unnamed Variant"}
                            </span>
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
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-border px-5 py-5 space-y-6">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
              )}
            </CardContent>
          )}
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
