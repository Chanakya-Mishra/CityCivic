import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
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
    const buffer = Buffer.from(arrayBuffer);

    // 1. Extract EXIF metadata
    const exif = await extractExifData(buffer);

    // 2. Ensure public/uploads exists
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // 3. Generate unique filename
    const ext = path.extname(file.name) || ".jpg";
    const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      sizeBytes: buffer.length,
      mimeType: file.type,
      exif,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Upload failed." }, { status: 500 });
  }
}
