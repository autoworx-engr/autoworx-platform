import { jwtVerifyToken } from "@/lib/jwtVerify";
import VerifyEmail from "./verify-email-page";
import { Metadata } from "next";

type TVerifyEmailPageProps = {
  searchParams: Promise<{
    token: string;
  }>;
};

export const metadata: Metadata = {
  title: "Verify Email",
  description: "Verify your email address to activate your account.",
};

export default async function EmailVerificationPage(
  props: TVerifyEmailPageProps,
) {
  const searchParams = await props.searchParams;
  const { token } = searchParams;
  const { payload } = await jwtVerifyToken(token ?? "");
  const email = payload.email as string;

  return (
    <div className="flex justify-center items-center h-screen">
      <VerifyEmail token={token} email={email} />
    </div>
  );
}
