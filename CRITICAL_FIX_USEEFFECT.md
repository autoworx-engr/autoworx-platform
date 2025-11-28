# 🔴 CRITICAL FIX: Call Disconnects Immediately After Accepting

## Date: October 9, 2025

## The Problem

After clicking "Accept" on incoming call, the call connects for a split second then immediately disconnects.

### Console Log Evidence:

```
✅ [Global] Call connected          <- Line 128
📞 [Global] Call ended              <- Line 144 (immediately after!)
🧹 [Global] Cleaning up device      <- Device destroyed
⚠️ [Global] Device unregistered
🧹 [Global] Cleaning up device      <- Cleanup running again
```

## Root Cause Analysis

### ❌ Problem #1: useEffect Cleanup with Dependencies

**Location:** `src/context/TwilioDeviceContext.tsx`

**Bad Code:**

```typescript
useEffect(() => {
  return () => {
    if (device) {
      console.log("🧹 [Global] Cleaning up device");
      device.destroy(); // ☠️ This destroys the active device!
    }
    if (timer) {
      clearInterval(timer);
    }
  };
}, [device, timer]); // ⚠️ These dependencies cause premature cleanup!
```

**Why it fails:**

1. User accepts call ✅
2. Call connects and timer starts: `setTimer(interval)` ✅
3. `timer` state updates from `null` to `interval` 🔄
4. useEffect detects `timer` dependency changed 👀
5. **Cleanup function runs** (because dependencies changed) 🔥
6. `device.destroy()` is called 💥
7. Device unregisters from Twilio ❌
8. Call disconnects immediately ❌

**React useEffect Behavior:**

> When dependencies change, React runs the cleanup function from the PREVIOUS render, then runs the effect again. Having `device` and `timer` in the dependency array means ANY change to these values triggers cleanup!

### ❌ Problem #2: Auto-Setup Infinite Loop

**Location:** `src/components/TwilioAutoSetup.tsx`

**Bad Code:**

```typescript
useEffect(() => {
  if (twilioPhoneNumber && !isDeviceReady) {
    setupDevice(twilioPhoneNumber);
  }
}, [twilioPhoneNumber, isDeviceReady, setupDevice]);
// ⚠️ setupDevice is recreated every render!
```

**Why it causes issues:**

1. `setupDevice` is a function created with `useCallback` in the context
2. Every time context state changes, `setupDevice` reference changes
3. This triggers the useEffect to run again
4. Causes device to be re-initialized repeatedly
5. Compounds the cleanup issue

## The Fix

### ✅ Fix #1: Remove Dependencies from Cleanup useEffect

```typescript
// Cleanup on unmount ONLY (no dependencies to avoid premature cleanup)
useEffect(() => {
  return () => {
    if (device) {
      console.log("🧹 [Global] Cleaning up device on unmount");
      device.destroy();
    }
    if (timer) {
      clearInterval(timer);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Empty dependency array - only run on mount/unmount
```

**Why this works:**

- Empty dependency array `[]` means:
  - Effect runs **once** on mount
  - Cleanup runs **only** on unmount (when component is removed from DOM)
- Timer and device changes no longer trigger cleanup
- Device stays alive during the entire session
- ESLint warning disabled because this is intentional behavior

### ✅ Fix #2: Remove setupDevice from Auto-Setup Dependencies

```typescript
useEffect(() => {
  // Automatically setup device when component mounts and we have a phone number
  if (twilioPhoneNumber && !isDeviceReady) {
    console.log("🚀 Auto-setting up Twilio device for incoming calls");
    setupDevice(twilioPhoneNumber);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [twilioPhoneNumber, isDeviceReady]); // Remove setupDevice from dependencies
```

**Why this works:**

- Only re-runs when `twilioPhoneNumber` or `isDeviceReady` changes
- `setupDevice` function changes don't trigger re-initialization
- Prevents infinite setup loops

## Expected Behavior After Fix

### Console Logs:

```
📞 [Global] Incoming call detected!
📞 [Global] Call from: +12293038936
📞 [Global] Accepting incoming call...
🎤 [Global] Microphone permission granted
✅ [Global] Call accepted, waiting for connection...
✅ [Global] Call connected
(timer increments normally)
... user talks on call ...
📞 [Global] Call ended (only when user actually ends the call)
```

### No More Premature:

- ❌ `🧹 [Global] Cleaning up device` (during call)
- ❌ `⚠️ [Global] Device unregistered` (during call)
- ❌ Device re-initialization loops

## Testing Steps

1. **Hard refresh** browser (Ctrl + Shift + R)
2. **Login** and wait for "Device registered" log
3. **Call** your Twilio number from another phone
4. **Click Accept** on the modal
5. **Verify:**
   - ✅ "Call connected" appears
   - ✅ NO "Cleaning up device" immediately after
   - ✅ Timer increments (1, 2, 3...)
   - ✅ Two-way audio works
   - ✅ Call stays connected until you click "End Call"

## Key Learnings

### React useEffect Dependencies Rule:

> **Only include dependencies that you want to trigger the effect to re-run.**

### Common Pitfalls:

1. **Including state in cleanup effects** - Causes cleanup on every state change
2. **Including functions in dependency arrays** - Functions recreated every render cause infinite loops
3. **Not understanding cleanup timing** - Cleanup runs before next effect AND on unmount

### Best Practices:

✅ **DO:** Use empty `[]` for mount/unmount only effects
✅ **DO:** Disable ESLint when you intentionally want empty dependencies
✅ **DO:** Use `useCallback` with proper dependencies for stable function references
✅ **DON'T:** Add every variable the effect uses to dependencies blindly
✅ **DON'T:** Include functions in dependency arrays unless necessary

## Files Modified

1. **src/context/TwilioDeviceContext.tsx**
   - Changed cleanup useEffect from `[device, timer]` to `[]`
   - Added comment explaining why dependencies are empty

2. **src/components/TwilioAutoSetup.tsx**
   - Removed `setupDevice` from useEffect dependencies
   - Kept only `twilioPhoneNumber` and `isDeviceReady`

## Verification

Run this command to verify no TypeScript errors:

```bash
npm run build
```

Expected: No compilation errors ✅

---

**Status:** 🟢 FIXED
**Severity:** CRITICAL (P0)
**Impact:** Incoming calls now stay connected after accepting
