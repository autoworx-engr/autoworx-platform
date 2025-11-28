# 📞 Infobip Outbound Calling - Browser to Phone

## Overview

This implementation allows you to **call client phone numbers from your browser** using Infobip WebRTC. You (the agent) will talk through your computer's microphone in the browser, and the client receives the call on their regular phone.

## How It Works

```
┌─────────────────┐         ┌──────────────┐         ┌─────────────────┐
│   Your Browser  │────────▶│   Infobip    │────────▶│  Client Phone   │
│  (Microphone)   │  WebRTC │   Platform   │   PSTN  │  +1234567890    │
└─────────────────┘         └──────────────┘         └─────────────────┘
```

1. **Your Browser** → Uses WebRTC to connect to Infobip
2. **Infobip Platform** → Routes the call to regular phone network (PSTN)
3. **Client Phone** → Receives the call as a normal phone call

## Current Implementation ✅

### 1. Real SDK Integration

**File**: `src/lib/infobip-rtc.ts`

```typescript
import InfobipRTC from "infobip-rtc";

export function createInfobipRTC(options?: InfobipRTCOptions): any | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const infobipRTC = new InfobipRTC("", options || { debug: true });
    console.log("✅ [Infobip] Real WebRTC SDK initialized");
    return infobipRTC;
  } catch (error) {
    console.error("❌ [Infobip] Failed to create RTC client:", error);
    return null;
  }
}
```

### 2. Voice Device Context

**File**: `src/context/VoiceDeviceContext.tsx`

Handles both Twilio and Infobip based on `company.smsGateway`:

```typescript
const makeCall = async (to: string, clientId: number) => {
  if (provider === "INFOBIP") {
    // Make call via Infobip WebRTC
    const infobipCall = await device.call(to, {
      audio: true,
      video: false,
    });

    // Setup event listeners
    infobipCall.on("established", () => {
      setCallStatus("Call connected");
      // Start duration timer
    });

    infobipCall.on("hangup", () => {
      setCallStatus("Call ended");
    });

    infobipCall.on("error", (error) => {
      setCallStatus(`Error: ${error.message}`);
    });
  }
};
```

### 3. API Routes

#### Get Token: `/api/infobip/voice/token`

Generates WebRTC authentication token for browser connection.

```typescript
POST https://api.infobip.com/webrtc/1/token
{
  "identity": "user-12345",
  "applicationId": "your-app-id",
  "displayName": "Agent Name"
}
```

#### Make Call Webhook: `/api/infobip/voice/make-call`

Called by Infobip when you initiate a call from browser.

```typescript
// Tells Infobip to dial the client's phone number
{
  "call": {
    "endpoint": {
      "type": "PHONE",
      "phoneNumber": "+1234567890"
    }
  }
}
```

## Setup Steps

### 1. Configure Infobip Portal

#### A. Create WebRTC Application

