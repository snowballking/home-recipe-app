import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ── POST /api/upload-image ──────────────────────────────────────
// Accepts a base64 image and uploads it to Supabase Storage.
// Returns the public URL.

// Allowed image types → file extension (SVG excluded: it can carry scripts)
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/heic": "heic",
  "image/heif": "heif",
};

// Matches the 10 MB limit enforced client-side
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: { image: string; mimeType: string; fileName?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { image, mimeType } = body;
  if (!image || !mimeType) {
    return Response.json(
      { error: "image (base64) and mimeType are required." },
      { status: 400 }
    );
  }

  const ext = ALLOWED_IMAGE_TYPES[mimeType];
  if (!ext) {
    return Response.json(
      { error: "Unsupported image type. Please upload a JPG, PNG, WebP, GIF, AVIF, or HEIC image." },
      { status: 400 }
    );
  }

  // Convert base64 to buffer
  const buffer = Buffer.from(image, "base64");
  if (buffer.length === 0) {
    return Response.json({ error: "Empty image data." }, { status: 400 });
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    return Response.json({ error: "Image is too large (max 10 MB)." }, { status: 400 });
  }

  // Generate a unique file name
  const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("recipe-images")
    .upload(fileName, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return Response.json(
      { error: "Failed to upload image: " + uploadError.message },
      { status: 500 }
    );
  }

  // Get the public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("recipe-images").getPublicUrl(fileName);

  return Response.json({ url: publicUrl });
}
