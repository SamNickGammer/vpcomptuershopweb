import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, like, and, sql, desc, count } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  products,
  productVariants,
  productOptions,
  productOptionValues,
  variantOptionValues,
  categories,
} from "@/lib/db/schema";
import { getAdminFromCookie } from "@/lib/auth/admin";
import { slugify } from "@/lib/utils/helpers";

const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  condition: z.enum(["new", "refurbished", "used"]),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  options: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        values: z.array(z.string().min(1).max(150)).min(1),
      })
    )
    .optional(),
  variants: z
    .array(
      z.object({
        name: z.string().min(1).max(255),
        sku: z.string().min(1).max(100),
        price: z.number().int().min(0),
        compareAtPrice: z.number().int().min(0).optional().nullable(),
        images: z
          .array(
            z.object({
              url: z.string().min(1),
              altText: z.string().optional(),
            })
          )
          .optional(),
        specs: z
          .array(
            z.object({
              key: z.string().min(1),
              value: z.string().min(1),
            })
          )
          .optional(),
        stock: z.number().int().min(0).optional(),
        lowStockThreshold: z.number().int().min(0).optional(),
        isDefault: z.boolean().optional(),
        optionValueIndices: z.array(z.number().int().min(0)).optional(),
      })
    )
    .optional(),
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

    // Get variants for these products
    const productIds = productRows.map((r) => r.product.id);

    let allVariants: (typeof productVariants.$inferSelect)[] = [];

    if (productIds.length > 0) {
      allVariants = await db
        .select()
        .from(productVariants)
        .where(sql`${productVariants.productId} IN ${productIds}`);
    }

    const data = productRows.map((row) => {
      const variants = allVariants.filter(
        (v) => v.productId === row.product.id
      );
      const prices = variants.map((v) => v.price);
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
      const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);

      // Get first image from first variant (prefer default variant)
      const defaultVariant =
        variants.find((v) => v.isDefault) ?? variants[0];
      const firstImage =
        defaultVariant?.images && defaultVariant.images.length > 0
          ? defaultVariant.images[0]
          : null;

      return {
        ...row.product,
        categoryName: row.categoryName,
        variantsCount: variants.length,
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
      isFeatured,
      isActive,
      options,
      variants,
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

    const result = await db.transaction(async (tx) => {
      // Insert product
      const [product] = await tx
        .insert(products)
        .values({
          name,
          slug,
          description: description ?? null,
          categoryId: categoryId ?? null,
          condition,
          isFeatured: isFeatured ?? false,
          isActive: isActive ?? true,
        })
        .returning();

      // Insert options and collect created option values
      // optionValuesMap[optionIndex][valueIndex] = optionValueId
      const optionValuesMap: string[][] = [];

      if (options && options.length > 0) {
        for (let oi = 0; oi < options.length; oi++) {
          const opt = options[oi];
          const [createdOption] = await tx
            .insert(productOptions)
            .values({
              productId: product.id,
              name: opt.name,
              position: oi,
            })
            .returning();

          const valueIds: string[] = [];
          for (let vi = 0; vi < opt.values.length; vi++) {
            const [createdValue] = await tx
              .insert(productOptionValues)
              .values({
                optionId: createdOption.id,
                value: opt.values[vi],
                position: vi,
              })
              .returning();
            valueIds.push(createdValue.id);
          }
          optionValuesMap.push(valueIds);
        }
      }

      // Insert variants
      let insertedVariants: (typeof productVariants.$inferSelect)[] = [];

      if (variants && variants.length > 0) {
        for (const v of variants) {
          const [createdVariant] = await tx
            .insert(productVariants)
            .values({
              productId: product.id,
              name: v.name,
              sku: v.sku,
              price: v.price,
              compareAtPrice: v.compareAtPrice ?? null,
              images: v.images ?? [],
              specs: v.specs ?? [],
              stock: v.stock ?? 0,
              lowStockThreshold: v.lowStockThreshold ?? 2,
              isDefault: v.isDefault ?? false,
            })
            .returning();

          // Link variant to option values
          if (
            v.optionValueIndices &&
            v.optionValueIndices.length > 0 &&
            optionValuesMap.length > 0
          ) {
            for (let oi = 0; oi < v.optionValueIndices.length; oi++) {
              const vi = v.optionValueIndices[oi];
              if (optionValuesMap[oi] && optionValuesMap[oi][vi]) {
                await tx.insert(variantOptionValues).values({
                  variantId: createdVariant.id,
                  optionValueId: optionValuesMap[oi][vi],
                });
              }
            }
          }

          insertedVariants.push(createdVariant);
        }
      } else {
        // No variants provided — create a single Default variant
        const [defaultVariant] = await tx
          .insert(productVariants)
          .values({
            productId: product.id,
            name: "Default",
            sku: `${slug}-default`,
            price: 0,
            images: [],
            specs: [],
            stock: 0,
            lowStockThreshold: 2,
            isDefault: true,
          })
          .returning();
        insertedVariants.push(defaultVariant);
      }

      return {
        ...product,
        variants: insertedVariants,
      };
    });

    return NextResponse.json(
      { success: true, data: result },
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
