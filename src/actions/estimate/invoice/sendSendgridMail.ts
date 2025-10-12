// import { db } from "@/lib/db";
// import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";
// import sgMail from "@sendgrid/mail";
// import { updateNewEmailChatTrack } from "@/actions/communication/client/chat-track";

// // Initialize SendGrid
// sgMail.setApiKey(process.env.SENDGRID_KEY!);

// export async function sendSendgridEmail({
//   clientId,
//   subject,
//   text,
// }: {
//   clientId: number;
//   subject: string;
//   text: string;
// }) {
//   try {
//     const client = await db.client.findFirst({
//       where: { id: clientId },
//       include: {
//         Lead: {
//           select: {
//             id: true,
//             columnId: true,
//           },
//         },
//       },
//     });

//     if (!client) {
//       throw new Error("Client not found");
//     }
//     if (!client?.email) {
//       throw new Error("Client email not found");
//     }

//     // Fetch company ID and email credentials
//     const company = await db.company.findFirst({
//       where: { id: client.companyId },
//     });

//     if (!company) throw new Error("No company found");
//     if (!company?.email) throw new Error("No Company Email Found");

//     // Prepare email content with unsubscribe link
//     const emailText = `${text}`;

//     //     -------------------------
//     // To unsubscribe, click here: ${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?email=${encodeURIComponent(client.email!)}`

//     // Prepare SendGrid email object
//     const msg: sgMail.MailDataRequired = {
//       to: client.email,
//       from: `mail@${process.env.MAILGUN_DOMAIN}`,
//       subject: subject,
//       text: emailText,
//       html: emailText.replace(/\n/g, "<br>"), // Convert newlines to HTML breaks
//       replyTo: `${company.id}@${process.env.MAILGUN_DOMAIN}`,

//       // mailSettings: {
//       //   sandboxMode: {
//       //     enable: process.env.NODE_ENV === "development", // Enable sandbox mode in development
//       //   },
//       // },
//       // trackingSettings: {
//       //   clickTracking: {
//       //     enable: true,
//       //   },
//       //   openTracking: {
//       //     enable: true,
//       //   },
//       // },
//       // asm: {
//       //   groupId: parseInt(process.env.SENDGRID_UNSUBSCRIBE_GROUP_ID || "1"), // You'll need to create an unsubscribe group in SendGrid
//       //   groupsToDisplay: [
//       //     parseInt(process.env.SENDGRID_UNSUBSCRIBE_GROUP_ID || "1"),
//       //   ],
//       // },
//     };

//     // Send the email via SendGrid API
//     const response = await sgMail.send(msg);

//     // SendGrid returns an array, get the first response
//     const sendGridResponse = response[0];

//     if (
//       sendGridResponse.statusCode < 200 ||
//       sendGridResponse.statusCode >= 300
//     ) {
//       throw new Error(`Failed to send email: ${sendGridResponse.statusCode}`);
//     }

//     // Extract message ID from response headers
//     const messageId =
//       sendGridResponse.headers["x-message-id"] ||
//       `${Date.now()}-${Math.random()}`;

//     // Store email in database
//     const emailRecord = await db.mailgunEmail.create({
//       data: {
//         subject: subject,
//         text: text,
//         emailBy: "Company",
//         companyId: company.id,
//         clientId: clientId,
//         messageId: messageId,
//       },
//     });

//     await updateNewEmailChatTrack({
//       clientId,
//       emailLastMessage: text || "",
//       lastEmailBy: "Company",
//     });

//     // trigger automation pipeline
//     try {
//       if (client?.Lead?.id && client?.Lead?.columnId) {
//         await updatePipelineAutomationTrigger({
//           companyId: client.companyId,
//           condition: "MESSAGE_SENT_CLIENT",
//           leadId: client?.Lead.id,
//           columnId: client?.Lead?.columnId,
//         });
//       }
//     } catch (error) {}

//     return {
//       success: true,
//       id: messageId,
//       emailRecordId: emailRecord.id,
//     };
//   } catch (error: any) {
//     console.error("SendGrid email error:", error);
//     return {
//       success: false,
//       message: error.message || "Failed to send email",
//     };
//   }
// }

