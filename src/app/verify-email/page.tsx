import { jwtVerifyToken } from "@/lib/jwtVerify";
import VerifyEmail from "./verify-email-page";

type TVerifyEmailPageProps = {
  searchParams: Promise<{
    token: string;
  }>;
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
