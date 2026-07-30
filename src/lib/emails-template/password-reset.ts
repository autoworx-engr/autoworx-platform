export function generatePasswordResetEmailHtml(
  resetUrl: string,
  otp: string,
  companyName: string,
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  // const logoUrl = `${appUrl}/images/solution/logo1.png`;
  const logoUrl = `${appUrl}/images/autoworx-logo.webp`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f7fb;font-family:'Figtree',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(90deg,#26AADF 0%,#03A7A2 100%);padding:36px 40px;text-align:center;">
              <img src="${logoUrl}" alt="${companyName}" height="60" style="display:inline-block;vertical-align:middle;border-radius:8px;" />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:48px 40px 32px;">
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#1a2235;letter-spacing:-0.3px;">Reset your password</h1>
              <p style="margin:0 0 28px;font-size:15px;color:#66738c;line-height:1.6;">
                We received a request to reset the password for your <strong>${companyName}</strong> account.
                Click the button below or use the one-time code to proceed.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="border-radius:8px;background:linear-gradient(90deg,#26AADF 0%,#03A7A2 100%);">
                    <a href="${resetUrl}" target="_blank"
                      style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;letter-spacing:0.2px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="border-top:1px solid #eef0f5;"></td>
                  <td style="padding:0 16px;white-space:nowrap;font-size:13px;color:#a0aab8;">or use one-time code</td>
                  <td style="border-top:1px solid #eef0f5;"></td>
                </tr>
              </table>

              <!-- OTP Block -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td align="center" style="background:#f4f7fb;border-radius:12px;padding:24px;">
                    <p style="margin:0 0 8px;font-size:13px;color:#66738c;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Your OTP Code</p>
                    <p style="margin:0;font-size:36px;font-weight:700;color:#1a2235;letter-spacing:8px;">${otp}</p>
                    <p style="margin:8px 0 0;font-size:12px;color:#a0aab8;">Valid for 15 minutes</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#a0aab8;line-height:1.6;">
                If you didn&rsquo;t request a password reset, you can safely ignore this email.
                Your password will remain unchanged.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #eef0f5;padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#a0aab8;line-height:1.6;">
                &copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.<br/>
                This email was sent to you because a password reset was requested for your account.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
