# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

autoworx-platform is the Next.js web admin dashboard and the **actual backend for the mobile app**. REST API routes for mobile live in `src/app/api/` and call Prisma directly via server actions.

See `autoworx-native/AGENTS.md` and `docs/MOBILE_API_ROUTES.md` for the full mobile API catalogue.

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
