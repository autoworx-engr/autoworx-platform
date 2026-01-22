import { jwtVerify } from "jose";

export async function jwtVerifyToken(token: string) {
  const secret = new TextEncoder().encode(process.env.ACCESS_SECRET || "");

  // 2. Verify Token
  const verifyToken = await jwtVerify(token, secret);
  return verifyToken;
}
