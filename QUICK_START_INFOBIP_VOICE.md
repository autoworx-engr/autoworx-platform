# 🚀 Quick Start: Infobip Voice Integration

## 1️⃣ Generate Prisma Client

```bash
npx prisma generate
```

## 2️⃣ Run Migration

```bash
npx prisma migrate dev --name add_infobip_voice_fields
```

## 3️⃣ Add Environment Variables

```bash
INFOBIP_API_KEY=your_infobip_api_key
INFOBIP_BASE_URL=your_region.api.infobip.com
INFOBIP_APP_ID=your_application_id
INFOBIP_CALLS_CONFIG_ID=your_calls_configuration_id
```

## 4️⃣ Switch Company to Infobip

```typescript
// In your code or database
await prisma.company.update({
  where: { id: companyId },
  data: { smsGateway: "INFOBIP" },
});

await prisma.infobipConfig.upsert({
  where: { companyId },
  create: {
    companyId,
    phoneNumber: "+1234567890",
    applicationId: "your_app_id",
    callsConfigurationId: "your_config_id",
  },
  update: {
    applicationId: "your_app_id",
    callsConfigurationId: "your_config_id",
  },
});
```

## 5️⃣ Test It

1. Navigate to: `/dashboard/communication/client`
2. Select a client
3. Go to Phone tab
4. Click "Setup Device"
5. Click "Make Call"

## 🎯 Key Files

| File                     | Purpose                 |
| ------------------------ | ----------------------- |
| `VoiceDeviceContext.tsx` | Main voice device logic |
| `VoiceAutoSetup.tsx`     | Auto-initialize device  |
| `SendCall.tsx`           | Call UI component       |
| `Phone.tsx`              | Phone container         |

## 🔄 Provider Switching

The system automatically detects and uses the correct provider:

- **Twilio** → When `company.smsGateway = 'TWILIO'`
- **Infobip** → When `company.smsGateway = 'INFOBIP'`

## 📞 API Endpoints

```
POST /api/infobip/voice/token          → Get auth token
POST /api/infobip/voice/incoming       → Incoming call webhook
POST /api/infobip/voice/make-call      → Make outgoing call
POST /api/infobip/voice/call-status    → Call status webhook
GET  /api/infobip/get-phone-number     → Get phone number
GET  /api/company/sms-gateway          → Get provider
```

## ✅ Verification Checklist

- [ ] Prisma generated successfully
- [ ] Migration ran without errors
- [ ] Environment variables set
- [ ] Infobip portal configured
- [ ] Webhooks publicly accessible
- [ ] Company `smsGateway` set correctly
- [ ] `InfobipConfig` record exists
- [ ] Test call works

## 🆘 Quick Fixes

**Issue: "Cannot find module VoiceDeviceContext"**

```bash
# Restart TypeScript server
# VS Code: Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

**Issue: Type errors with InfobipConfig**

```bash
npx prisma generate
```

**Issue: Device not ready**

- Check browser console
- Verify environment variables
- Check microphone permissions

**Issue: Calls not connecting**

- Verify webhooks in Infobip portal
- Check `applicationId` and `callsConfigurationId`
- Review Infobip portal logs

## 📚 Full Documentation

See: `INFOBIP_VOICE_IMPLEMENTATION.md` for complete details

---

**Ready to call!** 📞
