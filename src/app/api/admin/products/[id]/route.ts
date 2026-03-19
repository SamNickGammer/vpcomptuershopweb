import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  products,
  productVariants,
  productOptions,
  productOptionValues,
  variantOptionValues,
} from "@/lib/db/schema";
import { getAdminFromCookie } from "@/lib/auth/admin";
import { slugify } from "@/lib/utils/helpers";

const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  condition: z.enum(["new", "refurbished", "used"]).optional(),
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

    // Fetch product
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Fetch options
    const optionRows = await db
      .select()
      .from(productOptions)
      .where(eq(productOptions.productId, id));

    // Fetch option values for all options
    const optionIds = optionRows.map((o) => o.id);
    let optionValueRows: (typeof productOptionValues.$inferSelect)[] = [];
    if (optionIds.length > 0) {
      optionValueRows = await db
        .select()
        .from(productOptionValues)
        .where(
          eq(
            productOptionValues.optionId,
            optionIds.length === 1 ? optionIds[0] : optionIds[0]
          )
        );
      // For multiple options, need to fetch all
      if (optionIds.length > 1) {
        optionValueRows = [];
        for (const optId of optionIds) {
          const vals = await db
            .select()
            .from(productOptionValues)
            .where(eq(productOptionValues.optionId, optId));
          optionValueRows.push(...vals);
        }
      }
    }

    // Fetch variants
    const variantRows = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, id));

    // Fetch variant option value links
    const variantIds = variantRows.map((v) => v.id);
    let variantOptionValueRows: (typeof variantOptionValues.$inferSelect)[] =
      [];
    if (variantIds.length > 0) {
      for (const vid of variantIds) {
        const links = await db
          .select()
          .from(variantOptionValues)
          .where(eq(variantOptionValues.variantId, vid));
        variantOptionValueRows.push(...links);
      }
    }

    // Build response
    const optionsWithValues = optionRows.map((opt) => ({
      ...opt,
      values: optionValueRows.filter((v) => v.optionId === opt.id),
    }));

    const variantsWithOptionValues = variantRows.map((variant) => {
      const links = variantOptionValueRows.filter(
        (l) => l.variantId === variant.id
      );
      const linkedOptionValues = links.map((link) => {
        const optionValue = optionValueRows.find(
          (ov) => ov.id === link.optionValueId
        );
        const option = optionRows.find(
          (o) => o.id === optionValue?.optionId
        );
        return {
          optionId: option?.id ?? null,
          optionName: option?.name ?? null,
          valueId: optionValue?.id ?? null,
          value: optionValue?.value ?? null,
        };
      });
      return {
        ...variant,
        optionValues: linkedOptionValues,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        ...product,
        options: optionsWithValues,
        variants: variantsWithOptionValues,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/products/[id] error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch product",
      },
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
    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input" },
        { status: 400 }
      );
    }

    // Check product exists
    const [existing] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
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

    const result = await db.transaction(async (tx) => {
      // Build update data for product
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };
      if (name !== undefined) {
        updateData.name = name;
        let slug = slugify(name);
        const existingSlugs = await tx
          .select({ id: products.id, slug: products.slug })
          .from(products);
        const slugMap = new Map(
          existingSlugs.map((e) => [e.slug, e.id])
        );
        let suffix = 1;
        while (slugMap.has(slug) && slugMap.get(slug) !== id) {
          suffix++;
          slug = `${slugify(name)}-${suffix}`;
        }
        updateData.slug = slug;
      }
      if (description !== undefined) updateData.description = description;
      if (categoryId !== undefined) updateData.categoryId = categoryId;
      if (condition !== undefined) updateData.condition = condition;
      if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
      if (isActive !== undefined) updateData.isActive = isActive;

      const [product] = await tx
        .update(products)
        .set(updateData)
        .where(eq(products.id, id))
        .returning();

      // If options or variants are provided, delete old and recreate
      if (options !== undefined || variants !== undefined) {
        // Delete old options (cascades to option values and variant_option_values)
        await tx
          .delete(productOptions)
          .where(eq(productOptions.productId, id));

        // Delete old variants (cascades to variant_option_values)
        await tx
          .delete(productVariants)
          .where(eq(productVariants.productId, id));

        // Recreate options
        const optionValuesMap: string[][] = [];
        if (options && options.length > 0) {
          for (let oi = 0; oi < options.length; oi++) {
            const opt = options[oi];
            const [createdOption] = await tx
              .insert(productOptions)
              .values({
                productId: id,
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

        // Recreate variants
        let insertedVariants: (typeof productVariants.$inferSelect)[] =
          [];
        if (variants && variants.length > 0) {
          for (const v of variants) {
            const [createdVariant] = await tx
              .insert(productVariants)
              .values({
                productId: id,
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
              for (
                let oi = 0;
                oi < v.optionValueIndices.length;
                oi++
              ) {
                const vi = v.optionValueIndices[oi];
                if (
                  optionValuesMap[oi] &&
                  optionValuesMap[oi][vi]
                ) {
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
          const currentSlug =
            (updateData.slug as string) ?? existing.slug;
          const [defaultVariant] = await tx
            .insert(productVariants)
            .values({
              productId: id,
              name: "Default",
              sku: `${currentSlug}-default`,
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
      }

      return product;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("PUT /api/admin/products/[id] error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update product",
      },
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

    const [existing] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Cascade delete handles variants/options/links
    await db.delete(products).where(eq(products.id, id));

    return NextResponse.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    console.error("DELETE /api/admin/products/[id] error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete product",
      },
      { status: 500 }
    );
  }
}
