import { getFromNumber } from "@/actions/communication/client/createTwilioCredentials";
import { getFromNumberInfobip } from "@/actions/communication/client/createInfobipConfig";
import { getSmsGateway } from "@/actions/communication/client/createInfobipConfig";
import { db } from "@/lib/db";
import { getCompanyEntitlements } from "@/lib/platform-billing/entitlement-service";
import { getClientById } from "../../_actions/getClientById";
import { CallList } from "./CallList";
import SendCall from "./SendCall";

export default async function Phone({ clientId }: { clientId: number }) {
  const client = clientId && (await getClientById(clientId));

  // Determine which provider to use
  const smsGateway = await getSmsGateway();
  const provider = (smsGateway as "TWILIO" | "INFOBIP") || "TWILIO";

  // Get phone number based on provider
  let phoneNumber =
    provider === "TWILIO"
      ? await getFromNumber()
      : await getFromNumberInfobip();

  let calls = await db.clientCall.findMany({
    where: {
      clientId: clientId,
    },
    orderBy: {
      createdAt: "asc",
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

  const entitlements = await getCompanyEntitlements(client.companyId);
  const canUseVoice = entitlements?.canUseVoice ?? false;
  return (
    <div className=" overflow-y-auto h-full w-full  rounded-2xl bg-gradient-to-br from-white via-slate-50/50 to-white  shadow-lg ring-1 ring-slate-900/5 flex flex-col px-4 pt-4">
      <CallList data={enrichedCalls} clientId={clientId} />
      <SendCall
        client={client}
        phoneNumber={phoneNumber}
        provider={provider}
        canUseVoice={canUseVoice}
      />
    </div>
  );
}
