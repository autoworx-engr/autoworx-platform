# Troubleshooting Incoming Calls

## Issue: Server logs show incoming call webhook triggered, but browser doesn't receive the call

### What to Check:

## 1. Device Registration Status

**In Browser Console**, after clicking "Setup Device", you should see:

```
✅ Twilio Device is ready and listening for calls
📱 Device identity: +1234567890 (your Twilio number)
📱 Device registered successfully
✅ Device registered and ready to receive calls
```

If you don't see these logs, the device isn't properly set up.

## 2. Identity Matching

**Check server logs** when an incoming call arrives:

```
📱 Dialing to client identity: +1234567890
```

**This MUST match** the identity shown in browser console. If they don't match, the call won't route to your browser.

## 3. TwiML Response Format

**Check server logs** for the TwiML response:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial record="record-from-answer" recordingStatusCallback="..." recordingStatusCallbackMethod="POST">
    <Client>+1234567890</Client>
  </Dial>
</Response>
```

The `<Client>` tag should contain your device identity.

## 4. Browser Tab State

- Keep the browser tab **ACTIVE** (not minimized or in background)
- Some browsers restrict WebRTC in background tabs
- Try keeping the tab focused during incoming calls

## 5. Network & WebSocket Connection

Open browser DevTools > Network tab:

- Look for WebSocket connections to Twilio
- Should see `wss://chunderw-gll.twilio.com` or similar
- If WebSocket is disconnected, the device won't receive calls

## 6. Token & Permissions

Check in browser console if you see any errors related to:

- Audio permissions denied
- Invalid token
- Token expired (tokens expire after 1 hour)

## Common Issues & Solutions

### Issue: "Device is ready" but never "Device registered"

**Solution**: The `twilioDevice.register()` call might be failing silently. Check:

1. Token has correct grants
2. Token hasn't expired
3. No network errors in console

### Issue: Identity mismatch between token and TwiML

**Problem**: Token created with identity "A", but TwiML dials client "B"

**Solution**: Ensure both use the same value:

- Token endpoint: `identity: phoneNumber` (Twilio number)
- Incoming endpoint: `dial.client(twilioCredentials.phoneNumber)`

### Issue: "Device registered" but incoming event never fires

**Possible causes**:

1. **Browser tab in background** - Bring to foreground
2. **Token expired** - Re-setup device (tokens last 1 hour)
3. **WebSocket disconnected** - Check Network tab
4. **Multiple devices with same identity** - Only the most recent registration receives calls

### Issue: Incoming event fires but modal doesn't show

**Check**:

1. `incomingCall` state is being set
2. `IncomingCallAlert` component is rendering
3. No z-index issues hiding the modal

## Testing Steps

1. **Setup Device**:

   ```
   Click "Setup Device" button
   Grant microphone permissions
   Verify console logs show device ready & registered
   ```

2. **Make Test Call**:

   ```
   From external phone, call your Twilio number
   Watch server logs for webhook trigger
   Watch browser console for "📞 Incoming call detected!"
   ```

3. **Debug Mismatch**:
   ```
   Server log: "📱 Dialing to client identity: X"
   Browser log: "📱 Device identity: Y"
   If X ≠ Y, the call won't connect
   ```

## Quick Fixes

### Fix 1: Re-register Device

```javascript
// If device is already setup but not receiving calls
if (device) {
  await device.register();
  console.log("Device re-registered");
}
```

### Fix 2: Check Token Expiry

Tokens expire after 1 hour. If device was setup >1 hour ago, click "Setup Device" again.

### Fix 3: Verify Twilio Configuration

In Twilio Console:

- Phone Number > Voice Configuration > TwiML App (or Webhook)
- Should point to: `https://your-domain.com/api/twilio/incoming`
- Verify URL is correct and publicly accessible

## Expected Flow

1. External caller dials Twilio number
2. Twilio sends POST to `/api/twilio/incoming`
3. Server logs: "📱 Dialing to client identity: +1234567890"
4. Server returns TwiML with `<Client>` tag
5. Twilio routes call to registered device with matching identity
6. Browser logs: "📞 Incoming call detected!"
7. Modal appears with Accept/Reject buttons

If any step fails, the call won't arrive in the browser.
