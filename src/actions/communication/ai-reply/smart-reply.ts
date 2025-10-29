// // app/actions/smart-replies.ts
// "use server";

// import { db } from "@/lib/db";
// import { GoogleGenerativeAI } from "@google/generative-ai";

// const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

// export type SmartSuggestion = {
//   text: string;
//   rationale?: string;
//   confidence?: number;
// };

// function stripFences(s: string) {
//   return s
//     .replace(/^```json\s*/i, "")
//     .replace(/^```\s*/i, "")
//     .replace(/```$/i, "");
// }

// export async function getSmartReplies({
//   clientId,
//   companyId,
//   maxSuggestions = 3,
//   tone = "friendly",
//   mode = "suggest",
//   draft,
// }: {
//   clientId: number;
//   companyId: number;
//   maxSuggestions?: number;
//   tone?: "friendly" | "professional" | "casual";
//   mode?: "suggest" | "enhance";
//   draft?: string;
// }): Promise<SmartSuggestion[]> {
//   // Get client (for leadId)
//   const client = await db.client.findUnique({
//     where: { id: clientId },
//     select: { id: true, leadId: true },
//   });

//   const recentSmsPromise = db.clientSMS.findMany({
//     where: { clientId, companyId },
//     orderBy: { createdAt: "desc" },
//     take: 15,
//   });

//   const vehiclesPromise = db.vehicle.findMany({
//     where: { clientId },
//     select: { id: true, year: true, make: true, model: true },
//   });

//   const leadPromise: Promise<{
//     services: string;
//   } | null> = client?.leadId
//     ? db.lead.findUnique({
//         where: { id: client.leadId },
//         select: {
//           services: true,
//         },
//       })
//     : Promise.resolve(null);

//   const invoicesPromise = client?.id
//     ? db.invoice.findMany({
//         where: { clientId: client.id },
//         include: {
//           invoiceItems: { include: { service: true } },
//           vehicle: true,
//         },
//       })
//     : Promise.resolve([]);

//   // Run in parallel
//   const [recentSms, vehicles, lead, invoices] = await Promise.all([
//     recentSmsPromise,
//     vehiclesPromise,
//     leadPromise,
//     invoicesPromise,
//   ]);

//   // Conversation
//   const convo = recentSms
//     .slice()
//     .reverse()
//     .map(
//       (m) => `${m.sentBy === "Client" ? "Client" : "Shop"}: ${m.message.trim()}`
//     )
//     .join("\n");

//   // Vehicles context
//   const vehicleContext =
//     vehicles.length > 0
//       ? vehicles.map((v) => `- ${v.year} ${v.make} ${v.model}`).join("\n")
//       : "None";

//   // Invoice context
//   const invoiceContext =
//     invoices.length > 0
//       ? invoices
//           .map((inv) => {
//             const services = inv.invoiceItems
//               .map((ii) => ii.service?.name || "Unknown service")
//               .join(", ");
//             return `Invoice #${inv.id} for vehicle ${inv.vehicle?.year} ${inv.vehicle?.make} ${inv.vehicle?.model}: ${services}`;
//           })
//           .join("\n")
//       : "No past invoices";

//   const isEnhance = mode === "enhance" && !!draft?.trim();

//   const system = isEnhance
//     ? `
// You are Autoworx AI editing SMS for an auto restyling/garage.
// - Improve clarity, keep tone ${tone}, keep < 320 chars. No emojis unless present.
// - Preserve the author’s intent; do not invent prices/promises.
// - If price is mentioned but details are missing, ask only essentials (model/year/service).
// - If availability is implied, propose at most 2 tentative slots (do NOT confirm).
// Return ONLY JSON (no code fences):
// {"suggestions":[{"text":"..."}]}
// `.trim()
//     : `
// You are Autoworx AI drafting short SMS replies for an auto restyling/garage.
// - Tone: ${tone}. Under 320 chars. No emojis unless the client used one.
// - Use context about vehicles, lead info, and invoices when helpful.
// - If price asked but info missing, ask for model/year/service details.
// - If availability asked, propose 2–3 tentative slots (do not confirm).
// - If client seems upset, start with a brief apology + solution.
// Return ONLY JSON (no code fences):
// {"suggestions":[{"text":"..."},{"text":"..."}]}
// `.trim();

//   const model = genAI.getGenerativeModel({
//     model: "gemini-2.0-flash",
//     systemInstruction: { text: system },
//     generationConfig: {
//       temperature: isEnhance ? 0.4 : 0.6,
//       topP: 0.9,
//       maxOutputTokens: 512,
//       responseMimeType: "application/json",
//     },
//   });

