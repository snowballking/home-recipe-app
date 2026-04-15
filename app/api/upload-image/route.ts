import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ── POST /api/upload-image ──────────────────────────────────────
// Accepts a base64 image and uploads it to Supabase Storage.
// Returns the public URL.

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

  // Convert base64 to buffer
  const buffer = Buffer.from(image, "base64");

  // Generate a unique file name
  const ext = mimeType.split("/")[1] || "jpg";
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
