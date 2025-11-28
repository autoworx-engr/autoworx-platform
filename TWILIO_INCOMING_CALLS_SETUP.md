# Twilio Incoming Call Setup Guide

## Overview

Your app now supports receiving incoming calls through Twilio Voice SDK. This guide explains how to configure Twilio to route incoming calls to your application.

## What Was Implemented

### 1. Backend Changes

- **Token Route** (`/api/twilio/token`): Updated to enable incoming calls by setting `incomingAllow: true`
- **Incoming Call Webhook** (`/api/twilio/incoming`): New route that handles incoming calls from Twilio and routes them to the browser device
- **Database Integration**: Automatically creates ClientCall records for incoming calls with direction set to "inbound"

### 2. Frontend Changes

- **SendCall Component**: Updated to listen for incoming calls on the Twilio device
- **IncomingCallAlert Component**: New component that displays an incoming call modal with accept/reject buttons
- **Call Event Handling**: Proper handling of incoming call lifecycle (accept, reject, disconnect)

## Twilio Configuration Required

### Step 1: Configure Your TwiML App

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to **Voice > TwiML > TwiML Apps**
3. Find your TwiML App (the one whose SID is stored in your database as `twimlAppSid`)
4. Set the **Voice Request URL** to:
   ```
   https://your-domain.com/api/twilio/incoming
   ```
5. Set the HTTP method to **POST**
6. Save the configuration

### Step 2: Configure Your Twilio Phone Number

1. In Twilio Console, go to **Phone Numbers > Manage > Active Numbers**
2. Click on your Twilio phone number
3. Under **Voice Configuration**, set:
   - **Configure with**: TwiML App
   - **TwiML App**: Select your TwiML App from the dropdown
4. Save the configuration

### Alternative Configuration (Direct Webhook)

If you prefer not to use a TwiML App, you can configure the phone number directly:

1. Under **Voice Configuration**, set:
   - **Configure with**: Webhook
   - **A call comes in**: `https://your-domain.com/api/twilio/incoming` (POST)
2. Save the configuration

## How It Works

### Call Flow

1. **External caller dials your Twilio number**
2. **Twilio sends webhook** to `/api/twilio/incoming` with caller information
3. **Backend processes the call**:
   - Identifies the Twilio credentials
   - Finds or creates a Client record for the caller
   - Creates a ClientCall record in the database
   - Returns TwiML to route the call to the browser device
4. **Browser receives incoming call event**
5. **User sees IncomingCallAlert modal** with caller number
6. **User accepts or rejects the call**
7. **If accepted**: Call connects and starts recording
8. **Recording is saved** via the existing recording webhook

### Database Record

Each incoming call creates a ClientCall record with:

- `direction`: "inbound"
- `sentBy`: "Client"
- `from`: Caller's phone number
- `to`: Your Twilio number
- `status`: "ringing" → updated to "completed" or "failed"
- `recordingUrl`: Populated when call ends (if recorded)

## Testing

### Prerequisites

1. Make sure you've clicked "Setup Device" in your app
2. Ensure microphone permissions are granted in your browser
3. Keep the browser tab active (some browsers restrict WebRTC in background tabs)

### Test Steps

1. From an external phone, call your Twilio number
2. You should see the IncomingCallAlert modal appear in your browser
3. Click "Accept" to answer the call
4. Speak and verify two-way audio works
5. Click "End Call" to hang up
6. Check the database to verify the ClientCall record was created

## Troubleshooting

### Call Not Arriving

- Verify the TwiML App or phone number webhook is correctly configured
- Check Twilio Console > Monitor > Logs > Errors for webhook failures
- Ensure your app URL is publicly accessible (use ngrok for local testing)

### Can't Hear Audio

- Check browser microphone permissions
- Ensure you're using HTTPS (WebRTC requires secure context)
- Try accepting the call again

### Database Errors

- Verify the ClientCall model has the `direction` field
- Check that companyId matches your Twilio credentials
- Ensure the Client model allows creating records with minimal data

## Security Notes

- The incoming webhook endpoint creates "Unknown Caller" clients for unrecognized numbers
- Consider adding authentication to the webhook if needed
- Recording URLs are stored for later retrieval
- All calls are automatically recorded from answer time

## Next Steps

- Add caller identification display (show client name if known)
- Implement call history UI to show incoming calls
- Add notifications for missed calls
- Implement call transfer functionality
- Add voicemail for unanswered calls