1. Login to [Infobip Portal](https://portal.infobip.com/)
2. Go to **Voice** → **Applications**
3. Click **Create Application**
4. Select **WebRTC** type
5. Fill in:
   - **Name**: AutoWorx WebRTC
   - **Description**: Browser-based calling
6. Click **Create**
7. **Copy the Application ID**

#### B. Configure Webhooks

In your WebRTC application settings:

1. **Call Established URL**:

   ```
   https://your-domain.com/api/infobip/voice/make-call
   ```

2. **Call Finished URL** (optional):
   ```
   https://your-domain.com/api/infobip/voice/call-status
   ```

### 2. Environment Variables

Add to `.env`:

```bash
# Infobip API Configuration
INFOBIP_API_KEY=your_api_key_here
INFOBIP_BASE_URL=https://api.infobip.com
INFOBIP_APP_ID=your_webrtc_application_id

# Your domain for webhooks
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 3. Database Configuration

Update your company's Infobip config:

```sql
-- Update InfobipConfig with WebRTC Application ID
UPDATE infobip_config
SET application_id = 'your-webrtc-app-id'
WHERE company_id = your_company_id;

-- Make sure company is using Infobip
UPDATE company
SET sms_gateway = 'INFOBIP'
WHERE id = your_company_id;
```

### 4. Restart Application

```bash
npm run dev
```

## Usage Flow

### Making an Outbound Call

1. **Navigate to Communication → Client → Phone**

2. **Setup Device** (First time or when needed):

   ```
   Click "Setup Device"
   → Fetches authentication token from /api/infobip/voice/token
   → Connects to Infobip WebRTC
   → Browser may ask for microphone permission (allow it)
   → Shows "Device Ready ✓"
   ```

3. **Make Call**:

   ```
   Enter client phone number: +1234567890
   Click "Make Call"
   → Shows "Calling..."
   → Infobip calls /api/infobip/voice/make-call webhook
   → Webhook returns client's phone number to dial
   → Infobip routes call to client's phone
   → Client's phone rings
   → When client answers: "Call connected"
   → Duration timer starts
   ```

4. **During Call**:

   ```
   You speak into your computer microphone
   → Audio goes through WebRTC to Infobip
   → Infobip routes to client's phone
   → You hear client through your computer speakers
   ```

5. **End Call**:
   ```
   Click "End Call"
   → Hangs up both sides
   → Shows "Call ended"
   → Duration saved to database
   ```

## Event Flow

```
User Clicks "Make Call"
  ↓
device.call("+1234567890", { audio: true })
  ↓
Infobip SDK sends request to Infobip platform
  ↓
Infobip calls your webhook: POST /api/infobip/voice/make-call
  ↓
Webhook returns: { endpoint: { type: "PHONE", phoneNumber: "+1234567890" } }
  ↓
Infobip dials client's phone via PSTN
  ↓
Client's phone rings
  ↓
Client answers
  ↓
"established" event fires → UI shows "Call connected"
  ↓
Two-way audio active via WebRTC
  ↓
Either party hangs up
  ↓
"hangup" event fires → UI shows "Call ended"
```

## Automatic Provider Detection

The system automatically detects which provider to use:

**File**: `src/app/(dashboard)/dashboard/communication/client/_component/phone/Phone.tsx`

```typescript
// Check company's SMS gateway setting
const provider = await getSmsGateway(user.companyId);

// Pass to SendCall component
<SendCall
  provider={provider === "INFOBIP" ? "INFOBIP" : "TWILIO"}
  client={client}
/>
```

## Microphone Permissions

The browser will ask for microphone permission when you:

1. Setup the device, OR
2. Make the first call

**Important**: Always **allow** microphone access for calls to work!

```
🎤 Browser popup: "Allow access to microphone?"
    → Click "Allow"
```

## Testing Checklist

### ✅ Prerequisites

- [ ] Infobip account active
- [ ] WebRTC application created
- [ ] Application ID copied
- [ ] Environment variables set
- [ ] Database updated
- [ ] Dev server restarted

### ✅ Device Setup

- [ ] Navigate to Communication → Client → Phone
- [ ] Click "Setup Device"
- [ ] Console shows: "✅ [Infobip] Real WebRTC SDK initialized"
- [ ] Console shows: "🔌 [Infobip] Connected to WebRTC"
- [ ] UI shows: "Device Ready ✓"

### ✅ Making Call

- [ ] Enter valid phone number (with country code)
- [ ] Click "Make Call"
- [ ] Console shows: "📞 [Infobip] Initiating call..."
- [ ] Console shows: "✅ [Infobip] Call established"
- [ ] UI shows: "Call connected"
- [ ] Duration timer increments: 00:01, 00:02, 00:03...

### ✅ Audio Test

- [ ] You can hear client speaking
- [ ] Client can hear you speaking
- [ ] No echo or audio issues
- [ ] Volume levels are good

### ✅ Call End

- [ ] Click "End Call"
- [ ] Console shows: "📞 [Infobip] Hanging up..."
- [ ] UI shows: "Call ended"
- [ ] Call duration saved to database

## Troubleshooting

### Issue: "Device not ready"

**Solution**:

1. Check console for errors
2. Verify environment variables are set
3. Restart dev server
4. Try clicking "Setup Device" again

### Issue: No audio / Can't hear client

**Solution**:

1. Check microphone permissions in browser
2. Check speaker/headphone connection
3. Try using Chrome browser
4. Check Infobip portal for call logs
5. Verify webhook URLs are accessible

### Issue: Call not connecting

**Solution**:

1. Check phone number format (include country code: +1234567890)
2. Verify Infobip application ID is correct
3. Check webhook is returning correct response
4. View Infobip call logs in portal
5. Check API key has voice permissions

### Issue: "Failed to create RTC client"

**Solution**:

1. Verify `infobip-rtc` package is installed:
   ```bash
   npm list infobip-rtc
   ```
2. Clear Next.js cache:
   ```bash
   rm -rf .next
   npm run dev
   ```

### Issue: Webhook errors

**Solution**:

1. Check webhook URL is publicly accessible
2. Verify HTTPS (Infobip requires HTTPS for webhooks)
3. Check webhook logs in Infobip portal
4. Test webhook manually with curl:
   ```bash
   curl -X POST https://your-domain.com/api/infobip/voice/make-call \
     -H "Content-Type: application/json" \
     -d '{"to":"token-id"}'
   ```

## Browser Compatibility

| Browser | WebRTC Support | Recommended |
| ------- | -------------- | ----------- |
| Chrome  | ✅ Full        | ⭐ Yes      |
| Edge    | ✅ Full        | ⭐ Yes      |
| Firefox | ✅ Full        | ✅ Yes      |
| Safari  | ⚠️ Partial     | ❌ No       |
| Opera   | ✅ Full        | ✅ Yes      |

**Recommendation**: Use Chrome or Edge for best experience.

## Cost Considerations

Infobip charges for:

- **Call duration**: Per-minute rate (varies by destination country)
- **WebRTC connection**: Usually included or minimal cost

**Tips to minimize costs**:

1. Keep calls concise
2. Use for necessary communications only
3. Monitor usage in Infobip portal
4. Set up billing alerts

## Security Notes

1. **API Keys**: Never expose in client-side code (always use API routes)
2. **Tokens**: Short-lived (1 hour), automatically refreshed
3. **Webhooks**: Verify requests come from Infobip IP addresses
4. **Phone Numbers**: Validate format before calling
5. **User Authentication**: Ensure only authorized users can make calls

## Next Steps

### For Production:

1. [ ] Use production Infobip credentials
2. [ ] Update webhook URLs to production domain
3. [ ] Configure rate limiting on API routes
4. [ ] Set up call logging and monitoring
5. [ ] Test with various phone numbers/countries
6. [ ] Configure call recording (if needed)
7. [ ] Set up emergency number blocking

### For Development:

1. ✅ SDK installed and working
2. ✅ API routes created
3. ✅ Voice context supports both providers
4. ✅ UI components updated
5. ⏳ Test with real Infobip account
6. ⏳ Configure webhooks
7. ⏳ Test end-to-end call flow

## Support

- **Infobip Documentation**: https://www.infobip.com/docs/voice/webrtc
- **SDK Repository**: https://github.com/infobip/infobip-rtc-js
- **Infobip Support**: support@infobip.com
- **Developer Forum**: https://www.infobip.com/community

---

🎉 **You're now ready to make browser-to-phone calls with Infobip!**
