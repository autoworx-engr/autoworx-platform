"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";

export const getDnsRecords = async (companyId?: number) => {
  try {
    const cId = companyId || (await getCompanyId());

    const mailgunCredential = await db.mailgunCredential.findFirst({
      where: {
        companyId: cId,
      },
    });

    return { success: true, data: mailgunCredential };
  } catch (error) {
    console.error("getDnsRecords error:", error);
    return { success: false };
  }
};

export const addMailgunDomain = async ({
  domain,
  companyId,
}: {
  domain: string;
  companyId?: number;
}) => {
  try {
    let cId = companyId || (await getCompanyId());

    let mailgunCredential = await db.mailgunCredential.findFirst({
      where: {
        companyId: cId,
      },
    });

    if (mailgunCredential) {
      await db.mailgunCredential.update({
        where: { id: mailgunCredential.id },
        data: {
          domain,
          isVerified: false,
          verificationStatus: "pending",
          dnsRecords: undefined,
        },
      });
    } else {
      mailgunCredential = await db.mailgunCredential.create({
        data: {
          domain,
          companyId: cId,
        },
      });
    }

    const form = new FormData();
    form.append("name", domain);

    const resp = await fetch(`https://api.mailgun.net/v4/domains`, {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(
            `${process.env.MAILGUN_USERNAME}:${process.env.MAILGUN_API_KEY}`,
          ).toString("base64"),
      },
      body: form,
    });

    const data = await resp.json();

    if (data.message === "Domain DNS records have been created") {
      await db.mailgunCredential.update({
        where: { id: mailgunCredential.id },
        data: {
          dnsRecords: data,
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("addMailgunDomain error:", error);
    return { success: false };
  }
};

export const verifyMailgunDomain = async (companyId?: number) => {
  try {
    let cId = companyId || (await getCompanyId());

    let mailgunCredential = await db.mailgunCredential.findFirst({
      where: {
        companyId: cId,
      },
    });

    if (!mailgunCredential) {
      throw new Error("No Mailgun Credential Found");
    }

    if (mailgunCredential.isVerified) {
      throw new Error("Domain Already Verified");
    }

    const resp = await fetch(
      `https://api.mailgun.net/v4/domains/${mailgunCredential.domain}/verify`,
      {
        method: "PUT",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.MAILGUN_USERNAME}:${process.env.MAILGUN_API_KEY}`,
            ).toString("base64"),
        },
      },
    );

    const data = await resp.json();

    if (data.domain?.state === "active") {
      await db.mailgunCredential.update({
        where: { id: mailgunCredential.id },
        data: {
          isVerified: true,
          verificationStatus: "verified",
        },
      });
    } else {
      await db.mailgunCredential.update({
        where: { id: mailgunCredential.id },
        data: {
          dnsRecords: data,
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("verifyMailgunDomain error:", error);
    return { success: false };
  }
};
