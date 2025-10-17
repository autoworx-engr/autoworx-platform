# 🎯 FINAL SOLUTION: Infobip Phone Calls Setup

## The Root Cause

Your SDK logs show:

```json
"applicationId": "WEBRTC",
"callsConfigurationId": "WEBRTC"
```

These are **default placeholder values** used by the SDK when no proper configuration exists.

**ERROR 10309 - SERVICE_UNAVAILABLE** means: Infobip received your call request but couldn't process it because the configuration IDs don't exist or aren't properly set up for phone calls.

---

## Solution: Create Calls Configuration in Infobip Portal

### Part 1: Verify/Create Application

1. **Login**: https://portal.infobip.com/
2. **Navigate**: Channels and Numbers → Channels → **Voice and WebRTC**
3. **Click**: **Applications** tab
4. **Check**: Do you have an application already?
   - If YES: Note the **Application ID**
   - If NO: Create one:
     - Click **+ Create Application**
     - Name: `AutoWorx WebRTC`
     - Save and copy the **Application ID**

### Part 2: Create Calls Configuration (CRITICAL!)

This is what's missing!

1. **Still in Voice and WebRTC section**
2. **Click**: **Configurations** or **Calls Configurations** tab
3. **Click**: **+ Create Configuration** or **+ New Configuration**
4. **Fill in**:
   ```
   Name: AutoWorx Phone Calls
   Type: WebRTC / Platform: WebRTC
   Default From Number: +12039008770 (your Infobip number)
   ```
5. **Save** and copy the **Calls Configuration ID**

> **Note**: The exact menu names may vary slightly depending on your Infobip portal version. Look for "Configurations", "Calls Configurations", or "Call Setup" under Voice section.

### Part 3: Update Your Database

```sql
UPDATE infobip_config
SET
  application_id = 'your_application_id_from_step1',
  calls_configuration_id = 'your_calls_config_id_from_step2'
WHERE company_id = your_company_id;
```

Example:

```sql
UPDATE infobip_config
SET
  application_id = '1a2b3c4d-5678-90ab-cdef-1234567890ab',
  calls_configuration_id = '9z8y7x6w-5432-10vu-tsr q-0987654321zy'
WHERE company_id = 1;
```

### Part 4: Restart Your Application

```bash
npm run dev
```

### Part 5: Test

Make a call - it should now work! ✅

---

## What If "Calls Configuration" Doesn't Exist in Portal?

If you don't see "Calls Configurations" or similar option, it might mean:

### Option A: Your Account Needs Voice Calls Enabled

**Contact Infobip Support**:

- Email: support@infobip.com
- Tell them: "I need Voice Calls and WebRTC enabled for phone calling"
- Mention: "I'm getting ERROR 10309 when trying to make phone calls from browser"

### Option B: Use Different Setup Method

Some Infobip accounts have different setup flows. Try:

1. Go to **Voice and WebRTC** → **Numbers**
2. Click on your number (`+12039008770`)
3. Look for **Voice Settings** or **Call Configuration**
4. There might be an option to configure how calls from this number work

### Option C: It Might Be Called Something Different

Look for these terms in your Infobip portal:

- "Calls Configuration"
- "Call Setup"
- "WebRTC Configuration"
- "Voice Configuration"
- "Platform Configuration"

---

## Alternative: Check If Simple Setup Works

Some Infobip accounts might work with just the Application ID. Try this:

### Update Database with Just Application ID:

```sql
UPDATE infobip_config
SET
  application_id = 'your_application_id',
  calls_configuration_id = NULL  -- or keep it empty
WHERE company_id = your_company_id;
```

Then test again. If it still fails with same error, you definitely need the Calls Configuration ID.

---

## How to Know If You Did It Right

### Expected Console Output:

```
📋 [Infobip Token] Configuration: {
  applicationId: "1a2b3c4d-5678-90ab-cdef-1234567890ab",
  callsConfigurationId: "9z8y7x6w-5432-10vu-tsrq-0987654321zy",
  identity: "+12039008770"
}
```

### SDK Should Send:

```json
"applicationId": "1a2b3c4d-5678-90ab-cdef-1234567890ab",
"callsConfigurationId": "9z8y7x6w-5432-10vu-tsrq-0987654321zy"
```

**NOT**:

```json
"applicationId": "WEBRTC",
"callsConfigurationId": "WEBRTC"
```

---

## Troubleshooting

### Still Getting SERVICE_UNAVAILABLE After Setup?

1. **Double-check IDs are correct** in database
2. **Verify phone number** format: `+12039008770`
3. **Check account balance** - need credits for phone calls
4. **Verify number ownership** - must own the "from" number in Infobip

### Can't Find Calls Configuration in Portal?

**Most likely reason**: Your account type doesn't have full Voice/WebRTC access yet.

**Solution**: Contact Infobip support to enable it.

### IDs Look Correct But Still Failing?

The Calls Configuration might not be properly linked to your Application:

1. Go back to your Calls Configuration in portal
2. Check if there's an "Associated Application" or "Linked Application" field
3. Make sure it's linked to your Application ID

---

## Summary

**The Issue**: SDK using placeholder values `"WEBRTC"` instead of real configuration IDs

**The Fix**:

1. ✅ Create Application in Infobip portal → Get Application ID
2. ✅ Create Calls Configuration → Get Calls Configuration ID
3. ✅ Update database with both IDs
4. ✅ Restart app and test

**If you can't find Calls Configuration**: Contact Infobip support - your account might need additional setup.

---

## Next Step

After updating the database, restart your app and check the console. You should see the actual IDs (not "WEBRTC") being logged, and calls should work!
