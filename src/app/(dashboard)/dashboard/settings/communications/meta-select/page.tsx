import { type MetaPendingPayload } from "@/app/api/meta/callback/route";
import { decrypt } from "@/lib/encryption";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { redirect } from "next/navigation";
import PageSelectForm from "./PageSelectForm";

type Props = {
  searchParams: { data?: string };
};

export default async function MetaPageSelectPage({ searchParams }: Props) {
  const raw = searchParams.data;

  if (!raw) {
    redirect("/dashboard/settings/communications?meta=error");
  }

  let payload: MetaPendingPayload;
  try {
    const decrypted = decrypt(Buffer.from(raw, "base64url").toString("utf8"));
    payload = JSON.parse(decrypted) as MetaPendingPayload;
  } catch {
    redirect("/dashboard/settings/communications?meta=error");
  }

  if (!payload.pages?.length) {
    redirect("/dashboard/settings/communications?meta=error");
  }

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader className="pb-4">
          {/* Meta gradient icon */}
          <div
            className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-base font-bold text-white"
            style={{
              background: "linear-gradient(135deg, #1877F2 0%, #E1306C 100%)",
            }}
          >
            M
          </div>
          <CardTitle className="text-lg">Connect a Facebook Page</CardTitle>
          <CardDescription>
            Choose which page to use for messaging clients on Instagram &amp;
            Facebook inside AutoWorx. You can change this at any time in
            Settings.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {payload.pages.length === 1 ? (
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              We found 1 page connected to your account.
            </p>
          ) : (
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              We found {payload.pages.length} pages connected to your account.
              Select the one you want to use.
            </p>
          )}

          <PageSelectForm pages={payload.pages} data={raw} />
        </CardContent>
      </Card>
    </div>
  );
}
