// data/two-factor-confirmation.ts
import { db } from "@/lib/db";

export const getTwoFactorConfirmationByUserId = async (userId: number) => {
  try {
    const twoFactorConfirmation = await db.twoFactorConfirmation.findUnique({
      where: { userId },
    });

    return twoFactorConfirmation;
  } catch (err) {
    console.error("Error fetching two-factor confirmation:", err);
    return null;
  }
};
