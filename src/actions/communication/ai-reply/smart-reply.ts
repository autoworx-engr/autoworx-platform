"use server";

import { db } from "@/lib/db";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

export type SmartSuggestion = {
  text: string;
  rationale?: string;
  confidence?: number;
};

function stripFences(s: string) {
  let cleaned = s
    .replace(/^\s*```json\s*/i, "")
    .replace(/^\s*```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // If the response is wrapped in quotes, extract the JSON
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    try {
      // Try to parse it as a JSON string first - this handles escaped JSON
      const unescaped = JSON.parse(cleaned);
      if (typeof unescaped === "string") {
        cleaned = unescaped;
      }
    } catch {
      // If that fails, manually unescape
      cleaned = cleaned.slice(1, -1);
      cleaned = cleaned
        .replace(/\\"/g, '"')
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\\\/g, "\\");
    }
  }

  return cleaned;
}

export async function getSmartReplies({
  clientId,
  companyId,
  maxSuggestions = 3,
  tone = "friendly",
  mode = "suggest",
  draft,
  context = "sms",
}: {
  clientId: number;
  companyId: number;
  maxSuggestions?: number;
  tone?: "friendly" | "professional" | "casual";
  mode?: "suggest" | "enhance";
  draft?: string;
  context?: "sms" | "email";
}): Promise<SmartSuggestion[]> {
  // 1) Fetch context in parallel
  const client = await db.client.findUnique({
    where: { id: clientId },
    select: { id: true, leadId: true },
  });

  const recentMessagesPromise =
    context === "email"
      ? db.mailgunEmail.findMany({
          where: { clientId, companyId },
          orderBy: { createdAt: "desc" },
          take: 15,
          select: {
            id: true,
            subject: true,
            text: true,
            emailBy: true,
            createdAt: true,
          },
        })
      : db.clientSMS.findMany({
          where: { clientId, companyId },
          orderBy: { createdAt: "desc" },
          take: 15,
        });

  const vehiclesPromise = db.vehicle.findMany({
    where: { clientId },
    select: { id: true, year: true, make: true, model: true },
  });

  const leadPromise = client?.leadId
    ? db.lead.findUnique({
        where: { id: client.leadId },
        select: { services: true },
      })
    : Promise.resolve(null);

  const invoicesPromise = client?.id
    ? db.invoice.findMany({
        where: { clientId: client.id },
        orderBy: { createdAt: "desc" },
        take: 3, // cap for token efficiency
        include: {
          invoiceItems: { include: { service: true } },
          vehicle: { select: { year: true, make: true, model: true } },
        },
      })
    : Promise.resolve([] as const);

  const [recentMessages, vehicles, lead, invoices] = await Promise.all([
    recentMessagesPromise,
    vehiclesPromise,
    leadPromise,
    invoicesPromise,
  ]);

  // 2) Build compact context
  const convo =
    context === "email"
      ? (recentMessages as any[])
          .slice()
          .reverse()
          .map(
            (m: any) =>
              `${m.emailBy === "CLIENT" ? "Client" : "Shop"}: ${m.subject ? `[${m.subject}] ` : ""}${m.text.trim()}`
          )
          .join("\n")
      : (recentMessages as any[])
          .slice()
          .reverse()
          .map(
            (m: any) =>
              `${m.sentBy === "Client" ? "Client" : "Shop"}: ${m.message.trim()}`
          )
          .join("\n");

  const vehicleContext =
    vehicles.length > 0
      ? vehicles.map((v) => `- ${v.year} ${v.make} ${v.model}`).join("\n")
      : "None";

  const invoiceContext =
    invoices.length > 0
      ? invoices
          .map((inv) => {
            const services = inv.invoiceItems
              .map((ii) => ii.service?.name || "Unknown service")
              .join(", ");
            const v = inv.vehicle;
            const vStr = v
              ? `${v.year ?? ""} ${v.make ?? ""} ${v.model ?? ""}`.trim()
              : "";
            return `#${inv.id}${vStr ? ` • ${vStr}` : ""}: ${services}`;
          })
          .join("\n")
      : "No past invoices";

  const isEnhance = mode === "enhance" && !!draft?.trim();

  // 3) System prompt (JSON-only contract)
  const system =
    (isEnhance
      ? `
ROLE: Autoworx AI editor for auto restyling/garage ${context === "email" ? "emails" : "SMS"}.
STYLE: ${tone}, ${context === "email" ? "professional email format" : "≤320 chars"}. No emojis unless present in draft.
RULES:
- Preserve author intent; never invent prices or promises.
- If price is mentioned but details are missing, ask only essentials (model/year/service).
- If availability implied, propose max 2 tentative slots (do NOT confirm).
OUTPUT: JSON only (no prose, no code fences):
{"suggestions":[{"text":"..."}]}
`.trim()
      : `
ROLE: Autoworx AI assistant for auto restyling/garage ${context === "email" ? "emails" : "SMS"}.
STYLE: ${tone}, ${context === "email" ? "professional email format with proper greeting/closing" : "≤320 chars"}. No emojis unless the client used one.
CONTEXT RULES:
- Use vehicles, lead info, and past invoices when helpful.
- If price is asked but details missing, ask for model/year/service.
- If availability asked, propose 2–3 tentative slots (do NOT confirm).
- If frustration detected, begin with brief apology + solution.
OUTPUT: JSON only (no prose, no code fences):
{"suggestions":[{"text":"..."},{"text":"..."}]}
`.trim()) +
    `
STRICTNESS:
- Respond ONLY with valid JSON. Do not include commentary, markdown, or code fences.
- Keep replies ${context === "email" ? "professional and well-formatted" : "SMS-friendly and actionable"}.
`;

  const userBlock = isEnhance
    ? `Client Context:
Vehicles:
${vehicleContext}
Invoices:
${invoiceContext}

Conversation (most recent last):
${convo}

Rewrite/Enhance this draft (keep intent, improve clarity):
${draft}

Give ${Math.max(1, maxSuggestions)} improved options.
Do not ask for year/make/model if it's irrelevant or already present—use the last vehicle from context when needed.`
    : `Client Context:
Vehicles:
${vehicleContext}
Invoices:
${invoiceContext}

Conversation (most recent last):
${convo}

Give ${maxSuggestions} short, helpful suggestions.
Do not ask for year/make/model if it's irrelevant or already present—use the last vehicle from context when needed.`;

  // 4) Call Groq (OpenAI-compatible chat API)
  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant", // fast & cheap. For higher quality: "llama-3.1-70b-versatile"
    // model: "openai/gpt-oss-120b", // fast & cheap. For higher quality: "llama-3.1-70b-versatile"
    temperature: isEnhance ? 0.4 : 0.6,
    max_tokens: 512,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: userBlock },
    ],
  });

  const raw =
    completion.choices?.[0]?.message?.content?.toString() ??
    '{"suggestions":[{"text":"(no response)"}]}';

  // Debug logging (remove in production)
  console.log("[AI Reply] Raw response:", raw.substring(0, 300));

  // 5) Parse JSON robustly
  let parsed: any;
  let cleaned = stripFences(raw);
  console.log("[AI Reply] After stripFences:", cleaned.substring(0, 300));

  try {
    parsed = JSON.parse(cleaned);
    console.log(
      "[AI Reply] Parsed successfully, suggestions count:",
      parsed?.suggestions?.length
    );
  } catch (error) {
    console.log("[AI Reply] Initial parse failed:", (error as Error).message);

    // If cleaned still looks like escaped JSON, try one more unescape
    if (cleaned.includes('\\"') || cleaned.includes("\\n")) {
      try {
        console.log("[AI Reply] Attempting additional unescape...");
        const doubleUnescaped = cleaned
          .replace(/\\"/g, '"')
          .replace(/\\n/g, "\n")
          .replace(/\\\\/g, "\\");
        parsed = JSON.parse(doubleUnescaped);
        console.log("[AI Reply] Double unescape successful!");
      } catch {
        console.log(
          "[AI Reply] Double unescape failed, trying regex extraction"
        );
      }
    }

    // Try to extract JSON from the raw string if it's embedded
    if (!parsed) {
      try {
        const jsonMatch = raw.match(/\{[\s\S]*"suggestions"[\s\S]*\}/);
        if (jsonMatch) {
          console.log("[AI Reply] Found JSON match, parsing...");
          parsed = JSON.parse(stripFences(jsonMatch[0]));
        } else {
          // Fallback: wrap the raw string as one suggestion
          console.log("[AI Reply] No JSON found, using raw text as fallback");
          return [{ text: raw.slice(0, context === "email" ? 2000 : 320) }];
        }
      } catch {
        // Final fallback
        console.log("[AI Reply] All parsing failed, using raw text");
        return [{ text: raw.slice(0, context === "email" ? 2000 : 320) }];
      }
    }
  }

  // Check if parsed.suggestions exists, if not, check if parsed itself is the array
  let suggestionsArray = parsed?.suggestions;

  if (!Array.isArray(suggestionsArray) && Array.isArray(parsed)) {
    suggestionsArray = parsed;
  }

  if (!Array.isArray(suggestionsArray)) {
    console.log("[AI Reply] No valid suggestions array found");
    return [];
  }

  const suggestions: SmartSuggestion[] = suggestionsArray
    .filter((s: any) => s?.text)
    .slice(0, maxSuggestions)
    .flatMap((s: any) => {
      let finalText = String(s.text).trim();

      // Check if the text itself is stringified JSON and parse it
      if (finalText.startsWith('{"') || finalText.startsWith("{")) {
        try {
          console.log(
            "[AI Reply] Detected JSON-like text, attempting to parse..."
          );
          const innerParsed = JSON.parse(finalText);

          if (
            innerParsed.suggestions &&
            Array.isArray(innerParsed.suggestions)
          ) {
            // This text field contains the whole response - extract all suggestions!
            console.log(
              "[AI Reply] WARNING: Text field contains nested JSON with",
              innerParsed.suggestions.length,
              "suggestions, extracting them all"
            );
            return innerParsed.suggestions
              .filter((innerS: any) => innerS?.text)
              .slice(0, maxSuggestions)
              .map((innerS: any) => ({
                text: String(innerS.text).slice(
                  0,
                  context === "email" ? 2000 : 320
                ),
                rationale: innerS.rationale,
                confidence: innerS.confidence,
              }));
          }
        } catch (e) {
          console.log("[AI Reply] Not valid JSON, using as plain text");
          // Not JSON, use as is
        }
      }

      return {
        text: finalText.slice(0, context === "email" ? 2000 : 320),
        rationale: s.rationale,
        confidence: s.confidence,
      };
    });

  console.log("[AI Reply] Parsed suggestions count:", suggestions.length);
  console.log(
    "[AI Reply] First suggestion:",
    suggestions[0]?.text.substring(0, 100)
  );

  return suggestions;
}
