import {
  Company,
  User,
  UserFeedback,
  UserFeedbackAttachment,
} from "@prisma/client";

export async function generateFeedbackHTML(
  feedback: UserFeedback & {
    UserFeedbackAttachment: UserFeedbackAttachment[];
    user: User;
    company: Company;
  },
) {
  const {
    whatHappened,
    whatExpected,
    snapshotImage,
    UserFeedbackAttachment,
    userId,
    companyId,
    createdAt,
  } = feedback;

  const attachmentsHTML = UserFeedbackAttachment?.length
    ? UserFeedbackAttachment.map(
        (attachment) =>
          `<li><img src="${attachment.fileName}" alt="Attachment" style="max-width: 100%; margin-bottom: 10px;"/></li>`,
      ).join("")
    : "<li>No attachments</li>";

  const bodyHTML = `
    <body>
      <div>
        <h1>User Feedback</h1>
        <p><strong>User ID:</strong> ${userId}</p>
        <p><strong>Username:</strong> ${feedback.user.firstName} ${feedback.user.lastName}</p>
        <p><strong>Company ID:</strong> ${companyId}</p>
        <p><strong>Company Name:</strong> ${feedback.company.name}</p>
        <p><strong>Submitted On:</strong> ${new Date(createdAt).toLocaleString()}</p>

        <h2>What Happened</h2>
        <p>${whatHappened}</p>

        <h2>What Was Expected</h2>
        <p>${whatExpected}</p>

        ${snapshotImage ? `<h2>Snapshot Image</h2><img src="${snapshotImage}" alt="Snapshot" style="max-width:100%;"/>` : ""}

        <h2>Attachments</h2>
        <div>
          <ul>
            ${attachmentsHTML}
          </ul>
        </div>
      </div>
    </body>
  `;

  const fullHTML = `
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
          }
          .container {
            max-width: 600px;
            margin: auto;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px;
            background-color: #f9f9f9;
          }
          h1 {
            color: #333;
          }
          p {
            color: #555;
          }
          .attachments {
            margin-top: 15px;
          }
          .attachments ul {
            list-style-type: none;
            padding: 0;
          }
          .attachments li {
            margin: 10px 0;
          }
          img {
            border: 1px solid #ddd;
            border-radius: 4px;
          }
        </style>
      </head>
      ${bodyHTML}
    </html>
  `;

  return {
    fullHTML,
    bodyHTML,
  };
}
