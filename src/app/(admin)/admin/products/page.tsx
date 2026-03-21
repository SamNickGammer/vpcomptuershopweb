"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatPrice } from "@/lib/utils/helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type ProductImage = { url: string; altText?: string };
type ProductVariant = {
  variantId: string;
  name: string;
  sku: string;
  price: number;
  compareAtPrice?: number | null;
  images: ProductImage[];
  specs: Array<{ key: string; value: string }>;
  stock: number;
  isDefault?: boolean;
  isActive?: boolean;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryId: string | null;
  condition: "new" | "refurbished" | "used";
  sku: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  images: ProductImage[];
  stock: number;
  lowStockThreshold: number;
  variants: ProductVariant[];
  isFeatured: boolean;
  isActive: boolean;
  createdAt: string;
  categoryName: string | null;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
};

const CONDITION_BADGE: Record<string, { label: string; className: string }> = {
  new: {
    label: "New",
    className:
      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10",
  },
  refurbished: {
    label: "Refurbished",
    className:
      "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/10",
  },
  used: {
    label: "Used",
    className:
      "bg-zinc-500/10 text-zinc-400 border-zinc-500/20 hover:bg-zinc-500/10",
  },
};

const LIMIT = 20;

export default function ProductsPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [condition, setCondition] = useState("");

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryId) params.set("categoryId", categoryId);
      if (condition) params.set("condition", condition);
      params.set("page", String(page));
      params.set("limit", String(LIMIT));

      const res = await fetch(`/api/admin/products?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setProducts(json.data.products);
        setTotalPages(json.data.totalPages);
        setTotal(json.data.total);
      } else {
        toast.error(json.error || "Failed to fetch products");
      }
    } catch {
      toast.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, condition, page]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/categories");
      const json = await res.json();
      if (json.success) {
        setCategories(json.data);
      }
    } catch {
      // Categories are optional for filtering
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`"${deleteTarget.name}" deleted successfully`);
        setDeleteTarget(null);
        fetchProducts();
      } else {
        toast.error(json.error || "Failed to delete product");
      }
    } catch {
      toast.error("Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-end">
        <Button
          asChild
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
        >
          <Link href="/admin/products/new">
            <Plus className="h-4 w-4" />
            Add Product
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 rounded-lg bg-secondary border-border"
          />
        </div>
        <Select
          value={categoryId || "all"}
          onValueChange={(val) => {
            setCategoryId(val === "all" ? "" : val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[200px] rounded-lg bg-secondary border-border">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={condition || "all"}
          onValueChange={(val) => {
            setCondition(val === "all" ? "" : val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[180px] rounded-lg bg-secondary border-border">
            <SelectValue placeholder="All Conditions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Conditions</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="refurbished">Refurbished</SelectItem>
            <SelectItem value="used">Used</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Products Table */}
      <Card className="bg-card rounded-xl border-border overflow-hidden">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {loading
              ? "Loading..."
              : `${total} product${total !== 1 ? "s" : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-12 w-12 animate-pulse rounded-lg bg-secondary" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 animate-pulse rounded bg-secondary" />
                    <div className="h-3 w-32 animate-pulse rounded bg-secondary" />
                  </div>
                  <div className="h-4 w-24 animate-pulse rounded bg-secondary" />
                  <div className="hidden sm:block h-5 w-16 animate-pulse rounded-full bg-secondary" />
                  <div className="hidden sm:block h-5 w-14 animate-pulse rounded-full bg-secondary" />
                  <div className="hidden lg:block h-4 w-12 animate-pulse rounded bg-secondary" />
                  <div className="h-8 w-20 animate-pulse rounded bg-secondary" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
                <Package className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                No products found
              </h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                {search || categoryId || condition
                  ? "Try adjusting your filters to find what you're looking for."
                  : "Get started by adding your first product to the catalog."}
              </p>
              {!search && !categoryId && !condition && (
                <Button
                  asChild
                  className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                >
                  <Link href="/admin/products/new">
                    <Plus className="h-4 w-4" />
                    Add Product
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="w-[60px] text-muted-foreground">
                      Image
                    </TableHead>
                    <TableHead className="text-muted-foreground">
                      Name
                    </TableHead>
                    <TableHead className="hidden md:table-cell text-muted-foreground">
                      SKU
                    </TableHead>
                    <TableHead className="text-muted-foreground">
                      Price
                    </TableHead>
                    <TableHead className="hidden lg:table-cell text-muted-foreground">
                      Stock
                    </TableHead>
                    <TableHead className="hidden sm:table-cell text-muted-foreground">
                      Condition
                    </TableHead>
                    <TableHead className="hidden lg:table-cell text-muted-foreground">
                      Variants
                    </TableHead>
                    <TableHead className="hidden sm:table-cell text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="text-right text-muted-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const img =
                      product.images && product.images.length > 0
                        ? product.images[0]
                        : null;
                    const conditionInfo = CONDITION_BADGE[product.condition];
                    const variantsCount = product.variants
                      ? product.variants.length
                      : 0;
                    const totalStock =
                      variantsCount > 0
                        ? product.variants.reduce(
                            (sum, v) => sum + v.stock,
                            0
                          )
                        : product.stock;

                    return (
                      <TableRow
                        key={product.id}
                        className="border-border hover:bg-secondary/50 transition-colors"
                      >
                        <TableCell>
                          {img ? (
                            <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-border">
                              <Image
                                src={img.url}
                                alt={img.altText || product.name}
                                fill
                                className="object-cover"
                                sizes="48px"
                              />
                            </div>
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary border border-border">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {product.name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {product.categoryName || "Uncategorized"}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="font-mono text-sm text-muted-foreground">
                            {product.sku || "--"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm font-medium text-foreground">
                            {formatPrice(product.basePrice)}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span
                            className={cn(
                              "text-sm font-medium",
                              totalStock === 0
                                ? "text-red-400"
                                : totalStock <= product.lowStockThreshold
                                  ? "text-amber-400"
                                  : "text-foreground"
                            )}
                          >
                            {totalStock}
                          </span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs font-medium",
                              conditionInfo.className
                            )}
                          >
                            {conditionInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {variantsCount}
                          </span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs font-medium",
                              product.isActive
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10"
                                : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20 hover:bg-zinc-500/10"
                            )}
                          >
                            {product.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                              onClick={() =>
                                router.push(
                                  `/admin/products/${product.id}`
                                )
                              }
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                              onClick={() => setDeleteTarget(product)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-6 py-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="border-border hover:bg-secondary"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="border-border hover:bg-secondary"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Delete Product
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to delete &ldquo;{deleteTarget?.name}
              &rdquo;? This will remove all product data including variants.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
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
