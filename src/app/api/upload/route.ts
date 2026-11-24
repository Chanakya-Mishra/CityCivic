import { NextResponse } from "next/server";
import sharp from "sharp";
import { extractExifData } from "@/lib/exif";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }

    // Validate mime type
    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (!validMimes.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported image format (${file.type}). Please upload JPEG, PNG, or WEBP.` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const rawBuffer = Buffer.from(arrayBuffer);

    // 1. Extract EXIF metadata from raw uncompressed binary before processing
    const exif = await extractExifData(rawBuffer);

    // 2. In-memory resize & compression with sharp (Vercel Serverless safe - no filesystem disk writes)
    let optimizedBuffer: Buffer;
    let mimeType = "image/jpeg";

    try {
      optimizedBuffer = await sharp(rawBuffer)
        .rotate() // Auto-orient using EXIF orientation tag
        .resize({
          width: 1280,
          height: 1280,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();
    } catch (sharpErr) {
      console.warn("Sharp optimization fallback to raw buffer:", sharpErr);
      optimizedBuffer = rawBuffer;
      mimeType = file.type || "image/jpeg";
    }

    // 3. Encode to Base64 Data URI
    const dataUri = `data:${mimeType};base64,${optimizedBuffer.toString("base64")}`;

    return NextResponse.json({
      success: true,
      url: dataUri,
      sizeBytes: optimizedBuffer.length,
      mimeType,
      exif,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message || "Upload failed." }, { status: 500 });
  }
}
