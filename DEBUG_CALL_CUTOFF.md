# Debugging: Call Gets Cut Off When Clicking Answer

## Issue Description

When clicking the "Accept" button for an incoming call, the call disconnects immediately instead of connecting.

## Root Causes & Fixes Applied

### Fix 1: Event Listeners Setup Order ✅

**Problem**: Event listeners were being attached AFTER calling `incomingCall.accept()`.

**Why it fails**:

- The "accept" event fires immediately when `accept()` is called
- If listeners aren't attached yet, events are missed
- The call connects briefly but then disconnects because no handlers are in place

**Solution**: Attach all event listeners BEFORE calling `accept()`

```typescript
// ❌ WRONG - Events are missed
incomingCall.accept();
incomingCall.on("accept", () => { ... }); // Too late!

// ✅ CORRECT - Events are caught
incomingCall.on("accept", () => { ... }); // Set up first
incomingCall.accept(); // Now accept
```

### Fix 2: Timer Management ✅

**Problem**: Not clearing old timer before creating new one.

**Why it fails**:

- Multiple timers can run simultaneously
- Memory leaks
- Incorrect duration counting

**Solution**: Clear existing timer before creating new interval

```typescript
// Clear any existing timer
if (timer) {
  clearInterval(timer);
}

// Then create new one
const interval = setInterval(() => {
  setCallDuration((prev) => prev + 1);
}, 1000);
setTimer(interval);
```

### Fix 3: TwiML Configuration ✅

**Problem**: Call might timeout too quickly or answer prematurely.

**Solution**: Added configuration to TwiML:

- `timeout: 60` - Gives 60 seconds to answer
- `answerOnBridge: true` - Only answers when actually connected

```typescript
const dial = voiceResponse.dial({
  record: "record-from-answer",
  recordingStatusCallback: "...",
  recordingStatusCallbackMethod: "POST",
  timeout: 60, // ✅ Added
  answerOnBridge: true, // ✅ Added
});
```

## Testing Steps

### Step 1: Clear Browser Cache & Refresh

```
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Refresh"
4. OR press Ctrl+Shift+Delete and clear cache
```

### Step 2: Test Incoming Call

```
1. Login to dashboard
2. Wait for "Device registered" in console
3. From another phone, call your Twilio number
4. Modal should appear
5. Click "Accept"
6. Check console for these logs:
```

**Expected Console Logs:**

```
📞 [Global] Incoming call detected!
📞 [Global] Call from: +1234567890
📞 [Global] Accepting incoming call...
🎤 [Global] Microphone permission granted
✅ [Global] Call accepted, waiting for connection...
✅ [Global] Call connected
```

### Step 3: Verify Audio

```
1. After accepting, speak into microphone
2. Verify other party can hear you
3. Verify you can hear other party
4. Check duration counter is incrementing
```

## Common Issues & Solutions

### Issue 1: Call Disconnects Immediately

**Check Console For:**

```
❌ [Global] Incoming Call Error: ...
❌ [Global] Call canceled
```

**Possible Causes:**

1. **Microphone permission denied**
   - Solution: Allow microphone access when prompted
   - Chrome: Settings > Privacy > Site Settings > Microphone

2. **Event listeners not attached**
   - Solution: Already fixed in the code update

3. **Network/WebRTC issues**
   - Solution: Check browser console for WebRTC errors
   - Try different browser (Chrome recommended)

### Issue 2: No Audio After Accepting

**Check:**

1. **Microphone is not muted** in browser/system
2. **Correct audio devices selected** in browser settings
3. **WebRTC connection established**:
   ```javascript
   // Check in console
   navigator.mediaDevices
     .getUserMedia({ audio: true })
     .then(() => console.log("✅ Mic works"))
     .catch((err) => console.error("❌ Mic error:", err));
   ```

### Issue 3: Modal Disappears But No Connection

**Debug Steps:**

1. Check if "accept" event fired:

   ```
   Look for: ✅ [Global] Call connected
   ```

2. If missing, check call state:

   ```javascript
   // The call object should be in "open" state
   // Check server logs for TwiML response
   ```

3. Verify TwiML identity matches:
   ```
   Server log: 📱 Dialing to client identity: +1234567890
   Browser log: 📱 [Global] Device identity: +1234567890
   Must match!
   ```

### Issue 4: Call Connects Then Immediately Drops

