import { authOptions } from "@/authOptions";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export async function requireCompanyId(): Promise<number> {
  const session = await getServerSession(authOptions);
  const id = session?.user?.companyId;
  if (id == null) redirect("/login");
  return id;
}

export async function requireCompanyAndUserId(): Promise<{
  companyId: number;
  userId: number;
}> {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.companyId;
  const userId = session?.user?.id ? Number(session.user.id) : NaN;
  if (companyId == null || !Number.isFinite(userId)) redirect("/login");
  return { companyId, userId };
}

export function str(formData: FormData, key: string) {
  const v = String(formData.get(key) ?? "").trim();
  return v || null;
}

export function intOrNull(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function optionalIntGteZero(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}
