# ✅ CORRECTED: Infobip WebRTC Phone Calls Setup

## Important Correction

**There is NO "Call Configuration URL" in Infobip portal for WebRTC phone calls!**

I was mistaken in my previous guidance. The `callPhone()` method works directly without webhook configuration.

---

## How Infobip WebRTC Phone Calls Actually Work

```
Browser (callPhone) → Infobip WebRTC Platform → PSTN → Client's Phone
```

**No webhooks needed** - the call goes directly through Infobip's infrastructure.

---

## What You Actually Need

### 1. Infobip Account Setup

**Nothing special to configure!** Just need:

- ✅ WebRTC enabled on your account (enabled by default)
- ✅ Valid API key
- ✅ An Infobip phone number

### 2. Environment Variables

```bash
INFOBIP_API_KEY=your_api_key
INFOBIP_BASE_URL=your_base_url  # e.g., xxxxx.api.infobip.com
```

**Note**: `INFOBIP_APP_ID` is NOT needed for phone calls! Only for WebRTC-to-WebRTC calls.

### 3. Code Setup (Already Done ✅)

Your code is already correct:

```typescript
// src/context/VoiceDeviceContext.tsx
const callOptions = PhoneCallOptions.builder()
  .setFrom(infobipPhoneNumber) // Your Infobip number
  .setAudio(true)
  .build();

const phoneCall = device.callPhone(to, callOptions);
```

---

## Why You Got SERVICE_UNAVAILABLE

The error **wasn't** about missing configuration URL. It was likely:

### Possible Causes:

1. **Infobip Account Not Configured for Voice**
   - Solution: Contact Infobip support to enable voice calling
   - Check: Can you see "Voice" section in your Infobip portal?

2. **No Phone Number Assigned**
   - Solution: Purchase/assign an Infobip phone number
   - Check portal: Numbers → My Numbers

3. **Insufficient Credits**
   - Solution: Add credits to your account
   - Phone calls cost money per minute

4. **API Key Permissions**
   - Solution: Ensure API key has voice/webrtc permissions
   - Check portal: Developer Tools → API Keys

5. **Wrong `from` Number Format**
   - Must be E.164 format: `+1234567890`
   - Must be a number you own in Infobip

---

## Correct Setup Steps

### Step 1: Verify Infobip Account

1. Login to https://portal.infobip.com/
2. Check if you see **"Voice and WebRTC"** in left menu
3. If not, contact Infobip support to enable it

### Step 2: Get/Verify Phone Number

1. Go to **Numbers** → **My Numbers**
2. You should have at least one number
3. Copy that number (e.g., `+12039008770`)

### Step 3: Update Database

```sql
UPDATE infobip_config
SET phone_number = '+12039008770'  -- Your Infobip number
WHERE company_id = your_company_id;
```

### Step 4: Test Call

```
1. Open app → Communication → Client → Phone
2. Click "Setup Device"
3. Enter client phone: +1234567890
4. Click "Make Call"
5. Should work! ✅
```

---

## Expected Console Output

### Success:

```
📞 [Infobip] Initiating call to +1234567890...
📞 [Infobip] From number: +12039008770
📞 [Infobip] Call ringing...
✅ [Infobip] Call established
```

### Still Getting Error?

Check these in Infobip portal:

1. **Voice Enabled?**
   - Portal → Voice and WebRTC → Should be accessible

2. **Phone Number Active?**
   - Portal → Numbers → My Numbers → Status should be "Active"

3. **Credits Available?**
   - Portal → Account → Balance → Should have credits

4. **API Key Valid?**
   - Portal → Developer Tools → API Keys → Should be active

---

## What The Webhooks Were For (Clarification)

The webhook `/api/infobip/voice/webrtc-call-config` I created is:

- ❌ NOT needed for `callPhone()`
- ✅ Only needed if using Calls API (advanced scenarios)
- You can **ignore or delete** it for now

---

## Simplified Architecture

### What Actually Happens:

```
1. Your browser: device.callPhone("+1234567890", options)
2. Infobip WebRTC SDK: Establishes WebRTC connection
3. Infobip Platform: Receives call request
4. Infobip: Dials the number via PSTN network
5. Client's phone: Rings
6. Two-way audio: Works!
```

**No webhooks. No application configuration. Just direct calling.**

---

## From the Official GitHub

Based on the [infobip-rtc-js README](https://github.com/infobip/infobip-rtc-js):

```javascript
// Example of calling phone number with `from` defined:
let phoneCall = infobipRTC.callPhone(
  "41793026727",
  PhoneCallOptions.builder().setFrom("33712345678").build()
);

// Example without `from`:
let phoneCall = infobipRTC.callPhone("41793026727");
```

That's it! No configuration URL needed.

---

## Real Fix For SERVICE_UNAVAILABLE

1. **Check Infobip Account**
   - Voice service enabled?
   - Phone number active?
   - Sufficient credits?

2. **Check Phone Number Format**
   - From: `+12039008770` (your Infobip number)
   - To: `+1234567890` (client's number)
   - Both must include country code with `+`

3. **Check API Access**
   - Valid API key?
   - Correct base URL?
   - Key has voice permissions?

---

## Quick Test

Try calling your own mobile phone:

```typescript
// In your app
makeCall("+1YOUR_MOBILE_NUMBER", clientId);
```

If this works:

- ✅ Your Infobip setup is correct
- ✅ The issue was with the destination number

If this fails:

- ❌ Contact Infobip support
- ❌ Your account may need voice service activation

---

## Summary of My Mistake

I incorrectly said you need to configure a "Call Configuration URL" in Infobip portal. **This is wrong** for WebRTC phone calls.

That's only needed if you're using:

- Calls API platform (advanced scenarios)
- Application calls (not phone calls)
- Custom call flows

For simple **browser-to-phone WebRTC calling** with `callPhone()`:

- ✅ No webhooks needed
- ✅ No application configuration needed
- ✅ Just API key + phone number

---

## Next Steps

1. ✅ Verify Infobip voice service is enabled
2. ✅ Verify you have an active phone number
3. ✅ Verify sufficient credits
4. ✅ Try calling your own phone
5. ✅ Check Infobip logs in portal if still failing

---

Sorry for the confusion! The implementation was correct all along - it's likely an account configuration issue, not a code issue.