//   const userBlock = isEnhance
//     ? `Client Context:\nVehicles:\n${vehicleContext}\n}\nInvoices:\n${invoiceContext}\n\nRewrite/Enhance this draft:\nConversation (most recent last):\n${convo}\n\n${draft}\n\nGive ${Math.max(
//         1,
//         maxSuggestions
//       )} improved options.`
//     : `Client Context:\nVehicles:\n${vehicleContext}\nInvoices:\n${invoiceContext}\n\nConversation (most recent last):\n${convo}\n\n\n\nGive ${maxSuggestions} suggestions.`;

//   const result = await model.generateContent({
//     contents: [
//       {
//         role: "user",
//         parts: [
//           {
//             text:
//               userBlock +
//               "\n Don't ask for vehicle year/make/model if not relevant/its in the context. If it is in context, use the last vehicle model as your reference from the context",
//           },
//         ],
//       },
//     ],
//   });

//   const raw = result.response.text() || "{}";
//   const json = stripFences(raw);

//   let parsed: any;
//   try {
//     parsed = JSON.parse(json);
//   } catch {
//     return [{ text: raw.slice(0, 300) }];
//   }

//   const suggestions: SmartSuggestion[] = Array.isArray(parsed?.suggestions)
//     ? parsed.suggestions
//         .filter((s: any) => s?.text)
//         .slice(0, maxSuggestions)
//         .map((s: any) => ({
//           text: String(s.text),
//           rationale: s.rationale,
//           confidence: s.confidence,
//         }))
//     : [];

//   return suggestions;
// }

// app/actions/smart-replies.ts
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
  return s
    .replace(/^\s*```json\s*/i, "")
    .replace(/^\s*```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export async function getSmartReplies({
  clientId,
  companyId,
  maxSuggestions = 3,
  tone = "friendly",
  mode = "suggest",
  draft,
}: {
  clientId: number;
  companyId: number;
  maxSuggestions?: number;
  tone?: "friendly" | "professional" | "casual";
  mode?: "suggest" | "enhance";
  draft?: string;
}): Promise<SmartSuggestion[]> {
  // 1) Fetch context in parallel
  const client = await db.client.findUnique({
    where: { id: clientId },
    select: { id: true, leadId: true },
  });

  const recentSmsPromise = db.clientSMS.findMany({
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
    : Promise.resolve(null as const);

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

  const [recentSms, vehicles, lead, invoices] = await Promise.all([
    recentSmsPromise,
    vehiclesPromise,
    leadPromise,
    invoicesPromise,
  ]);

  // 2) Build compact context
  const convo = recentSms
    .slice()
    .reverse()
    .map(
      (m) => `${m.sentBy === "Client" ? "Client" : "Shop"}: ${m.message.trim()}`
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
ROLE: Autoworx AI editor for auto restyling/garage SMS.
STYLE: ${tone}, ≤320 chars. No emojis unless present in draft.
RULES:
- Preserve author intent; never invent prices or promises.
- If price is mentioned but details are missing, ask only essentials (model/year/service).
- If availability implied, propose max 2 tentative slots (do NOT confirm).
OUTPUT: JSON only (no prose, no code fences):
{"suggestions":[{"text":"..."}]}
`.trim()
      : `
ROLE: Autoworx AI assistant for auto restyling/garage SMS.
STYLE: ${tone}, ≤320 chars. No emojis unless the client used one.
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
- Keep replies SMS-friendly and actionable.
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
    messages: [
      { role: "system", content: system },
      { role: "user", content: userBlock },
    ],
  });

  const raw =
    completion.choices?.[0]?.message?.content?.toString() ??
    '{"suggestions":[{"text":"(no response)"}]}';

  // 5) Parse JSON robustly
  let parsed: any;
  try {
    parsed = JSON.parse(stripFences(raw));
  } catch {
    // Fallback: wrap the raw string as one suggestion
    return [{ text: raw.slice(0, 300) }];
  }

  const suggestions: SmartSuggestion[] = Array.isArray(parsed?.suggestions)
    ? parsed.suggestions
        .filter((s: any) => s?.text)
        .slice(0, maxSuggestions)
        .map((s: any) => ({
          text: String(s.text).slice(0, 320), // hard cap for SMS
          rationale: s.rationale,
          confidence: s.confidence,
        }))
    : [];

  return suggestions;
}