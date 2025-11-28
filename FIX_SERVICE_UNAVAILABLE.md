# 🔧 Infobip Portal Configuration Guide

## Issue Fixed

**Error**: `SERVICE_UNAVAILABLE` - `UNDELIVERABLE_REJECTED_OPERATOR`

**Cause**: Missing WebRTC Application configuration in Infobip portal.

**Solution**: Properly configure your Infobip WebRTC Application with the correct webhook URL.

---

## Step-by-Step Configuration

### 1. Login to Infobip Portal

Go to: https://portal.infobip.com/

### 2. Create or Update WebRTC Application

#### Navigate to Applications:

```
Portal → Voice → Applications
```

#### Create New Application (or edit existing):

1. Click **"Create Application"**
2. Select Type: **"WebRTC"**
3. Fill in details:
   - **Name**: `AutoWorx WebRTC`
   - **Description**: `Browser-based calling for AutoWorx`

### 3. Configure WebRTC Application Settings

#### A. Basic Settings:

- **Application Name**: `AutoWorx WebRTC`
- **Application Type**: `WebRTC`

#### B. **CRITICAL**: Call Configuration URL

This is where the fix happens! Set this URL:

```
https://your-domain.com/api/infobip/voice/webrtc-call-config
```

**Important Notes**:

- ✅ Must be **HTTPS** (not HTTP)
- ✅ Must be **publicly accessible**
- ✅ Infobip will call this URL when you make a call
- ✅ This URL tells Infobip which phone number to dial

#### C. Optional Settings:

- **Answer URL**: Leave empty (handled by call config)
- **Event URL**: `https://your-domain.com/api/infobip/voice/call-status` (optional)
- **Recording**: Enable if you want call recording

### 4. Copy Application ID

After creating/updating the application:

1. Find your **Application ID** (looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)
2. Copy it

### 5. Update Environment Variables

Add to your `.env.local`:

```bash
# Infobip API Configuration
INFOBIP_API_KEY=your_api_key_here
INFOBIP_BASE_URL=your_base_url_here  # e.g., xxxxx.api.infobip.com
INFOBIP_APP_ID=your_application_id_here

# Your domain for webhooks
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 6. Update Database

Update your Infobip configuration:

```sql
UPDATE infobip_config
SET application_id = 'your_application_id_here'
WHERE company_id = your_company_id;
```

### 7. Verify Webhook is Accessible

Test your webhook manually:

```bash
curl -X POST https://your-domain.com/api/infobip/voice/webrtc-call-config \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "from": "+12039008770"
  }'
