import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { like, and, desc, count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, categories } from "@/lib/db/schema";
import { getAdminFromCookie } from "@/lib/auth/admin";
import { slugify } from "@/lib/utils/helpers";

const variantSchema = z.object({
  variantId: z.string().min(1),
  name: z.string().min(1).max(255),
  displayName: z.string().max(500).optional().default(""),
  label: z.string().max(255).optional().default(""),
  description: z.string().optional().default(""),
  sku: z.string().min(1).max(100),
  price: z.number().int().min(0),
  compareAtPrice: z.number().int().min(0).optional().nullable(),
  images: z
    .array(z.object({ url: z.string().min(1), altText: z.string().optional() }))
    .optional()
    .default([]),
  specs: z
    .array(z.object({ key: z.string().min(1), value: z.string().min(1) }))
    .optional()
    .default([]),
  stock: z.number().int().min(0).default(0),
  isDefault: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  condition: z.enum(["new", "refurbished", "used"]),
  sku: z.string().max(100).optional().nullable(),
  basePrice: z.number().int().min(0).default(0),
  compareAtPrice: z.number().int().min(0).optional().nullable(),
  images: z
    .array(z.object({ url: z.string().min(1), altText: z.string().optional() }))
    .optional()
    .default([]),
  specs: z
    .array(z.object({ key: z.string().min(1), value: z.string().min(1) }))
    .optional()
    .default([]),
  shippingWeightGrams: z.number().int().min(0).default(0),
  shippingDimensions: z
    .object({
      lengthCm: z.number().min(0),
      breadthCm: z.number().min(0),
      heightCm: z.number().min(0),
    })
    .default({
      lengthCm: 0,
      breadthCm: 0,
      heightCm: 0,
    }),
  stock: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(2),
  variants: z.array(variantSchema).optional().default([]),
  isFeatured: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromCookie();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const categoryId = searchParams.get("categoryId");
    const condition = searchParams.get("condition");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit")) || 20)
    );
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];
    if (search) {
      conditions.push(like(products.name, `%${search}%`));
    }
    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId));
    }
    if (
      condition &&
      ["new", "refurbished", "used"].includes(condition)
    ) {
      conditions.push(
        eq(products.condition, condition as "new" | "refurbished" | "used")
      );
    }

    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(products)
      .where(whereClause);

    // Get products with category info
    const productRows = await db
      .select({
        product: products,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(whereClause)
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);

    const data = productRows.map((row) => {
      const p = row.product;
      const variantsArr = (p.variants ?? []) as Array<{
        variantId: string;
        name: string;
        price: number;
        stock: number;
        images: Array<{ url: string; altText?: string }>;
        isDefault?: boolean;
      }>;

      const prices =
        variantsArr.length > 0
          ? variantsArr.map((v) => v.price)
          : [p.basePrice];
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      const totalStock =
        variantsArr.length > 0
          ? variantsArr.reduce((sum, v) => sum + v.stock, 0)
          : p.stock;

      const firstImage =
        p.images && p.images.length > 0
          ? p.images[0]
          : variantsArr.length > 0 && variantsArr[0].images?.length > 0
            ? variantsArr[0].images[0]
            : null;

      return {
        ...p,
        categoryName: row.categoryName,
        variantsCount: variantsArr.length,
        priceRange: { min: minPrice, max: maxPrice },
        firstImage,
        totalStock,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        products: data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/admin/products error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch products",
      },
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
    const parsed = createProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input" },
        { status: 400 }
      );
    }

    const {
      name,
      description,
      categoryId,
      condition,
      sku,
      basePrice,
      compareAtPrice,
      images,
      specs,
      shippingWeightGrams,
      shippingDimensions,
      stock,
      lowStockThreshold,
      variants,
      isFeatured,
      isActive,
    } = parsed.data;

    // Generate unique slug
    let slug = slugify(name);
    const existingSlugs = await db
      .select({ slug: products.slug })
      .from(products);
    const slugSet = new Set(existingSlugs.map((e) => e.slug));
    let suffix = 1;
    while (slugSet.has(slug)) {
      suffix++;
      slug = `${slugify(name)}-${suffix}`;
    }

    // Auto-fill displayName for variants if empty
    const processedVariants = variants.map((v) => ({
      ...v,
      displayName: v.displayName || `${name} ${v.name}`.trim(),
    }));

    const [product] = await db
      .insert(products)
      .values({
        name,
        slug,
        description: description ?? null,
        categoryId: categoryId ?? null,
        condition,
        sku: sku ?? null,
        basePrice,
        compareAtPrice: compareAtPrice ?? null,
        images,
        specs,
        shippingWeightGrams,
        shippingDimensions,
        stock,
        lowStockThreshold,
        variants: processedVariants,
        isFeatured,
        isActive,
      })
      .returning();

    return NextResponse.json(
      { success: true, data: product },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/products error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create product",
      },
      { status: 500 }
    );
  }
}