// // Alternative version with more advanced features
// export async function sendSendgridEmailAdvanced({
//   clientId,
//   subject,
//   text,
//   html,
//   attachments = [],
//   templateId,
//   dynamicTemplateData,
// }: {
//   clientId: number;
//   subject: string;
//   text: string;
//   html?: string;
//   attachments?: Array<{
//     content: string; // base64 encoded
//     filename: string;
//     type: string;
//     disposition?: "attachment" | "inline";
//   }>;
//   templateId?: string;
//   dynamicTemplateData?: Record<string, any>;
// }) {
//   try {
//     const client = await db.client.findFirst({
//       where: { id: clientId },
//       include: {
//         Lead: {
//           select: {
//             id: true,
//             columnId: true,
//           },
//         },
//       },
//     });

//     if (!client) {
//       throw new Error("Client not found");
//     }
//     if (!client?.email) {
//       throw new Error("Client email not found");
//     }

//     const company = await db.company.findFirst({
//       where: { id: client.companyId },
//     });

//     if (!company) throw new Error("No company found");
//     if (!company?.email) throw new Error("No Company Email Found");

//     const emailText = `${text}

// -------------------------
// To unsubscribe, click here: ${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?email=${encodeURIComponent(client.email!)}`;

//     const msg: sgMail.MailDataRequired = {
//       to: client.email,
//       from: {
//         email: company.email,
//         name: company.name,
//       },
//       subject: subject,
//       text: emailText,
//       html: html || emailText.replace(/\n/g, "<br>"),
//       replyTo: company.email,
//       attachments: attachments.length > 0 ? attachments : undefined,
//       mailSettings: {
//         sandboxMode: {
//           enable: process.env.NODE_ENV === "development",
//         },
//       },
//       trackingSettings: {
//         clickTracking: {
//           enable: true,
//         },
//         openTracking: {
//           enable: true,
//         },
//       },
//       asm: {
//         groupId: parseInt(process.env.SENDGRID_UNSUBSCRIBE_GROUP_ID || "1"),
//         groupsToDisplay: [
//           parseInt(process.env.SENDGRID_UNSUBSCRIBE_GROUP_ID || "1"),
//         ],
//       },
//     };

//     // Use dynamic template if provided
//     if (templateId) {
//       msg.templateId = templateId;
//       msg.dynamicTemplateData = {
//         ...dynamicTemplateData,
//         client_name: client.firstName,
//         company_name: company.name,
//         unsubscribe_url: `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?email=${encodeURIComponent(client.email!)}`,
//       };
//     }

//     const response = await sgMail.send(msg);
//     const sendGridResponse = response[0];

//     if (
//       sendGridResponse.statusCode < 200 ||
//       sendGridResponse.statusCode >= 300
//     ) {
//       throw new Error(`Failed to send email: ${sendGridResponse.statusCode}`);
//     }

//     const messageId =
//       sendGridResponse.headers["x-message-id"] ||
//       `${Date.now()}-${Math.random()}`;

//     const emailRecord = await db.mailgunEmail.create({
//       data: {
//         subject: subject,
//         text: text,
//         emailBy: "Company",
//         companyId: company.id,
//         clientId: clientId,
//         messageId: messageId,
//       },
//     });

//     await updateNewEmailChatTrack({
//       clientId,
//       emailLastMessage: text || "",
//       lastEmailBy: "Company",
//     });

//     // trigger automation pipeline
//     try {
//       if (client?.Lead?.id && client?.Lead?.columnId) {
//         await updatePipelineAutomationTrigger({
//           companyId: client.companyId,
//           condition: "MESSAGE_SENT_CLIENT",
//           leadId: client?.Lead.id,
//           columnId: client?.Lead?.columnId,
//         });
//       }
//     } catch (error) {}

//     return {
//       success: true,
//       id: messageId,
//       emailRecordId: emailRecord.id,
//     };
//   } catch (error: any) {
//     console.error("SendGrid email error:", error);
//     return {
//       success: false,
//       message: error.message || "Failed to send email",
//     };
//   }
// }
