import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";
import { getAdminFromCookie } from "@/lib/auth/admin";
import { slugify } from "@/lib/utils/helpers";

const updateCategorySchema = z.object({
  name: z.string().min(1).max(150).optional(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromCookie();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const allCategories = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.sortOrder));

    const category = allCategories.find((c) => c.id === id);
    if (!category) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    const categoryMap = new Map(allCategories.map((c) => [c.id, c]));
    const result = {
      ...category,
      parent: category.parentId
        ? categoryMap.get(category.parentId) ?? null
        : null,
      children: allCategories.filter((c) => c.parentId === category.id),
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("GET /api/admin/categories/[id] error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch category";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromCookie();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input" },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    const { name, description, imageUrl, parentId, sortOrder, isActive } =
      parsed.data;

    if (name !== undefined) {
      updateData.name = name;
      let slug = slugify(name);
      let suffix = 1;
      const allSlugs = await db
        .select({ id: categories.id, slug: categories.slug })
        .from(categories);
      const existingSlugs = allSlugs.filter((s) => s.id !== id);
      const slugSet = new Set(existingSlugs.map((s) => s.slug));
      while (slugSet.has(slug)) {
        suffix++;
        slug = `${slugify(name)}-${suffix}`;
      }
      updateData.slug = slug;
    }
    if (description !== undefined) updateData.description = description;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (parentId !== undefined) updateData.parentId = parentId;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updated] = await db
      .update(categories)
      .set(updateData)
      .where(eq(categories.id, id))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PUT /api/admin/categories/[id] error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update category";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromCookie();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check if any products reference this category
    const [referencedProduct] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.categoryId, id))
      .limit(1);
    if (referencedProduct) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cannot delete category: products are still assigned to it. Reassign or delete them first.",
        },
        { status: 409 }
      );
    }

    // Check if any child categories exist
    const [childCategory] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.parentId, id))
      .limit(1);
    if (childCategory) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cannot delete category: it has child categories. Delete or reassign them first.",
        },
        { status: 409 }
      );
    }

    await db.delete(categories).where(eq(categories.id, id));

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error("DELETE /api/admin/categories/[id] error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete category";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
