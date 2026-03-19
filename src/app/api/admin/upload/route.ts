import { NextRequest, NextResponse } from "next/server";
import { getAdminFromCookie } from "@/lib/auth/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const BUCKET = "product-images";

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromCookie();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF, SVG" },
        { status: 400 }
      );
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "File too large. Maximum 5MB" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${timestamp}-${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json(
        {
          success: false,
          error: uploadError.message || "Failed to upload file",
        },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

    return NextResponse.json(
      { success: true, data: { url: publicUrl, path: filePath } },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to upload file",
      },
      { status: 500 }
    );
  }
}
