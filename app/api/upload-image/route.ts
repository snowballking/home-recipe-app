import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePlaceholderImage } from "@/lib/images/generate-placeholder";

// ── POST /api/upload-image ──────────────────────────────────────
// Accepts a base64 image and uploads it to Supabase Storage.
// Returns the public URL.
// ── PUT /api/upload-image ───────────────────────────────────────
// Generates an AI placeholder image for a recipe (Gemini), uploads it
// to Supabase Storage and returns the public URL. Lives in this file
// (not a new route file) because new API route files sometimes fail to
// read env vars on Vercel.

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

export async function PUT(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return Response.json(
      { error: "Image generation is not configured." },
      { status: 500 }
    );
  }

  let body: {
    title?: string;
    description?: string | null;
    cuisine?: string | null;
    ingredients?: { name: string }[];
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.title?.trim()) {
    return Response.json(
      { error: "A recipe title is required to generate an image." },
      { status: 400 }
    );
  }

  try {
    const { imageBase64, mimeType } = await generatePlaceholderImage(
      {
        title: body.title.trim(),
        description: body.description,
        cuisine: body.cuisine,
        ingredients: body.ingredients,
      },
      geminiApiKey
    );

    const buffer = Buffer.from(imageBase64, "base64");
    const ext = mimeType === "image/jpeg" ? "jpg" : "png";
    const fileName = `${user.id}/ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("recipe-images")
      .upload(fileName, buffer, { contentType: mimeType, upsert: false });

    if (uploadError) {
      console.error("Storage upload error (AI image):", uploadError);
      return Response.json(
        { error: "Failed to store generated image: " + uploadError.message },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("recipe-images").getPublicUrl(fileName);

    return Response.json({ url: publicUrl });
  } catch (err) {
    console.error("AI image generation failed:", err);
    return Response.json(
      { error: "Image generation failed. Please try again." },
      { status: 502 }
    );
  }
}
