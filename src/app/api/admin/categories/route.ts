import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { getAdminFromCookie } from "@/lib/auth/admin";
import { slugify } from "@/lib/utils/helpers";

const createCategorySchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  parentId: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    const admin = await getAdminFromCookie();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Use simple select to avoid self-referencing relation issues
    const allCategories = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.sortOrder));

    // Build parent map for hierarchy info
    const categoryMap = new Map(allCategories.map((c) => [c.id, c]));
    const result = allCategories.map((c) => ({
      ...c,
      parent: c.parentId ? categoryMap.get(c.parentId) ?? null : null,
      children: allCategories.filter((child) => child.parentId === c.id),
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("GET /api/admin/categories error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch categories";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromCookie();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = createCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input" },
        { status: 400 }
      );
    }

    const { name, description, imageUrl, parentId, sortOrder, isActive } =
      parsed.data;

    // Generate unique slug
    let slug = slugify(name);
    let suffix = 1;
    const existing = await db
      .select({ slug: categories.slug })
      .from(categories);
    const existingSlugs = new Set(existing.map((e) => e.slug));
    while (existingSlugs.has(slug)) {
      suffix++;
      slug = `${slugify(name)}-${suffix}`;
    }

    const [category] = await db
      .insert(categories)
      .values({
        name,
        slug,
        description: description ?? null,
        imageUrl: imageUrl ?? null,
        parentId: parentId ?? null,
        sortOrder: sortOrder ?? 0,
        isActive: isActive ?? true,
      })
      .returning();

    return NextResponse.json(
      { success: true, data: category },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/categories error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create category";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
