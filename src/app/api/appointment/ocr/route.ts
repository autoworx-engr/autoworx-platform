import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const PROMPTS: Record<string, string> = {
  license:
    "This image shows a vehicle license plate. Extract ONLY the plate number — letters and digits, no spaces or dashes. Reply with just the plate number, nothing else.",
  vin: "This image shows a vehicle VIN (Vehicle Identification Number). Extract ONLY the 17-character VIN — uppercase letters (A-Z excluding I, O, Q) and digits 0-9. Reply with just the 17-character VIN, nothing else.",
};

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType = "image/jpeg", field } = await req.json();

    if (!imageBase64 || !field || !PROMPTS[field]) {
      return NextResponse.json(
        {
          success: false,
          message: "imageBase64 and field (license|vin) required",
        },
        { status: 400 },
      );
    }

    const chat = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPTS[field] },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
          ],
        },
      ],
      max_tokens: 64,
      temperature: 0,
    });

    const raw = chat.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ success: true, text: raw });
  } catch (err) {
    console.error("OCR error:", err);
    return NextResponse.json(
      { success: false, message: "OCR failed" },
      { status: 500 },
    );
  }
}
