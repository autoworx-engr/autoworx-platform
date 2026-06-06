# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

autoworx-platform is the Next.js web admin dashboard and the **actual backend for the mobile app**. REST API routes for mobile live in `src/app/api/` and call Prisma directly via server actions.

See `autoworx-native/CLAUDE.md` and `docs/MOBILE_API_ROUTES.md` for the full mobile API catalogue.

---

## Strict Development Rules

These rules are NON-NEGOTIABLE and apply to ALL work on both autoworx-native and autoworx-platform:

### Package Version Lockdown

- Expo is pinned at ~53.0.27 for the Twilio call feature — DO NOT update Expo or any related package versions
- Only install packages compatible with Expo 53 / React Native 0.79.6
- DO NOT install deprecated packages or packages not supported by Expo or React Native
- Always verify compatibility before adding any new dependency

### Call Feature Protection

- DO NOT modify any call feature-related files, components, or functionality
- This includes useVoice.ts, CallProvider, and any Twilio-related code
- If a bug appears in call-related code, flag it but do not fix it without explicit approval

### Component Reuse

- Before creating any new component, search the codebase for similar existing components
- If a similar component exists, reuse and extend it instead of creating a new one
- New components must follow existing code structure and design patterns

### File Size Limit

- Maximum 200-250 lines of code per file — DO NOT exceed this limit
- If a file grows beyond 250 lines, refactor it into smaller files/components

---

## Copilot Development Conventions

The AI Copilot feature lives in `src/lib/copilot/` and `src/components/copilot/`. See `docs/copilot/` for full documentation.

### Key files to read first

- `src/lib/copilot/systemPrompt.ts` — the full system prompt; read this before changing any tool behavior
- `src/lib/copilot/tools/index.ts` — imports all 41 tool handlers; add new ones here
- `src/lib/copilot/canUserDo.ts` — `CopilotAction` enum and permission mapping
- `src/lib/copilot/internalApiClient.ts` — `callInternalApi` for write tools
- `src/lib/mobileAuth.ts` — `getCompanyIdFromBearer`, used by all Bearer-safe routes

### Adding a new read tool

1. Create `src/lib/copilot/tools/handlers/yourToolName.ts`
2. Use the `registerTool` pattern — copy any existing read handler as a template
3. Import it in `src/lib/copilot/tools/index.ts`
4. Add the permission action to the `CopilotAction` union and `PERMISSION_MAP` in `canUserDo.ts`
5. Add guidance in the relevant section of `systemPrompt.ts`

Read tools query Prisma directly. Every query MUST include `where: { companyId: ctx.companyId }`.

### Adding a new write tool

1. Create the Bearer-safe API route first (see pattern below)
2. Create the tool handler — use `callInternalApi` to call the route
3. Handle error cases explicitly: 404, 409, 400 → return `{ ok: false, error: "..." }` with actionable message
4. Register in `tools/index.ts`, add permission, add prompt guidance

### Adding a new Bearer-safe API route

```ts
import { getCompanyIdFromBearer } from "@/lib/mobileAuth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  const { companyId: companyIdParam } = await params;
  const jwtCompanyId = await getCompanyIdFromBearer(req);
  if (jwtCompanyId === null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const urlCompanyId = parseInt(companyIdParam, 10);
  if (isNaN(urlCompanyId) || urlCompanyId !== jwtCompanyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const companyId = jwtCompanyId; // JWT value wins — always use this, not the URL param

  // Every DB query must scope by companyId
  await db.yourModel.create({ data: { ...body, companyId } });
}
```

### Copilot invariants (never violate these)

- **Money math is always server-side** — the AI never supplies dollar totals or final prices. Compute in the tool's `execute()` function.
- **`tax` and `serviceFee` are stored as rates (%)**, not dollar amounts. Use `estimateMath.ts` helpers.
- **`companyId` always comes from the JWT** (`ctx.companyId` in tools, `jwtCompanyId` in routes) — never from AI input.
- **Write-before-read validation**: tools that write (e.g., `createEstimateTool`) must validate that provided IDs (clientId, vehicleId) belong to the company before proceeding.
- **All DB queries in read tools**: must include `where: { companyId: ctx.companyId }`.
