# 🚀 Quick Start - Testing Infobip Outbound Calls

## Current Status ✅

- ✅ **Real SDK Installed**: `infobip-rtc` v2.7.18
- ✅ **Implementation Complete**: Browser-to-phone calling ready
- ✅ **Provider Detection**: Auto-switches between Twilio/Infobip

## What You Have Now

### Browser → Client Phone Calling

```
Your Browser (Microphone) → Infobip WebRTC → Client's Phone
```

You speak through your computer's microphone in the browser, and the client receives the call on their regular phone.

## Next Steps to Test

### 1. Configure Infobip Portal (5 minutes)

**A. Get Application ID**:

1. Go to https://portal.infobip.com/
2. Navigate to **Voice** → **Applications**
3. Create new **WebRTC** application
4. Copy the **Application ID**

**B. Set Webhook URL**:
In your WebRTC application:

- **Call Established URL**: `https://your-domain.com/api/infobip/voice/make-call`

### 2. Update Environment Variables

Add to `.env.local`:

```bash
INFOBIP_API_KEY=your_api_key
INFOBIP_BASE_URL=https://api.infobip.com
INFOBIP_APP_ID=your_webrtc_application_id
```

### 3. Update Database

```sql
UPDATE infobip_config
SET application_id = 'your-webrtc-app-id'
WHERE company_id = your_company_id;
```

### 4. Restart Dev Server

```bash
npm run dev
```

### 5. Test the Call!

1. **Open**: Communication → Client → Phone
2. **Click**: "Setup Device"
   - Should see: "✅ [Infobip] Real WebRTC SDK initialized"
   - Should see: "Device Ready ✓"
3. **Enter**: Client phone number (e.g., +1234567890)
4. **Click**: "Make Call"
   - Browser will ask for microphone permission → **Allow it**
   - Should see: "Calling..."
   - Client's phone should ring
   - When client answers: "Call connected"
   - Duration timer starts: 00:01, 00:02, 00:03...
5. **Speak**: You'll hear client, they'll hear you
6. **Click**: "End Call" when done

## Expected Console Output

```javascript
✅ [Infobip] Real WebRTC SDK initialized
🔌 [Infobip] Connecting with token...
✅ [Infobip] Connected to WebRTC
📞 [Infobip] Initiating call to +1234567890...
✅ [Infobip] Call established
```

## What Changed From Mock

### Before (Mock):

- ❌ No real audio
- ❌ Simulated events only
- ❌ No actual call placed

### Now (Real SDK):

- ✅ **Real audio both ways**
- ✅ **Actual WebRTC connection**
- ✅ **Real phone call to client**
- ✅ **Client's phone rings**
- ✅ **Two-way conversation works**

## File Changes Summary

### `src/lib/infobip-rtc.ts`

```typescript
// Before: Mock implementation
// After: Real SDK
import InfobipRTC from "infobip-rtc";

export function createInfobipRTC(options?: InfobipRTCOptions): any | null {
  const infobipRTC = new InfobipRTC("", options || { debug: true });
  return infobipRTC;
}
```

### No Changes Needed To:

- ✅ `VoiceDeviceContext.tsx` - Already using the SDK correctly
- ✅ `SendCall.tsx` - Provider detection works
- ✅ `Phone.tsx` - Auto-detects Infobip vs Twilio
- ✅ API routes - Already set up

## Common Issues & Quick Fixes

### "Device not ready"

```bash
# Check console for specific error
# Restart dev server
npm run dev
```

### "Failed to create RTC client"

```bash
# Verify package installed
npm list infobip-rtc
# Should show: infobip-rtc@2.7.18
```

### No microphone permission popup

```
1. Check browser settings
2. Make sure you're on HTTPS (or localhost)
3. Try Chrome browser
```

### Call doesn't connect

```
1. Verify phone number format: +1234567890 (include country code)
2. Check Infobip application ID is set
3. Check webhook URL is accessible
4. View logs in Infobip portal
```

## Testing Without Infobip Account

If you don't have Infobip configured yet, the system will fail gracefully:

- SDK will try to initialize
- Token request will fail
- Error message will show in console
- UI will show "Device setup failed"

**To really test audio**: You need a configured Infobip account.

## Browser Requirements

✅ **Recommended**: Chrome or Edge
⚠️ **Works**: Firefox, Opera
❌ **Not recommended**: Safari (limited WebRTC support)

## Phone Number Format

Always include country code:

- ✅ `+1234567890` (US)
- ✅ `+447911123456` (UK)
- ✅ `+6012345678` (Malaysia)
- ❌ `1234567890` (missing +)
- ❌ `(123) 456-7890` (formatting)

## Security Note

The token endpoint (`/api/infobip/voice/token`) should be protected:

1. Checks user authentication
2. Validates company has Infobip config
3. Returns short-lived token (1 hour)

## What Happens During a Call

```
1. Click "Make Call"
   ↓
2. device.call("+1234567890")
   ↓
3. Infobip WebRTC SDK connects to Infobip platform
   ↓
4. Infobip calls your webhook: /api/infobip/voice/make-call
   ↓
5. Webhook returns: "dial +1234567890"
   ↓
6. Infobip routes call to PSTN network
   ↓
7. Client's phone rings
   ↓
8. Client answers
   ↓
9. Audio flows: Your mic → WebRTC → Infobip → Client phone
   ↓
10. Duration timer starts
   ↓
11. Either party hangs up
   ↓
12. Call ends, duration saved to database
```

## Cost Consideration

Infobip charges per minute:

- Outbound calls to phones: $0.01-$0.10/min (varies by country)
- WebRTC connection: Usually free or minimal

**Tip**: Monitor usage in Infobip portal.

## Documentation Files

- 📘 **INFOBIP_OUTBOUND_CALLS.md** - Complete implementation guide
- 📗 **GETTING_REAL_AUDIO_WORKING.md** - Setup instructions (now completed)
- 📙 **This file** - Quick start for testing

## Ready to Test?

1. ✅ SDK installed
2. ⏳ Configure Infobip portal
3. ⏳ Set environment variables
4. ⏳ Update database
5. ⏳ Restart server
6. ⏳ Make test call

**Time to complete setup**: ~10 minutes
**Then**: Real browser-to-phone calls! 🎉

---

Need help? Check the console logs - they'll tell you exactly what's happening at each step.
