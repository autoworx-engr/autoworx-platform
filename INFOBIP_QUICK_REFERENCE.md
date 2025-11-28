# 📞 Infobip WebRTC - Quick Reference

## What You Have Now

**Browser-to-Phone Calling** using Infobip WebRTC SDK

```
Your Browser (microphone) → Infobip → Client's Phone
```

You talk through your browser, client receives call on their phone.

---

## Quick Test (After Configuration)

### 1. Setup Device

```
Communication → Client → Phone → "Setup Device"
```

**Expected Console**:

```
✅ [Infobip] Real WebRTC SDK factory ready
✅ [Infobip] WebRTC client created with token
✅ [Infobip] WebRTC connected and ready
```

### 2. Make Call

```
Enter: +1234567890
Click: "Make Call"
Allow microphone permission
```

**Expected Flow**:

```
📞 Calling... → 📞 Ringing... → ✅ Call connected → Duration: 00:01, 00:02...
```

### 3. During Call

- You speak → Client hears you
- Client speaks → You hear them
- Duration timer updates every second

### 4. End Call

```
Click: "End Call"
```

---

## Configuration Required

### Environment Variables (`.env.local`):

```bash
INFOBIP_API_KEY=your_api_key
INFOBIP_BASE_URL=https://api.infobip.com
INFOBIP_APP_ID=your_webrtc_app_id
```

### Infobip Portal:

1. Create WebRTC Application
2. Copy Application ID
3. Set webhook: `https://your-domain.com/api/infobip/voice/make-call`

### Database:

```sql
UPDATE infobip_config
SET application_id = 'your-app-id'
WHERE company_id = your_company_id;

UPDATE company
SET sms_gateway = 'INFOBIP'
WHERE id = your_company_id;
```

---

## Key Files Changed

| File                                 | What Changed                       |
| ------------------------------------ | ---------------------------------- |
| `src/lib/infobip-rtc.ts`             | ✅ Real SDK (was mock)             |
| `src/context/VoiceDeviceContext.tsx` | ✅ Uses proper events/methods      |
| Package                              | ✅ `infobip-rtc` v2.7.18 installed |

---

## API Methods

### Create RTC Client:

```typescript
const factory = createInfobipRtc(token, { debug: true });
factory.connect();
```

### Make Phone Call:

```typescript
const call = factory.callPhone("+1234567890");
```

### Listen for Events:

```typescript
// Device events
factory.on(InfobipRTCEvent.CONNECTED, () => {});
factory.on(InfobipRTCEvent.DISCONNECTED, () => {});
factory.on(InfobipRTCEvent.INCOMING_WEBRTC_CALL, (call) => {});

// Call events
call.on(CallsApiEvent.RINGING, () => {});
call.on(CallsApiEvent.ESTABLISHED, () => {});
call.on(CallsApiEvent.HANGUP, () => {});
call.on(CallsApiEvent.ERROR, (error) => {});
```

### Hangup Call:

```typescript
call.hangup();
```

---

## Phone Number Format

✅ **Correct**:

- `+1234567890` (US)
- `+447911123456` (UK)
- `+60123456789` (Malaysia)

❌ **Wrong**:

- `1234567890` (missing +)
- `(123) 456-7890` (formatting)

---

## Troubleshooting

### "Device not ready"

```bash
npm run dev  # Restart server
```

### No audio

- Check microphone permission
- Try Chrome browser
- Check speaker/headphone

### Call doesn't connect

- Verify phone number format
- Check Infobip Application ID
- View Infobip portal logs

### TypeScript errors

```bash
rm -rf .next
npm run dev
```

---

## Browser Requirements

✅ **Use**: Chrome, Edge, Firefox
❌ **Avoid**: Safari

---

## Event Flow

```
Click "Make Call"
  ↓
device.callPhone("+1234567890")
  ↓
RINGING → "Ringing..."
  ↓
Client answers
  ↓
ESTABLISHED → "Call connected" + timer
  ↓
Two-way audio active
  ↓
Click "End Call" or client hangs up
  ↓
HANGUP → "Call ended"
```

---

## Documentation

📘 **IMPLEMENTATION_COMPLETE_INFOBIP_WEBRTC.md** - Full summary
📗 **INFOBIP_OUTBOUND_CALLS.md** - Complete guide
📙 **QUICK_START_INFOBIP.md** - Setup guide

---

## Status

✅ **SDK**: Real `infobip-rtc` installed
✅ **Implementation**: Complete
⏳ **Configuration**: Needs Infobip portal setup
⏳ **Testing**: Ready to test with real calls

---

## Next Step

**Configure Infobip portal** → See `QUICK_START_INFOBIP.md`

Then test your first real call! 🎉
