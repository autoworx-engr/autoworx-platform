"use server";

import { db } from "@/lib/db";
import OpenAI from "openai";
import crypto from "crypto";
import { getCompanyEntitlements } from "@/lib/platform-billing/entitlement-service";

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: "https://api.deepseek.com",
});

export type SmartSuggestion = {
  text: string;
  rationale?: string;
  confidence?: number;
};

// Simple in-memory cache with TTL (15 minutes)
const suggestionCache = new Map<
  string,
  { data: SmartSuggestion[]; timestamp: number }
>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

function getCacheKey(params: {
  clientId: number;
  companyId: number;
  convo: string;
  mode: string;
  draft?: string;
  tone: string;
}): string {
  const str = JSON.stringify(params);
  return crypto.createHash("md5").update(str).digest("hex");
}

function getCachedSuggestions(key: string): SmartSuggestion[] | null {
  const cached = suggestionCache.get(key);
  if (!cached) return null;

  const isExpired = Date.now() - cached.timestamp > CACHE_TTL;
  if (isExpired) {
    suggestionCache.delete(key);
    return null;
  }

  return cached.data;
}

function setCachedSuggestions(key: string, data: SmartSuggestion[]): void {
  suggestionCache.set(key, { data, timestamp: Date.now() });

  // Cleanup old entries (keep cache size manageable)
  if (suggestionCache.size > 100) {
    const oldestKey = suggestionCache.keys().next().value;
    if (oldestKey) {
      suggestionCache.delete(oldestKey);
    }
  }
}

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
  const entitlements = await getCompanyEntitlements(companyId);
  if (!entitlements.aiSmartReplies) {
    return [];
  }

  // Enhance mode rewrites the author's OWN draft. The draft is the only
  // permitted source of content, so we deliberately skip fetching the
  // conversation/vehicles/invoices — data we must not use shouldn't be
  // loaded, sent to the model, or paid for.
  const isEnhance = mode === "enhance" && !!draft?.trim();

  // 1) Fetch context in parallel (suggest mode only)
  const client = isEnhance
    ? null
    : await db.client.findUnique({
        where: { id: clientId },
        select: { id: true, leadId: true },
      });

  const recentMessagesPromise = isEnhance
    ? Promise.resolve([] as any[])
    : context === "email"
      ? db.mailgunEmail.findMany({
          where: { clientId, companyId },
          orderBy: { createdAt: "desc" },
          take: 10, // Reduced from 15 to save tokens
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
          take: 10, // Reduced from 15 to save tokens
        });

  const vehiclesPromise = isEnhance
    ? Promise.resolve([] as any[])
    : db.vehicle.findMany({
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
              `${m.emailBy === "CLIENT" ? "Client" : "Shop"}: ${m.subject ? `[${m.subject}] ` : ""}${m.text.trim().slice(0, 500)}`, // Limit text length
          )
          .join("\n")
      : (recentMessages as any[])
          .slice()
          .reverse()
          .map(
            (m: any) =>
              `${m.sentBy === "Client" ? "Client" : "Shop"}: ${m.message.trim().slice(0, 320)}`, // Limit message length
          )
          .join("\n");

  // Suggest mode has nothing to reply to without history. Enhance mode works
  // off the draft alone, so polishing the first message of a brand-new
  // conversation must still work.
  if (!isEnhance && !convo.trim()) {
    return [];
  }

  const vehicleContext =
    vehicles.length > 0
      ? vehicles.map((v) => `- ${v.year} ${v.make} ${v.model}`).join("\n")
      : "None";

  const invoiceContext =
    invoices.length > 0
      ? invoices
          .map((inv) => {
            const services = inv.invoiceItems
              .slice(0, 3) // Limit to first 3 services per invoice
              .map((ii) => ii.service?.name || "Unknown")
              .join(", ");
            const v = inv.vehicle;
            const vStr = v
              ? `${v.year ?? ""} ${v.make ?? ""} ${v.model ?? ""}`.trim()
              : "";
            return `#${inv.id}${vStr ? ` • ${vStr}` : ""}: ${services}`;
          })
          .join("\n")
      : "No past invoices";

  // Check cache before making AI call
  const cacheKey = getCacheKey({
    clientId,
    companyId,
    convo,
    mode,
    draft,
    tone,
  });

  const cachedSuggestions = getCachedSuggestions(cacheKey);
  if (cachedSuggestions) {
    console.log("[AI Reply] Returning cached suggestions");
    return cachedSuggestions;
  }

  // 3) System prompt (JSON-only contract)
  const system =
    (isEnhance
      ? `
ROLE: You are a copy editor for an auto restyling/garage shop. A staff member
has written a draft ${context === "email" ? "email" : "SMS"} to a customer. Your job is to rewrite THEIR
draft so it reads clearly and professionally.

You are EDITING the author's text. You are NOT writing a reply, NOT answering
the customer, and NOT continuing a conversation.

STYLE: ${tone} tone, ${context === "email" ? "proper email structure with short paragraphs" : "plain SMS, 320 characters max"}.
Write in the same language the draft uses. Keep emojis only if the draft already has them.

WHAT TO IMPROVE:
- Spelling, grammar, punctuation, capitalization
- Awkward phrasing, run-on sentences, unclear or abrupt wording
- Politeness and professionalism, without sounding stiff or corporate
- Flow and readability${context === "email" ? " (a neutral greeting/closing may be added if missing — never invent a name)" : ""}

HARD RULES — the draft is your ONLY source of information:
- Add NO new facts. No prices, dates, times, durations, vehicle details, part or
  service names, people's names, addresses, phone numbers, or links unless they
  already appear in the draft.
- Add NO promises, commitments, guarantees, or availability the author didn't write.
- Add NO questions the author didn't ask.
- Do NOT answer, respond to, or address anything the customer said — you only
  have the author's draft, and you must not guess at what came before it.
- Do NOT drop meaning. Every point the author made must survive the rewrite.
- Keep the author's placeholders (e.g. [date], XX:XX, TBD) exactly as written.
- If the draft is already clear and correct, change little or nothing.

Rewriting is allowed. Inventing is not. When in doubt, say less.

OUTPUT: JSON only (no prose, no code fences):
{"suggestions":[{"text":"..."}]}
`.trim()
      : `
ROLE: Autoworx AI assistant for auto restyling/garage ${context === "email" ? "emails" : "SMS"}.
STYLE: ${tone}, ${context === "email" ? "professional email format with proper greeting/closing" : "≤320 chars"}. No emojis unless the client used one.

CRITICAL INSTRUCTIONS:
1. ANALYZE THE CONVERSATION DEEPLY:
   - What is the client asking about or discussing?
   - What is the current state/status of the conversation?
   - What would be the NATURAL NEXT REPLY based on the flow?

2. CONTEXT-AWARE RESPONSES:
   - If client asks a question, answer it directly (use vehicles/invoices context when relevant)
   - If client requests a service, acknowledge and suggest next steps
   - If client asks about price, provide info or ask for specifics (model/year/service) if missing
   - If client asks about availability, propose 2–3 specific tentative time slots
   - If client expresses frustration/complaint, acknowledge empathetically and offer solution
   - If client confirms/accepts, respond appropriately to move forward
   - If shop just sent info, suggest follow-up or ask if they need anything else

3. USE AVAILABLE CONTEXT INTELLIGENTLY:
   - Reference specific vehicles when relevant ("for your 2020 Honda Civic")
   - Mention past services when helpful
   - Don't ask for info already in context (year/make/model, past services)

4. MAKE SUGGESTIONS DIVERSE:
   - Each suggestion should offer a different approach/tone
   - Vary between informative, questioning, and action-oriented replies

OUTPUT: JSON only (no prose, no code fences):
{"suggestions":[{"text":"..."},{"text":"..."},{"text":"..."}]}
`.trim()) +
    `
STRICTNESS:
- Respond ONLY with valid JSON. Do not include commentary, markdown, or code fences.
- Keep replies ${context === "email" ? "professional and well-formatted" : "SMS-friendly and actionable"}.
- ALWAYS base suggestions on what makes sense as the NEXT reply in this specific conversation.
`;

  const userBlock = isEnhance
    ? `Polish the draft below. It is the only content you may use.

--- DRAFT START ---
${draft}
--- DRAFT END ---

Return ${Math.max(1, maxSuggestions)} polished versions of that draft.

Every version must convey exactly what the draft conveys — same facts, same
intent, same commitments — just written better. Vary the wording and structure
between versions; never vary the meaning. Do not add anything the draft doesn't
already say.`
    : `Client Context:
Vehicles:
${vehicleContext}
Lead Services Interested In: ${lead?.services || "None"}
Recent Invoices:
${invoiceContext}

Conversation History (most recent last):
${convo}

TASK: Analyze the conversation above and generate ${maxSuggestions} smart reply suggestions.

INSTRUCTIONS:
1. Identify what the conversation is about and what the client's last message implies
2. Determine what would be the most helpful NEXT response from the shop
3. Create ${maxSuggestions} different reply options that:
   - Directly address the client's last message
   - Use context (vehicles, services, invoices) when relevant
   - Offer different tones/approaches (e.g., one detailed, one brief, one with follow-up question)
   - Sound natural as the NEXT message in this conversation

DO NOT:
- Ask for information already available in context
- Provide generic responses that don't relate to the conversation
- Repeat what was already said
- Ignore the conversation flow

Each suggestion should be a complete, ready-to-send reply that makes sense as the next message.`;

  // 4) Call DeepSeek (OpenAI-compatible chat API)
  // Thinking mode is on by default on deepseek-v4-flash, which ignores
  // `temperature` and adds chain-of-thought latency neither reply suggestions
  // nor draft edits need — disable it for fast, temperature-controlled output.
  const completion = await deepseek.chat.completions.create({
    model: "deepseek-v4-flash",
    // Enhance is a faithfulness task (rewrite what's there), so keep sampling
    // low — drift here means invented facts. Suggest is a generative task and
    // benefits from more variety across the options.
    temperature: isEnhance ? 0.3 : 0.7,
    max_tokens: 400, // Reduced from 512 to save costs (sufficient for 3 suggestions)
    response_format: { type: "json_object" },
    thinking: { type: "disabled" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: userBlock },
    ],
  } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming);

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
      parsed?.suggestions?.length,
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
          "[AI Reply] Double unescape failed, trying regex extraction",
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
            "[AI Reply] Detected JSON-like text, attempting to parse...",
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
              "suggestions, extracting them all",
            );
            return innerParsed.suggestions
              .filter((innerS: any) => innerS?.text)
              .slice(0, maxSuggestions)
              .map((innerS: any) => ({
                text: String(innerS.text).slice(
                  0,
                  context === "email" ? 2000 : 320,
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
    suggestions[0]?.text.substring(0, 100),
  );

  // Cache the results
  setCachedSuggestions(cacheKey, suggestions);

  return suggestions;
}
