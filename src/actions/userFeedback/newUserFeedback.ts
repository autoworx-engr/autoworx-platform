"use server";
import { ASANA_BASE_URL, USER_FEEDBACK_EMAILS } from "@/lib/consts";
import { db } from "@/lib/db";
import { generateFeedbackHTML } from "@/lib/emails-template/user-feedback";
import { sendEmail } from "@/lib/email";
import getUser from "@/lib/getUser";
import {
  Company,
  User,
  UserFeedback,
  UserFeedbackAttachment,
} from "@prisma/client";
export async function newUserFeedback(data: {
  whatHappened: string;
  whatExpected: string;
  snapshotImage?: string;
  attachments?: string[];
}) {
  const user = await getUser();

  const feedback = await db.userFeedback.create({
    data: {
      whatHappened: data.whatHappened,
      whatExpected: data.whatExpected,
      snapshotImage: data.snapshotImage,
      companyId: user.companyId,
      userId: user.id,
      UserFeedbackAttachment: {
        create: data?.attachments?.map((attachment: string) => ({
          fileName: attachment,
        })),
      },
    },
    include: {
      UserFeedbackAttachment: true,
      user: true,
      company: true,
    },
  });

  await createAsanaTask(feedback);

  return {
    success: true,
    data: feedback,
  };
}

// Create a new task in Asana
async function createAsanaTask(
  data: UserFeedback & {
    UserFeedbackAttachment: UserFeedbackAttachment[];
    user: User;
    company: Company;
  },
) {
  const res = await fetch(`${ASANA_BASE_URL}/tasks`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.ASANA_PERSONAL_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      data: {
        custom_fields: {
          // Priority: High
          1208787743472524: "1208787743472527",
          // User Reported Issue: True
          1208863541738742: "1208863541738745",
        },
        name: data.whatHappened,
        notes: `User Id: ${data.userId}\nUser Name: ${data.user.firstName}\nCompany Id: ${data.companyId}\nCompany Name: ${data.company.name}\n\nWhat Happened: ${data.whatHappened}\n\nWhat Was Expected: ${data.whatExpected}`,
        projects: [
          // Autoworx Software
          "1208787725739116",
        ],
        workspace: `${process.env.ASANA_WORKSPACE}`,
      },
    }),
  });

  const json = await res.json();

  USER_FEEDBACK_EMAILS.forEach(async (email) => {
    sendEmail({
      to: email,
      subject: `New User Feedback: ${data.user.firstName} ${data.user.lastName}`,
      text: `A new user feedback has been submitted by ${data.user.firstName} ${data.user.lastName}.`,
      html: (await generateFeedbackHTML(data)).fullHTML,
    });
  });
}
