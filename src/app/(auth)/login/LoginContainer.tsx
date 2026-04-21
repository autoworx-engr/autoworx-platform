"use client";

import { useLoginStore } from "@/stores/LoginStore";
import LoginPage from "./LoginPage";
import TwoFactorVerification from "./TwoFactorPage";

export default function LoginContainer() {
  const { showTwoFactor } = useLoginStore();

  return <>{showTwoFactor ? <TwoFactorVerification /> : <LoginPage />}</>;
}