```

**Expected Response**:

```json
{
  "call": {
    "endpoint": {
      "type": "PHONE",
      "phoneNumber": "+1234567890"
    },
    "from": "+12039008770",
    "recording": {
      "recordingType": "AUDIO"
    }
  }
}
```

### 8. Restart Your Application

```bash
npm run dev
```

---

## What the Fix Does

### Before (Broken):

```
1. Browser calls device.callPhone("+1234567890")
2. Infobip receives call request
3. Infobip looks for Call Configuration URL
4. ❌ No URL configured or wrong URL
5. ❌ Error: SERVICE_UNAVAILABLE
6. ❌ Call fails immediately
```

### After (Fixed):

```
1. Browser calls device.callPhone("+1234567890", options)
2. Infobip receives call request with from number
3. Infobip calls your webhook: /api/infobip/voice/webrtc-call-config
4. ✅ Webhook returns: "Connect to +1234567890"
5. ✅ Infobip dials the number via PSTN
6. ✅ Client's phone rings
7. ✅ Two-way audio works!
```

---

## Testing After Configuration

### 1. Setup Device

```
Communication → Client → Phone → "Setup Device"
```

**Console should show**:

```
✅ [Infobip] Real WebRTC SDK factory ready
✅ [Infobip] WebRTC client created with token
✅ [Infobip] WebRTC connected and ready
```

### 2. Make Test Call

```
Enter: +1234567890
Click: "Make Call"
```

**Console should show**:

```
📞 [Infobip] Initiating call to +1234567890...
📞 [Infobip] From number: +12039008770
📞 [Infobip] Call ringing...
✅ [Infobip] Call established
```

**Your webhook logs should show**:

```
📞 [Infobip WebRTC] Call configuration webhook called
📞 [Infobip WebRTC] Configuring call to: +1234567890
✅ [Infobip WebRTC] Returning call configuration
```

### 3. Verify Call Connection

- Client's phone should ring
- When client answers: "Call connected" appears
- Duration timer starts
- Two-way audio works

---

## Troubleshooting

### Still Getting SERVICE_UNAVAILABLE?

**Check 1: Webhook URL**

- Is it set in Infobip portal?
- Is it HTTPS?
- Is it publicly accessible?
- Test with curl command above

**Check 2: Application ID**

- Is `INFOBIP_APP_ID` in `.env.local`?
- Does it match the Application ID in portal?
- Restart server after changing env vars

**Check 3: Phone Number Format**

- Use E.164 format: `+1234567890`
- Include country code with `+`
- No spaces or special characters

**Check 4: Webhook Response**

- Check your server logs
- Webhook should return 200 status
- Response must include `call.endpoint.phoneNumber`

### Getting 404 on Webhook?

Make sure file exists at:

```
src/app/api/infobip/voice/webrtc-call-config/route.ts
```

Restart dev server:

```bash
npm run dev
```

### Webhook Not Being Called?

1. Check Infobip portal Call Configuration URL is set correctly
2. Verify URL is publicly accessible (not localhost)
3. Check Infobip logs in portal for webhook errors
4. Test webhook manually with curl

### No Audio After Connection?

This is a separate issue from SERVICE_UNAVAILABLE:

- Check microphone permissions
- Verify browser supports WebRTC (use Chrome)
- Check speaker/headphone connection

---

## Development vs Production

### Development (localhost):

**Problem**: Infobip can't reach localhost webhooks

**Solutions**:

1. **Use ngrok** (Recommended):

   ```bash
   ngrok http 3000
   ```

   Then use ngrok URL in Infobip portal:

   ```
   https://abc123.ngrok.io/api/infobip/voice/webrtc-call-config
   ```

2. **Deploy to staging**: Use a publicly accessible staging server

### Production:

Use your actual domain:

```
https://app.autoworx.com/api/infobip/voice/webrtc-call-config
```

---

## Infobip Portal Screenshots Guide

### Finding Call Configuration URL:

1. **Portal → Voice → Applications**
2. Click on your WebRTC application
3. Look for **"Configuration"** or **"Settings"** tab
4. Find field labeled:
   - "Call Configuration URL" OR
   - "Answer URL" OR
   - "Application URL"
5. Enter your webhook URL there

### Common Field Names:

- ✅ Call Configuration URL
- ✅ Application URL
- ✅ Answer URL
- ✅ Webhook URL

---

## What Changed in Code

### New File Created:

```
src/app/api/infobip/voice/webrtc-call-config/route.ts
```

This webhook:

- Receives call requests from Infobip
- Extracts destination phone number
- Returns configuration telling Infobip to dial that number

### Updated File:

```
src/context/VoiceDeviceContext.tsx
```

Changes:

- Stores Infobip phone number in state
- Uses `PhoneCallOptions.builder()` to set `from` number
- Passes proper options to `callPhone()` method

---

## Key Points

1. ✅ **WebRTC Application** must be configured in Infobip portal
2. ✅ **Call Configuration URL** must point to your webhook
3. ✅ **Webhook must be HTTPS** and publicly accessible
4. ✅ **From number** must be provided in call options
5. ✅ **Application ID** must match in env vars and database

---

## Summary

The `SERVICE_UNAVAILABLE` error was caused by:

1. Missing/incorrect Call Configuration URL in Infobip portal
2. Missing `from` parameter in `callPhone()` call

**Fixed by**:

1. Creating webhook: `/api/infobip/voice/webrtc-call-config`
2. Configuring URL in Infobip portal
3. Using `PhoneCallOptions` with `from` number

---

## Next Steps

1. ✅ Configure Call Configuration URL in Infobip portal
2. ✅ Update environment variables
3. ✅ Restart application
4. ✅ Test call - should work now!

---

Need help? Check Infobip portal logs for webhook call details.
