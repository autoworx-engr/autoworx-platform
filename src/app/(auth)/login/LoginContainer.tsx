"use client";

import LoginPage from "./LoginPage";
import TwoFactorVerification from "./TwoFactorPage";
import { useState } from "react";

export default function LoginContainer() {
  const [showTwoFactor, setShowTwoFactor] = useState(false);

  return <>{showTwoFactor ? <TwoFactorVerification /> : <LoginPage />}</>;
}
