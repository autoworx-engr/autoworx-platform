# 🚀 Quick Start: Infobip WebRTC Incoming Calls

## Installation (5 minutes)

### 1. Install SDK

```bash
npm install @infobip-rtc/websdk
```

### 2. Environment Variables

Add to `.env`:

```bash
INFOBIP_API_KEY=your_api_key
INFOBIP_BASE_URL=abc123.api.infobip.com
INFOBIP_APP_ID=your_webrtc_app_id
```

### 3. Update infobip-rtc.ts

Edit `src/lib/infobip-rtc.ts`, replace mock with:

```typescript
import { createInfobipRtc } from "@infobip-rtc/websdk";

export function createInfobipRTC(options?: InfobipRTCOptions) {
  return createInfobipRtc("", options);
}
```

### 4. Infobip Portal Configuration

**Create WebRTC App:**

1. Log into [Infobip Portal](https://portal.infobip.com/)
2. Voice → Applications → Create
3. Type: **WebRTC**
4. Copy Application ID

**Configure Phone Number:**

1. Numbers → My Numbers → Select number
2. Set Incoming Voice URL:
   ```
   https://your-domain.com/api/infobip/voice/incoming-webrtc
   ```
3. Select your WebRTC application

### 5. Update Database

```bash
npx prisma generate
npx prisma migrate dev --name add_infobip_voice_fields
```

---

## Testing (2 minutes)

### Test Incoming Call

1. Open app: `/dashboard/communication/client`
2. Select any client
3. Click **Phone** tab
4. Click **Setup Device** → Wait for "Device Ready ✓"
5. **Call your Infobip number from mobile**
6. ✨ **Popup should appear in browser!**
7. Click **Accept** → Talk in browser

### Expected Console Output

```
🔧 [Global] Setting up INFOBIP device...
🔑 [Infobip] Token received, initializing WebRTC...
✅ [Infobip] WebRTC connected and ready
📞 [Infobip] Incoming call detected!
📞 [Infobip] From: +1234567890
✅ [Infobip] Incoming call established
```

---

## How It Works

```
Mobile Phone → Dials Infobip Number
    ↓
Infobip → Webhook to your server
    ↓
Server → Routes to WebRTC (browser)
    ↓
Browser → infobipRTC.on('incoming-call')
    ↓
✨ Popup appears!
    ↓
User clicks Accept
    ↓
🎤 Two-way audio in browser
```

---

## Troubleshooting

### No Popup?

- Check `INFOBIP_APP_ID` is correct
- Verify webhook URL is set in portal
- Check browser console for errors
- Ensure mic permission granted

### Can't Connect?

- Verify SDK installed: `npm list @infobip-rtc/websdk`
- Check API key has WebRTC permissions
- Try Chrome browser
- Clear browser cache

### No Audio?

- Grant microphone permission
- Check firewall settings
- Try different network

---

## That's It! 🎉

Incoming Infobip calls now work exactly like Twilio!
