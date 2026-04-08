import { NextResponse } from "next/server";
import { getZaiClient } from "@/lib/ai";
import { db } from "@/lib/db";

// Generate enemy image via AI and store directly in DB
// POST /api/generate-enemy
// Body: { name: string, prompt: string }
export async function POST(request: Request) {
  try {
    const { name, prompt } = await request.json();
    if (!name || !prompt) {
      return NextResponse.json({ error: "name and prompt required" }, { status: 400 });
    }

    const zai = await getZaiClient();
    if (!zai) {
      return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
    }

    const response = await zai.images.generations.create({
      prompt,
      size: "1024x1024",
    });
    const imageBase64 = response.data[0].base64;
    const buffer = Buffer.from(imageBase64, "base64");

    // Store in DB instead of public folder
    const imageId = name; // use the name as DB ID (e.g. "zombie", "tyrant")
    const image = await db.gameImage.upsert({
      where: { id: imageId },
      update: {
        data: buffer,
        mimeType: 'image/png',
        filePath: '',
        name: `Enemy: ${name}`,
        refKey: imageId,
        category: 'sprite',
      },
      create: {
        id: imageId,
        name: `Enemy: ${name}`,
        refKey: imageId,
        category: 'sprite',
        data: buffer,
        mimeType: 'image/png',
        filePath: '',
      },
    });

    return NextResponse.json({ success: true, name: image.id, size: buffer.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[generate-enemy] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
