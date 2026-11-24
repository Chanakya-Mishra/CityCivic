import sharp from "sharp";
import path from "path";
import fs from "fs";

const SRC_PATH = "/Users/chanakyasmacairm5/.gemini/antigravity/brain/6194ce6b-4194-4afd-8657-0d8bea776714/.user_uploaded/media_1795519898059_a99e4a07.jpg";

function makeTransparent(data: Buffer, width: number, height: number): Promise<Buffer> {
  const output = Buffer.alloc(width * height * 4);

  // Background color is approximately rgb(237, 243, 243)
  const bgR = 237, bgG = 243, bgB = 243;

  for (let i = 0; i < width * height; i++) {
    const srcIdx = i * 3;
    const destIdx = i * 4;
    const r = data[srcIdx];
    const g = data[srcIdx + 1];
    const b = data[srcIdx + 2];

    output[destIdx] = r;
    output[destIdx + 1] = g;
    output[destIdx + 2] = b;

    // Euclidean distance in RGB color space
    const dist = Math.sqrt(
      Math.pow(r - bgR, 2) + Math.pow(g - bgG, 2) + Math.pow(b - bgB, 2)
    );

    if (dist < 18) {
      output[destIdx + 3] = 0; // Fully transparent
    } else if (dist < 32) {
      // Smooth anti-aliased edge
      const alpha = Math.round(((dist - 18) / 14) * 255);
      output[destIdx + 3] = alpha;
    } else {
      output[destIdx + 3] = 255; // Fully opaque
    }
  }

  return sharp(output, {
    raw: { width, height, channels: 4 },
  }).png().toBuffer();
}

async function run() {
  console.log("Generating CityCivic brand assets from source logo...");

  // 1. Full Logo extraction (Left: 340, Top: 110, Width: 344, Height: 335)
  const fullLogoCrop = await sharp(SRC_PATH)
    .extract({ left: 340, top: 110, width: 344, height: 335 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const transparentFullLogo = await makeTransparent(fullLogoCrop.data, fullLogoCrop.info.width, fullLogoCrop.info.height);

  // Save public/logo.png
  fs.writeFileSync(path.join(process.cwd(), "public", "logo.png"), transparentFullLogo);
  console.log("✅ Created public/logo.png (Full Logo)");

  // Also save a non-transparent crisp version public/logo-card.png
  await sharp(SRC_PATH)
    .extract({ left: 340, top: 110, width: 344, height: 335 })
    .png()
    .toFile(path.join(process.cwd(), "public", "logo-card.png"));
  console.log("✅ Created public/logo-card.png");

  // 2. Square Map-Pin Icon Extraction (Center at 512, 226)
  // Left: 397, Top: 111, Width: 230, Height: 230
  const iconCrop = await sharp(SRC_PATH)
    .extract({ left: 397, top: 111, width: 230, height: 230 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const transparentIcon = await makeTransparent(iconCrop.data, iconCrop.info.width, iconCrop.info.height);

  // Resize to 512x512 with subtle padding for app icons & favicon
  const paddedIcon = await sharp(transparentIcon)
    .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(process.cwd(), "public", "logo-icon.png"), paddedIcon);
  fs.writeFileSync(path.join(process.cwd(), "public", "favicon.png"), paddedIcon);
  console.log("✅ Created public/logo-icon.png & public/favicon.png");

  // Create src/app/icon.png (Next.js 15 official App Icon)
  fs.writeFileSync(path.join(process.cwd(), "src", "app", "icon.png"), paddedIcon);
  fs.writeFileSync(path.join(process.cwd(), "src", "app", "apple-icon.png"), paddedIcon);
  console.log("✅ Created src/app/icon.png & src/app/apple-icon.png (Next.js auto favicon)");

  // Create standard 32x32 & 48x48 favicon.ico in public/
  const favicon32 = await sharp(transparentIcon)
    .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(process.cwd(), "public", "favicon.ico"), favicon32);
  console.log("✅ Created public/favicon.ico");

  console.log("\n🎉 All brand assets successfully generated!");
}

run().catch(console.error);
