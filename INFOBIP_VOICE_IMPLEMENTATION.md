# Infobip Voice/Call Integration Implementation Guide

## Overview

This implementation adds Infobip voice calling capabilities alongside the existing Twilio integration. The system now automatically switches between Twilio and Infobip based on the `company.smsGateway` setting.

## What Was Implemented

### 1. Unified Voice Device Context (`VoiceDeviceContext.tsx`)

- Created a unified context that replaces `TwilioDeviceContext`
- Supports both Twilio and Infobip providers
- Automatically switches between providers based on company settings
- Handles device setup, incoming calls, outgoing calls, and call status

**Key Features:**

- `setupDevice(phoneNumber, provider)` - Initialize device for either provider
- `makeCall(to, clientId)` - Make outgoing calls
- `acceptIncomingCall()` - Accept incoming calls
- `rejectIncomingCall()` - Reject incoming calls
- `endCall()` - End active call

### 2. Infobip API Routes

#### `/api/infobip/voice/token` - Generate Infobip token

- Returns authentication token for Infobip voice calls
- Used during device initialization

#### `/api/infobip/voice/incoming` - Handle incoming calls

- Webhook endpoint for Infobip incoming calls
- Creates `ClientCall` record
- Creates/finds client in database

#### `/api/infobip/voice/make-call` - Make outgoing call

- Initiates outgoing call via Infobip Voice API
- Creates `ClientCall` record
- Returns call ID

#### `/api/infobip/voice/call-status` - Call status webhook

- Updates call status in database
- Handles: RINGING, ANSWERED, COMPLETED, FAILED, BUSY, NO_ANSWER, CANCELED

#### `/api/infobip/get-phone-number` - Get Infobip phone number

- Returns the Infobip phone number for the company

#### `/api/company/sms-gateway` - Get company's SMS gateway

- Returns either "TWILIO" or "INFOBIP"

### 3. Updated Components

#### `Layout.tsx`

- Now uses `VoiceDeviceProvider` instead of `TwilioDeviceProvider`
- Fetches company's SMS gateway setting
- Fetches phone number from appropriate provider
- Passes provider info to `VoiceAutoSetup`

#### `VoiceAutoSetup.tsx` (replaces TwilioAutoSetup)

- Auto-initializes voice device on mount
- Handles incoming call alerts
- Works with both providers

#### `SendCall.tsx`

- Updated to use unified `VoiceDeviceContext`
- Accepts `provider` prop
- Handles call initiation for both Twilio and Infobip

#### `Phone.tsx`

- Determines provider based on company settings
- Fetches appropriate phone number
- Passes provider to `SendCall` component

### 4. Database Schema Updates

Added to `InfobipConfig` model:

```prisma
applicationId         String? @map("application_id")
callsConfigurationId  String? @map("calls_configuration_id")
```

## Required Environment Variables

Add these to your `.env` file:

```bash
# Infobip Voice Configuration
INFOBIP_API_KEY=your_infobip_api_key
INFOBIP_BASE_URL=your_region.api.infobip.com
INFOBIP_APP_ID=your_application_id
INFOBIP_CALLS_CONFIG_ID=your_calls_configuration_id
```

## Setup Instructions

### 1. Run Database Migration

```bash
npx prisma migrate dev --name add_infobip_voice_fields
```

Or apply the migration manually:

```sql
ALTER TABLE "infobip_config" ADD COLUMN "application_id" TEXT;
ALTER TABLE "infobip_config" ADD COLUMN "calls_configuration_id" TEXT;
```

### 2. Configure Infobip Account

1. **Create Infobip Application:**
   - Log into Infobip portal
   - Navigate to Voice → Applications
   - Create a new application
   - Note the Application ID

2. **Create Calls Configuration:**
   - Navigate to Voice → Calls
   - Create a calls configuration
   - Set webhook URLs:
     - Call Status: `https://your-domain.com/api/infobip/voice/call-status`
     - Incoming Call: `https://your-domain.com/api/infobip/voice/incoming`
   - Note the Configuration ID

