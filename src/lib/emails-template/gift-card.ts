export function generateGiftCardEmailHtml(params: {
  amount: number;
  shopName: string;
  greeting: string;
  message?: string;
  giftCardCode: string;
}): string {
  const { amount, shopName, greeting, message, giftCardCode } = params;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #2563eb; color: white; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">$${amount} Gift Card</h1>
        <p style="margin: 8px 0 0; opacity: 0.9; font-weight: bold;">Valid at: ${shopName}</p>
      </div>
      <div style="padding: 32px 24px;">
        <p style="font-size: 16px; color: #374151; margin-top: 0;">${greeting} Gift Card!</p>
        ${message ? `<blockquote style="border-left: 4px solid #e5e7eb; padding-left: 16px; margin: 24px 0; color: #4b5563; font-style: italic;">"${message}"</blockquote>` : ""}
        <div style="background-color: #f3f4f6; border-radius: 6px; padding: 24px; text-align: center; margin: 32px 0;">
          <p style="font-size: 14px; color: #6b7280; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em;">Your Gift Card Code</p>
          <p style="font-size: 28px; font-weight: bold; color: #111827; margin: 0; letter-spacing: 2px;">${giftCardCode}</p>
        </div>
        <p style="font-size: 14px; color: #6b7280; margin: 0; text-align: center;">Present this code during checkout to redeem your gift.</p>
      </div>
    </div>
  `;
}