**Causes:**

1. **Network instability** - Check internet connection
2. **Twilio account issues** - Check Twilio console for errors
3. **Token expired** - Token lasts 1 hour, re-login if needed

## Advanced Debugging

### Check Call Status in Real-Time

```typescript
// Add this to acceptIncomingCall function (temporary debugging)
incomingCall.on("accept", () => {
  console.log("🔍 Call status:", incomingCall.status());
  console.log("🔍 Call direction:", incomingCall.direction);
  console.log("🔍 Call parameters:", incomingCall.parameters);
});
```

### Monitor WebRTC Connection

```
1. Open Chrome DevTools
2. Go to chrome://webrtc-internals/
3. Make a call
4. Watch connection stats in real-time
5. Look for "iceConnectionState": "connected"
```

### Check Twilio Console

```
1. Go to Twilio Console > Monitor > Logs > Calls
2. Find your recent call
3. Check status and error messages
4. Look for "completed" status (good) vs "failed" (bad)
```

## Verification Checklist

After applying fixes, verify:

- [ ] Browser console shows all expected logs
- [ ] "Device registered" appears on login
- [ ] Incoming call modal appears when called
- [ ] Clicking "Accept" shows "Call accepted" log
- [ ] "Call connected" log appears after accepting
- [ ] Two-way audio works
- [ ] Duration counter increments
- [ ] End call works properly
- [ ] No errors in console

## Code Changes Summary

**File: `src/context/TwilioDeviceContext.tsx`**

```diff
const acceptIncomingCall = useCallback(async () => {
  if (!incomingCall) return;

  try {
+   console.log("📞 [Global] Accepting incoming call...");
    await navigator.mediaDevices.getUserMedia({ audio: true });
+   console.log("🎤 [Global] Microphone permission granted");

-   // Accept the call
-   incomingCall.accept();
-   setCurrentConnection(incomingCall);
-   setIncomingCall(null);

    // Setup call event listeners
+   // CRITICAL: Set up BEFORE accepting!
    incomingCall.on("accept", () => {
      console.log("✅ [Global] Call connected");
      setCallStatus("Call connected");
      setCallDuration(0);
+
+     // Clear any existing timer
+     if (timer) {
+       clearInterval(timer);
+     }

      const interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
      setTimer(interval);
    });

    // ... other event listeners ...

+   // Now accept the call
+   incomingCall.accept();
+   console.log("✅ [Global] Call accepted, waiting for connection...");
+   setCurrentConnection(incomingCall);
+   setIncomingCall(null);

  } catch (error) {
    console.error("❌ [Global] Error accepting call:", error);
  }
}, [incomingCall, timer]);
```

**File: `src/app/api/twilio/incoming/route.ts`**

```diff
const dial = voiceResponse.dial({
  record: "record-from-answer",
  recordingStatusCallback: `...`,
  recordingStatusCallbackMethod: "POST",
+ timeout: 60,
+ answerOnBridge: true,
});
```

## Still Having Issues?

### Try These Steps:

1. **Restart Browser Completely**
   - Close all tabs
   - Reopen and login fresh

2. **Check Browser Compatibility**
   - Chrome/Edge (recommended) ✅
   - Firefox ✅
   - Safari (may have issues) ⚠️

3. **Verify Twilio Configuration**
   - Phone number webhook points to `/api/twilio/incoming`
   - TwiML App configured correctly
   - Account has sufficient credits

4. **Network Check**
   - Not behind restrictive firewall
   - WebRTC ports not blocked
   - Try different network if possible

5. **Check Console for Specific Errors**
   - Look for red error messages
   - Copy full error text for debugging
   - Check both browser and server logs

## Success Indicators

When working correctly, you should see:

**Browser Console:**

```
📞 [Global] Incoming call detected!
📞 [Global] Call from: +1234567890
📞 [Global] Accepting incoming call...
🎤 [Global] Microphone permission granted
✅ [Global] Call accepted, waiting for connection...
✅ [Global] Call connected
```

**Call Behavior:**

- Modal appears immediately when called
- Clicking Accept shows "waiting..." briefly
- Modal closes and call connects
- Duration counter starts
- Two-way audio works perfectly
- End call works smoothly

---

**If issues persist after all fixes**, share:

1. Full browser console output
2. Server log output
3. Twilio call log SID
4. Browser and version being used
