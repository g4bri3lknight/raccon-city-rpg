import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";
import path from "path";

const outputDir = path.join(process.cwd(), "public/images/enemies");

export async function POST(request: Request) {
  try {
    const { name, prompt } = await request.json();
    if (!name || !prompt) {
      return NextResponse.json({ error: "name and prompt required" }, { status: 400 });
    }
    const zai = await ZAI.create();
    const response = await zai.images.generations.create({
      prompt,
      size: "1024x1024",
    });
    const imageBase64 = response.data[0].base64;
    const buffer = Buffer.from(imageBase64, "base64");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const filePath = path.join(outputDir, `${name}.png`);
    fs.writeFileSync(filePath, buffer);
    return NextResponse.json({ success: true, name, size: buffer.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
