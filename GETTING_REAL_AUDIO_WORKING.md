# 🔊 Getting Real Audio Working - Infobip WebRTC

## Problem

You're seeing "Calling..." but no audio because you're using the **MOCK** implementation. The mock simulates the call flow but doesn't establish real WebRTC audio.

## Solution: Install Real Infobip SDK

### Step 1: Install the Package

```bash
npm install @infobip-rtc/websdk
```

### Step 2: Replace Mock Implementation

Edit `src/lib/infobip-rtc.ts` and replace the entire file with:

```typescript
// Real Infobip WebRTC Implementation
import { createInfobipRtc } from "@infobip-rtc/websdk";

export interface InfobipRTCOptions {
  debug?: boolean;
}

export interface InfobipCallOptions {
  audio?: boolean;
  video?: boolean;
}

export function createInfobipRTC(options?: InfobipRTCOptions) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    // Create real Infobip RTC client
    const infobipRTC = createInfobipRtc("", options || { debug: true });

    console.log("✅ [Infobip] Real WebRTC SDK initialized");

    return infobipRTC;
  } catch (error) {
    console.error("❌ Failed to create Infobip RTC:", error);
    return null;
  }
}

export default createInfobipRTC;
```

### Step 3: Verify Installation

After saving, refresh your browser and check the console. You should see:

```
✅ [Infobip] Real WebRTC SDK initialized
```

Instead of:

```
⚠️ Infobip RTC SDK not loaded. Using mock implementation.
```

### Step 4: Configure Infobip Portal

For **real audio** to work, you also need to configure Infobip:

1. **Create WebRTC Application**:
   - Go to [Infobip Portal](https://portal.infobip.com/)
   - Navigate to **Voice** → **Applications**
   - Click **Create Application**
   - Type: **WebRTC**
   - Copy the **Application ID**

2. **Add to Environment Variables**:

   ```bash
   INFOBIP_APP_ID=your_application_id_here
   ```

3. **Configure Phone Number**:
   - Go to **Numbers** → **My Numbers**
   - Select your number
   - Under **Voice**, select your WebRTC application
   - Set **Incoming Voice URL**:
     ```
     https://your-domain.com/api/infobip/voice/incoming-webrtc
     ```

4. **Update Database**:
   ```sql
   UPDATE infobip_config
   SET application_id = 'your_application_id'
   WHERE company_id = your_company_id;
   ```

### Step 5: Test with Real Audio

1. **Restart your dev server**:

   ```bash
   npm run dev
   ```

2. **Setup Device**:
   - Open app → Communication → Client → Phone
   - Click "Setup Device"
   - Wait for "Device Ready ✓"

3. **Make a Call**:
   - Click "Make Call"
   - You should now hear **real audio**!

4. **Test Incoming Call**:
   - Call your Infobip number from mobile
   - Popup appears in browser
   - Click Accept
   - You should hear **real audio**!

---

## What You'll See

### With Mock (Current):

```
📞 [Mock Infobip] Calling +1234567890...
✅ [Mock Infobip] Call established!
```

- ❌ No real audio
- ❌ No actual connection
- ✅ UI works (for testing)

### With Real SDK:

```
📞 [Infobip WebRTC] Calling +1234567890...
🎤 [Infobip] Requesting microphone permission...
✅ [Infobip] Call established with audio!
```

- ✅ **Real audio both ways**
- ✅ Actual WebRTC connection
- ✅ Full functionality

---

## Troubleshooting

### Package Install Fails

```bash
# Try with legacy peer deps
npm install @infobip-rtc/websdk --legacy-peer-deps

# Or with force
npm install @infobip-rtc/websdk --force
```

### Import Error After Installing

- Restart your dev server
- Clear Next.js cache:
  ```bash
  rm -rf .next
  npm run dev
  ```

### Still No Audio

1. Check microphone permissions in browser
2. Verify `INFOBIP_APP_ID` is set correctly
3. Check Infobip portal configuration
4. Try Chrome browser (best WebRTC support)
5. Check browser console for errors

### TypeScript Errors

The package should include its own types. If not:

```bash
npm install --save-dev @types/webrtc
```

---

## Quick Test Without Installation

If you want to test the UI flow without real audio yet, the current mock implementation now works correctly! It will:

- ✅ Show "Calling..." → "Call connected"
- ✅ Start call duration timer
- ✅ Allow hangup
- ✅ Handle all events properly

But remember: **No real audio** until you install the real SDK!

---

## Current Status

**Mock Implementation**: ✅ Fixed - Events now fire correctly
**Real SDK**: ⏳ Needs installation
**Real Audio**: ⏳ Needs SDK + Infobip configuration

---

Install the SDK to get real audio working! 🎤
