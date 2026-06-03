export function getOTPEmailTemplate(code: string, userName: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Two-Factor Authentication</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(to right, #4F46E5, #7C3AED); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Two-Factor Authentication</h1>
        </div>

        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">Hello ${userName},</p>

          <p style="font-size: 16px;">You've requested to sign in to your account. Please use the verification code below:</p>

          <div style="background: white; border: 2px solid #4F46E5; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
            <p style="margin: 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Verification Code</p>
            <p style="margin: 10px 0 0 0; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #4F46E5;">${code}</p>
          </div>

          <p style="font-size: 14px; color: #666;">
            ⏱️ This code will expire in <strong>10 minutes</strong>.
          </p>

          <p style="font-size: 14px; color: #666;">
            🔒 For your security, never share this code with anyone.
          </p>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

          <p style="font-size: 13px; color: #999;">
            If you didn't request this code, please ignore this email or contact support if you have concerns.
          </p>
        </div>
      </body>
    </html>
  `;
}

export function getEmailVerificationTemplate(url: string): string {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Verify Your Email Address</h2>
          <p>Thank you for registering with our service. Please click the link below to verify your email address:</p>
          <a href="${url}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you did not create this account, please ignore this email.</p>
        </div>
  `;
}
