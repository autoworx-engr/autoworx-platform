export function generateBookingConfirmationEmailHtml(params: {
  shopName: string;
  appointmentDate: string;
  appointmentTime: string;
  vehicleStr: string;
  servicesStr: string;
  clientFirstName: string | null;
}): string {
  const {
    shopName,
    appointmentDate,
    appointmentTime,
    vehicleStr,
    servicesStr,
    clientFirstName,
  } = params;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #2563eb; color: white; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Booking Confirmed!</h1>
        <p style="margin: 8px 0 0; opacity: 0.9;">${shopName}</p>
      </div>
      <div style="padding: 32px 24px;">
        <p style="font-size: 16px; color: #374151; margin-top: 0;">Hi ${clientFirstName || "Customer"}, your appointment has been successfully scheduled.</p>
        <div style="background-color: #f3f4f6; border-radius: 6px; padding: 24px; margin: 24px 0;">
          <p style="margin: 0 0 8px; color: #4b5563;"><strong>Date:</strong> ${appointmentDate}</p>
          <p style="margin: 0 0 8px; color: #4b5563;"><strong>Time:</strong> ${appointmentTime}</p>
          <p style="margin: 0 0 8px; color: #4b5563;"><strong>Vehicle:</strong> ${vehicleStr}</p>
          <p style="margin: 0; color: #4b5563;"><strong>Services:</strong> ${servicesStr}</p>
        </div>
        <p style="font-size: 14px; color: #6b7280; margin: 0; text-align: center;">We look forward to seeing you!</p>
      </div>
    </div>
  `;
}
