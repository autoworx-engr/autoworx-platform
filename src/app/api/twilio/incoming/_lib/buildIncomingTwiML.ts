import { twiml } from "twilio";
import { INCOMING_DIAL_SUFFIXES, baseIdentity } from "@/lib/twilio/identity";

type DialAttributes = Parameters<twiml.VoiceResponse["dial"]>[0];

export type IncomingTwiMLInput = {
  callId: string;
  twilioPhoneNumber: string;
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

  // The "may be recorded" notice now plays once, upfront, as part of the
  // DTMF gate prompt (buildGateTwiML) — before the caller even presses 1 —
  // instead of repeating here after they've already been connected.

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
