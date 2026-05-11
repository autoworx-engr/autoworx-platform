import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

/**
 * Lazy-initialized singleton for the Anthropic SDK.
 * Reads ANTHROPIC_API_KEY from env at first call so tests can mock it.
 * Throws a clear error if the key is missing.
 */
export function getAnthropic(): Anthropic {
  if (_client) return _client;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env (see .env.example).",
    );
  }

  _client = new Anthropic({ apiKey });
  return _client;
}

/**
 * Canonical model IDs used by the copilot. Pinned snapshots.
 * Sonnet 4.6 is the default for tool-use / multi-step reasoning.
 * Haiku 4.5 is used for simple read-only lookups and session summarization.
 */
export const COPILOT_MODELS = {
  default: "claude-sonnet-4-6",
  fast: "claude-haiku-4-5-20251001",
} as const;

export type CopilotModelId =
  (typeof COPILOT_MODELS)[keyof typeof COPILOT_MODELS];
