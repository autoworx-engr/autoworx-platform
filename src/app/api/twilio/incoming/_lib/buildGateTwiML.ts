import { twiml } from "twilio";

// A DTMF "human gate" before we ever ring anyone. Autodialers/robocallers
// almost never respond to an IVR prompt, so requiring a keypress filters out
// the bulk of spam/bot traffic without any paid spam-scoring add-on.
export function buildGateTwiML(input: {
  companyName: string | null;
  to: string;
}): string {
  const voiceResponse = new twiml.VoiceResponse();
  const name = input.companyName ?? "this business";

  const gather = voiceResponse.gather({
    input: ["dtmf"],
    numDigits: 1,
    timeout: 10,
    actionOnEmptyResult: true,
    method: "POST",
    action: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/incoming/gather?to=${encodeURIComponent(input.to)}`,
  });
  gather.say(
    { voice: "Polly.Joanna", language: "en-US" },
    `Thanks for calling ${name}. Please press 1 to continue.`,
  );

  // Reached only if Twilio doesn't redirect to the action URL at all
  // (defensive fallback — actionOnEmptyResult should prevent this).
  voiceResponse.hangup();

  return voiceResponse.toString();
}

// Shown when the caller pressed the wrong key or didn't respond in time.
export function buildGateFailedTwiML(): string {
  const voiceResponse = new twiml.VoiceResponse();
  voiceResponse.say(
    { voice: "Polly.Joanna", language: "en-US" },
    "We didn't receive a valid response. Goodbye.",
  );
  voiceResponse.hangup();
  return voiceResponse.toString();
}
