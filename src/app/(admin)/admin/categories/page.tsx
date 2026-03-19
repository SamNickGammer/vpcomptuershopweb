"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Upload,
  ImageIcon,
  X,
  Link2,
  FolderOpen,
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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils/helpers";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parent?: Category | null;
  children?: Category[];
};

type FormData = {
  name: string;
  description: string;
  imageUrl: string;
  parentId: string;
  sortOrder: number;
  isActive: boolean;
};

const defaultFormData: FormData = {
  name: "",
  description: "",
  imageUrl: "",
  parentId: "",
  sortOrder: 0,
  isActive: true,
};

function SkeletonRow() {
  return (
    <TableRow className="border-border">
      <TableCell>
        <div className="h-12 w-12 bg-secondary rounded-lg animate-pulse" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-28 bg-secondary rounded animate-pulse" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-24 bg-secondary rounded animate-pulse" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-16 bg-secondary rounded animate-pulse" />
      </TableCell>
      <TableCell>
        <div className="h-5 w-14 bg-secondary rounded-full animate-pulse" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-8 bg-secondary rounded animate-pulse" />
      </TableCell>
      <TableCell>
        <div className="h-8 w-16 bg-secondary rounded animate-pulse ml-auto" />
      </TableCell>
    </TableRow>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(
    null
  );
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageMode, setImageMode] = useState<"upload" | "url">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/categories");
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Failed to load categories");
        return;
      }
      setCategories(json.data);
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  function openAddDialog() {
    setEditingCategory(null);
    setFormData(defaultFormData);
    setImageMode("upload");
    setDialogOpen(true);
  }

  function openEditDialog(category: Category) {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      imageUrl: category.imageUrl || "",
      parentId: category.parentId || "",
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    });
    setImageMode(category.imageUrl ? "url" : "upload");
    setDialogOpen(true);
  }

  function openDeleteDialog(category: Category) {
    setDeletingCategory(category);
    setDeleteDialogOpen(true);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fd = new globalThis.FormData();
      fd.append("file", file);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.error || "Upload failed");
        return;
      }

      setFormData((prev) => ({ ...prev, imageUrl: json.data.url }));
      toast.success("Image uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        imageUrl: formData.imageUrl.trim() || undefined,
        parentId: formData.parentId || null,
        sortOrder: formData.sortOrder,
        isActive: formData.isActive,
      };

      const isEditing = !!editingCategory;
      const url = isEditing
        ? `/api/admin/categories/${editingCategory.id}`
        : "/api/admin/categories";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.error || "Failed to save category");
        return;
      }

      toast.success(isEditing ? "Category updated" : "Category created");
      setDialogOpen(false);
      setFormData(defaultFormData);
      setEditingCategory(null);
      await fetchCategories();
    } catch {
      toast.error("Failed to save category");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingCategory) return;

    setDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/categories/${deletingCategory.id}`,
        { method: "DELETE" }
      );
      const json = await res.json();

      if (!json.success) {
        toast.error(json.error || "Failed to delete category");
        return;
      }

      toast.success("Category deleted");
      setDeleteDialogOpen(false);
      setDeletingCategory(null);
      await fetchCategories();
    } catch {
      toast.error("Failed to delete category");
    } finally {
      setDeleting(false);
    }
  }

  function getParentName(parentId: string | null): string {
    if (!parentId) return "None";
    const parent = categories.find((c) => c.id === parentId);
    return parent ? parent.name : "Unknown";
  }

  function getParentOptions(): Category[] {
    if (!editingCategory) return categories;
    const excludeIds = new Set<string>();
    excludeIds.add(editingCategory.id);

    function addDescendants(parentId: string) {
      for (const cat of categories) {
        if (cat.parentId === parentId && !excludeIds.has(cat.id)) {
          excludeIds.add(cat.id);
          addDescendants(cat.id);
        }
      }
    }
    addDescendants(editingCategory.id);

    return categories.filter((c) => !excludeIds.has(c.id));
  }

  return (
    <div className="p-6 space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-end">
        <Button
          onClick={openAddDialog}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Categories Table */}
      <Card className="bg-card border-border rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">
            All Categories
            {!loading && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({categories.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Image</TableHead>
                  <TableHead className="text-muted-foreground">Name</TableHead>
                  <TableHead className="text-muted-foreground">Slug</TableHead>
                  <TableHead className="text-muted-foreground">Parent</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Sort Order</TableHead>
                  <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </TableBody>
            </Table>
          ) : categories.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-secondary rounded-full p-4 w-fit mx-auto mb-4">
                <FolderOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-foreground font-medium">No categories yet</p>
              <p className="text-muted-foreground text-sm mt-1">
                Create your first category to start organizing products.
              </p>
              <Button
                onClick={openAddDialog}
                className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Category
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Image</TableHead>
                  <TableHead className="text-muted-foreground">Name</TableHead>
                  <TableHead className="text-muted-foreground">Slug</TableHead>
                  <TableHead className="text-muted-foreground">Parent</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Sort Order</TableHead>
                  <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id} className="border-border">
                    <TableCell>
                      {category.imageUrl ? (
                        <img
                          src={category.imageUrl}
                          alt={category.name}
                          className="h-12 w-12 rounded-lg object-cover border border-border"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {category.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {category.slug}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {getParentName(category.parentId)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={category.isActive ? "success" : "secondary"}
                      >
                        {category.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {category.sortOrder}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                          onClick={() => openEditDialog(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => openDeleteDialog(category)}
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

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingCategory ? "Edit Category" : "Add Category"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editingCategory
                ? "Update the category details below."
                : "Fill in the details to create a new category."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">
                Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Laptops, Motherboards"
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
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
                placeholder="Optional category description"
                rows={3}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground resize-none"
              />
            </div>

            {/* Image Section */}
            <div className="space-y-3">
              <Label className="text-foreground">Category Image</Label>

              {/* Image Mode Toggle */}
              <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setImageMode("upload")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex-1 justify-center",
                    imageMode === "upload"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode("url")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex-1 justify-center",
                    imageMode === "url"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Image URL
                </button>
              </div>

              {/* Upload Zone */}
              {imageMode === "upload" && !formData.imageUrl && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-dashed border-2 border-border rounded-xl p-8 text-center cursor-pointer transition-colors hover:border-muted-foreground/50 hover:bg-secondary/50",
                    uploading && "pointer-events-none opacity-60"
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {uploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  )}
                  <p className="text-sm text-foreground font-medium">
                    {uploading ? "Uploading..." : "Click to upload"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, WEBP up to 5MB
                  </p>
                </div>
              )}

              {/* URL Input */}
              {imageMode === "url" && !formData.imageUrl && (
                <Input
                  value={formData.imageUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      imageUrl: e.target.value,
                    }))
                  }
                  placeholder="https://example.com/image.jpg"
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                />
              )}

              {/* Image Preview */}
              {formData.imageUrl && (
                <div className="relative inline-block">
                  <img
                    src={formData.imageUrl}
                    alt="Category preview"
                    className="h-20 w-20 rounded-lg object-cover border border-border"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, imageUrl: "" }))
                    }
                    className="absolute -top-2 -right-2 rounded-full bg-red-500 text-white h-5 w-5 flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            <Separator className="bg-border" />

            {/* Parent Category */}
            <div className="space-y-2">
              <Label className="text-foreground">Parent Category</Label>
              <Select
                value={formData.parentId || "none"}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    parentId: value === "none" ? "" : value,
                  }))
                }
              >
                <SelectTrigger className="bg-secondary border-border text-foreground">
                  <SelectValue placeholder="Select parent category" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="none">No Parent (top-level)</SelectItem>
                  {getParentOptions().map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort Order */}
            <div className="space-y-2">
              <Label htmlFor="sortOrder" className="text-foreground">
                Sort Order
              </Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    sortOrder: parseInt(e.target.value) || 0,
                  }))
                }
                min={0}
                className="bg-secondary border-border text-foreground w-32"
              />
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
                  Inactive categories are hidden from the storefront
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
                {editingCategory ? "Update" : "Create"}
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
              Delete Category
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {deletingCategory?.name}
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
