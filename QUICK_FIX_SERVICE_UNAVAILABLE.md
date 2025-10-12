# 🚨 Quick Fix: SERVICE_UNAVAILABLE Error

## Error You're Seeing

```
"status":{"id":10309,"name":"SERVICE_UNAVAILABLE"}
Reason: UNDELIVERABLE_REJECTED_OPERATOR
```

## Quick Fix (5 Minutes)

### 1. Configure Infobip Portal

**Go to**: https://portal.infobip.com/ → Voice → Applications

**Find your WebRTC application** and set this URL:

```
https://your-domain.com/api/infobip/voice/webrtc-call-config
```

Look for field named:

- "Call Configuration URL" OR
- "Application URL" OR
- "Answer URL"

### 2. For Local Development

If testing on localhost, use **ngrok**:

```bash
# Terminal 1: Start your app
npm run dev

# Terminal 2: Start ngrok
ngrok http 3000
```

Copy the ngrok URL (e.g., `https://abc123.ngrok.io`) and use it in Infobip:

```
https://abc123.ngrok.io/api/infobip/voice/webrtc-call-config
```

### 3. Restart Application

```bash
npm run dev
```

### 4. Test Again

Make a call - should work now! ✅

---

## What Was Fixed

### Code Changes Made:

1. **New Webhook Created**:

   ```
   src/app/api/infobip/voice/webrtc-call-config/route.ts
   ```

   This tells Infobip which phone number to dial.

2. **Updated Call Logic**:
   ```
   src/context/VoiceDeviceContext.tsx
   ```
   Now uses `PhoneCallOptions` with `from` number.

### Why It Failed Before:

```
Browser → Infobip: "Make call to +1234567890"
Infobip: "Where should I get call config?"
❌ No URL configured
❌ Error: SERVICE_UNAVAILABLE
```

### Why It Works Now:

```
Browser → Infobip: "Make call to +1234567890" (with from number)
Infobip → Your Webhook: "What should I do?"
Webhook → Infobip: "Dial +1234567890"
✅ Infobip dials the number
✅ Call connects!
```

---

## Verify It's Working

### Expected Console Output:

```
📞 [Infobip] Initiating call to +1234567890...
📞 [Infobip] From number: +12039008770
📞 [Infobip] Call ringing...
✅ [Infobip] Call established
```

### Expected Behavior:

1. Click "Make Call"
2. Shows "Ringing..."
3. Client's phone rings
4. Client answers
5. Shows "Call connected"
6. Two-way audio works!

---

## Still Not Working?

### Check These:

1. **Webhook URL in Infobip Portal**:
   - Is it HTTPS?
   - Is it publicly accessible?
   - Is it exactly: `/api/infobip/voice/webrtc-call-config`?

2. **Test Webhook Manually**:

   ```bash
   curl -X POST https://your-domain.com/api/infobip/voice/webrtc-call-config \
     -H "Content-Type: application/json" \
     -d '{"to":"+1234567890","from":"+12039008770"}'
   ```

   Should return:

   ```json
   {
     "call": {
       "endpoint": {
         "type": "PHONE",
         "phoneNumber": "+1234567890"
       },
       "from": "+12039008770"
     }
   }
   ```

3. **Check Infobip Logs**:
   - Go to Infobip Portal → Logs
   - Look for webhook call attempts
   - Check for errors

---

## Need More Help?

See complete guide: **FIX_SERVICE_UNAVAILABLE.md**