3. **Get Phone Number:**
   - Purchase or configure a phone number in Infobip
   - Link it to your application

4. **Update Environment Variables:**
   Add the IDs and credentials to your `.env` file

### 3. Update Company Settings

For companies that want to use Infobip calls:

```typescript
await prisma.company.update({
  where: { id: companyId },
  data: { smsGateway: "INFOBIP" },
});

await prisma.infobipConfig.create({
  data: {
    companyId: companyId,
    phoneNumber: "your_infobip_number",
    applicationId: "your_app_id",
    callsConfigurationId: "your_config_id",
  },
});
```

## How It Works

### Provider Selection Flow

1. **Component Mount:**
   - `Layout.tsx` fetches company's `smsGateway` setting
   - Determines if provider is TWILIO or INFOBIP
   - Fetches appropriate phone number

2. **Device Initialization:**
   - `VoiceAutoSetup` automatically calls `setupDevice(phoneNumber, provider)`
   - For Twilio: Creates Twilio Device with WebRTC
   - For Infobip: Prepares Infobip configuration

3. **Making Calls:**
   - User clicks "Make Call" in `SendCall` component
   - If Twilio: Uses Twilio Device SDK to connect
   - If Infobip: Calls `/api/infobip/voice/make-call` which uses Infobip REST API

4. **Receiving Calls:**
   - Twilio: Uses Twilio Device SDK webhook
   - Infobip: Uses webhook at `/api/infobip/voice/incoming`

5. **Call Status Updates:**
   - Infobip sends status updates to `/api/infobip/voice/call-status`
   - Updates `ClientCall` records in database

## Testing

### Test Twilio Calls

1. Set `company.smsGateway = 'TWILIO'`
2. Navigate to Communication → Client → Phone
3. Click "Setup Device" then "Make Call"

### Test Infobip Calls

1. Set `company.smsGateway = 'INFOBIP'`
2. Configure Infobip credentials
3. Navigate to Communication → Client → Phone
4. Click "Setup Device" then "Make Call"

## Key Differences Between Providers

| Feature        | Twilio                | Infobip                    |
| -------------- | --------------------- | -------------------------- |
| Device Setup   | WebRTC SDK            | REST API + Optional WebRTC |
| Outgoing Calls | Device.connect()      | POST /calls/1/calls        |
| Incoming Calls | Device.on('incoming') | Webhook + Polling          |
| Call Control   | SDK Events            | API Calls                  |
| Recording      | Automatic via TwiML   | Via API configuration      |

## Troubleshooting

### Infobip Calls Not Working

1. Check environment variables are set
2. Verify webhook URLs are configured in Infobip portal
3. Check Infobip phone number is linked to application
4. Verify company's `smsGateway` is set to 'INFOBIP'

### Device Not Ready

1. Check browser console for errors
2. Verify microphone permissions
3. Check network connectivity
4. Verify API credentials

### Call Quality Issues

1. Check network bandwidth
2. Verify codec compatibility
3. Check firewall/proxy settings
4. Review Infobip portal logs

## Future Enhancements

1. **WebRTC Support for Infobip:**
   - Implement Infobip's WebRTC SDK for better browser integration
   - Add full duplex audio support

2. **Call Recording:**
   - Implement call recording playback for Infobip
   - Store recordings in S3

3. **Advanced Features:**
   - Call transfer
   - Conference calls
   - Call queuing
   - IVR integration

4. **Analytics:**
   - Call duration tracking
   - Call quality metrics
   - Provider comparison reports

## Important Notes

- The implementation currently uses REST API for Infobip calls
- For production, consider implementing Infobip's WebRTC SDK for better performance
- Make sure to secure all API keys and tokens
- Configure proper webhook authentication
- Test thoroughly in development before deploying to production

## Support

For issues or questions:

1. Check Infobip API documentation: https://www.infobip.com/docs
2. Review Twilio documentation: https://www.twilio.com/docs
3. Check application logs for errors
4. Review database records for call status
