import { getFromNumber } from "@/actions/communication/client/createTwilioCredentials";
import { db } from "@/lib/db";
import { getClientById } from "../../_actions/getClientById";
import { CallList } from "./CallList";
import SendCall from "./SendCall";

export default async function Phone({ clientId }: { clientId: number }) {
  const client = clientId && (await getClientById(clientId));
  let phoneNumber = await getFromNumber();

  let calls = await db.clientCall.findMany({
    where: {
      clientId: clientId,
    },
  });

  const enrichedCalls = calls.map((call) => {
    let recordingSid = null;

    if (call.recordingUrl) {
      const match = call.recordingUrl.match(/Recordings\/(RE[a-zA-Z0-9]+)/);
      recordingSid = match ? match[1] : null;
    }

    return {
      ...call,
      playableUrl: recordingSid
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/call-recording/${recordingSid}`
        : null,
    };
  });

  if (!client) return null;
  return (
    <div className="mx-auto flex h-[90%] w-full max-w-md flex-col items-center justify-center rounded-lg bg-gray-100 px-2 py-6 shadow-lg">
      <CallList data={enrichedCalls} twilioNumber={phoneNumber ?? ""} />
      <SendCall client={client} phoneNumber={phoneNumber} />
    </div>
  );
}
