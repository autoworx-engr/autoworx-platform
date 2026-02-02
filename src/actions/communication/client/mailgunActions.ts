"use server";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";

export const getDnsRecords = async () => {
  try {
    let companyId = await getCompanyId();
    let mailgunCredential = await db.mailgunCredential.findFirst({
      where: {
        companyId,
      },
    });

    return { success: true, data: mailgunCredential };
  } catch (error) {
    console.error("", error);
    return { success: false };
  }
};
export const addMailgunDomain = async ({ domain }: { domain: string }) => {
  try {
    let companyId = await getCompanyId();
    let mailgunCredential = await db.mailgunCredential.findFirst({
      where: {
        companyId,
      },
    });
    if (mailgunCredential) {
      await db.mailgunCredential.update({
        where: {
          id: mailgunCredential.id,
        },
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
          companyId: await getCompanyId(),
        },
      });
    }

    const form = new FormData();
    form.append("name", domain);
    // form.append("smtp_password", "");

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
        where: {
          id: mailgunCredential.id,
        },
        data: {
          dnsRecords: data,
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("", error);
    return { success: false };
  }
};

export const verifyMailgunDomain = async () => {
  try {
    let companyId = await getCompanyId();
    let mailgunCredential = await db.mailgunCredential.findFirst({
      where: {
        companyId,
      },
    });

    if (!mailgunCredential) throw new Error("No Mailgun Credential Found");

    if (mailgunCredential.isVerified)
      throw new Error("Domain Already Verified");

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

    if (data.domain.state === "active") {
      await db.mailgunCredential.update({
        where: {
          id: mailgunCredential.id,
        },
        data: {
          isVerified: true,
          verificationStatus: "verified",
        },
      });
    } else {
      await db.mailgunCredential.update({
        where: {
          id: mailgunCredential.id,
        },
        data: {
          dnsRecords: data,
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error verifying mailgun", error);
    return { success: false };
  }
};


