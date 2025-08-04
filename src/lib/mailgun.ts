export async function sendMail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}) {
  const form = new FormData();
  form.append("from", `Autoworx <no-reply@${process.env.MAILGUN_DOMAIN}>`);
  form.append("to", to);
  form.append("subject", subject);
  form.append("text", text);

  const res = await fetch(
    `https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString("base64"),
      },
      body: form,
    },
  );

  if (!res.ok) {
    const error = await res.text();
    console.error("Mailgun Error:", error);
    throw new Error("Failed to send email");
  }

  return res;
}
