import { Company } from "@prisma/client";
import crypto from "crypto";
import { google } from "googleapis";
import { Check } from "lucide-react";
import Link from "next/link";

function generateAuthURL() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/communication/client/auth`,
  );
  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/userinfo.email",
  ];
  const state = crypto.randomBytes(32).toString("hex");
  const authorizationUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    include_granted_scopes: true,
    state: state,
    prompt: "consent",
  });
  return authorizationUrl;
}

type Props = {};

const ConnectGoogle = ({ company }: { company: Company | null }) => {
  if (!company?.googleRefreshToken) {
    return (
      <Link
        href={generateAuthURL()}
        className="rounded-md bg-primary px-10 py-1.5 text-white"
      >
        Connect with Google
      </Link>
    );
  } else {
    return (
      <div className="flex items-center gap-5">
        <div className="flex flex-col gap-2">
          {/* <p className="text-gray-500">{company?.googleEmail}</p> */}
          <p className="flex items-center text-primary">
            <span className="mr-2 text-green-500">
              <Check size={20} />
            </span>
            <span> Connected with Google</span>
          </p>
        </div>

        <Link
          href={generateAuthURL()}
          className="rounded-md bg-primary px-5 py-1.5 text-white"
        >
          Reconnect
        </Link>
      </div>
    );
  }
};

export default ConnectGoogle;
