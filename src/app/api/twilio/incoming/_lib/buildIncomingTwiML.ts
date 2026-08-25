import { twiml } from "twilio";
import { INCOMING_DIAL_SUFFIXES, baseIdentity } from "@/lib/twilio/identity";

type DialAttributes = Parameters<twiml.VoiceResponse["dial"]>[0];

export type IncomingTwiMLInput = {
  callId: string;
  twilioPhoneNumber: string;
  companyName: string | null;
  callWhisperEnabled: boolean;
  callForwardingNumber: string | null;
  callRecordingEnabled: boolean;
  caller: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    fallbackName: string;
    photo: string | null;
  };
};

export function buildIncomingTwiML(input: IncomingTwiMLInput): string {
  const {
    callId,
    twilioPhoneNumber,
    companyName,
    callWhisperEnabled,
    callForwardingNumber,
    callRecordingEnabled,
    caller,
  } = input;

  const voiceResponse = new twiml.VoiceResponse();

  const recordingOptions: Partial<DialAttributes> = callRecordingEnabled
    ? {
        record: "record-from-answer" as const,
        recordingStatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/call-recording?callId=${callId}`,
        recordingStatusCallbackMethod: "POST",
      }
    : {};

  // Inform the caller that the call may be recorded (only if whisper is enabled)
  if (callWhisperEnabled) {
    const name = companyName ?? "this company";
    voiceResponse.say(
      { voice: "Polly.Joanna", language: "en-US" },
      `Thanks for calling ${name}. This call may be recorded for quality and training purposes.`,
    );
  }

  if (callForwardingNumber) {
    voiceResponse.dial(
      {
        timeout: 30,
        answerOnBridge: true,
        action: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/call-status`,
        ringTone: "us",
        ...recordingOptions,
      },
      callForwardingNumber,
    );
  } else {
    const dial = voiceResponse.dial({
      timeout: 60,
      answerOnBridge: true,
      action: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/call-status`,
      ...recordingOptions,
    });

    const clientIdentity = baseIdentity(twilioPhoneNumber);

    const callerName =
      caller.firstName && caller.lastName
        ? `${caller.firstName} ${caller.lastName}`.trim()
        : caller.firstName || caller.lastName || caller.fallbackName;

    for (const suffix of INCOMING_DIAL_SUFFIXES) {
      const clientDial = dial.client(`${clientIdentity}${suffix}`);
      clientDial.parameter({ name: "ClientName", value: callerName });
      clientDial.parameter({ name: "ClientId", value: caller.id.toString() });
      clientDial.parameter({ name: "ParentCallSid", value: callId });
      if (caller.photo && caller.photo !== "/images/default.png") {
        clientDial.parameter({ name: "ClientImage", value: caller.photo });
      }
    }
  }

  return voiceResponse.toString();
}
