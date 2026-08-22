# Pusher Implementation Documentation

This document outlines the implementation details of Pusher in the project, including configuration, helper utilities, and a reference for all channels and events used for real-time functionality.

## 1. Overview & Configuration

The project uses [Pusher](https://pusher.com/) for real-time features such as notifications, chat messaging, call state management, and updates for SMS/Email communication.

### Environment Variables

The following environment variables are required in `.env`:

- `PUSHER_ID`
- `PUSHER_KEY`
- `PUSHER_SECRET`
- `PUSHER_CLUSTER`
- `NEXT_PUBLIC_PUSHER_KEY`
- `NEXT_PUBLIC_PUSHER_CLUSTER`

### Instances

Two separate instances are initialized for client-side and server-side usage.

- **Server-Side Instance**:
  - Located in: [`src/lib/pusher/server.ts`](src/lib/pusher/server.ts)
  - Usage: `import { getPusherInstance } from "@/lib/pusher/server";`
  - Used for triggering events from API routes and server actions.

- **Client-Side Instance**:
  - Located in: [`src/lib/pusher/client.ts`](src/lib/pusher/client.ts)
  - Usage: `import { pusher } from "@/lib/pusher/client";`
  - Used for subscribing to channels and binding to events in React components using `useEffect`.

## 2. Helper Utilities

Several helper files in [`src/lib/pusher`](src/lib/pusher) abstract common Pusher triggers:

- **[`receiveTwiloMessage.ts`](src/lib/pusher/receiveTwiloMessage.ts)**:
  - Updates the client interface when a new SMS is received via Twilio.
  - Channel: `sms-{companyId}-{clientId}`

- **[`receiveMail-pusher.ts`](src/lib/pusher/receiveMail-pusher.ts)**:
  - Updates the client interface when a new email is received via Mailgun.
  - Channel: `mail-{companyId}-{clientId}`

- **[`client-conversation-notify.ts`](src/lib/pusher/client-conversation-notify.ts)**:
  - Notifies valid listeners about updates in client conversations (e.g., new messages, status changes).
  - Channels: `client-notify-{companyId}-{clientId}` and `client-notify-{companyId}`

## 3. Channels & Events Reference

### A. General Notifications

Handles general user notifications (e.g., system alerts, updates).

| Channel         | Event          | Payload               | Trigger Location                               | Subscriber Location                       |
| --------------- | -------------- | --------------------- | ---------------------------------------------- | ----------------------------------------- |
| `noti-{userId}` | `notification` | `Notification` Object | `src/actions/notification/sendNotification.ts` | `src/components/NotificationProvider.tsx` |

### B. Internal Communication (Chat)

Handles direct messaging, group chats, and chat tracking (unread counts, last message updates).

| Channel           | Event             | Payload                         | Description                                                                                                                     |
| ----------------- | ----------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `track-{userId}`  | `chat-track`      | `userChatTrack` Object          | Updates the chat list sidebar with the latest message snippet and timestamp.                                                    |
| `track-{userId}`  | `chat-track-read` | `{ senderId, userId, section }` | Marks a conversation as read in real-time.                                                                                      |
| `user-{senderId}` | `message`         | Message Data + Attachments      | **Direct Messages**: The receiver subscribes to the _sender's_ channel to listen for incoming messages from that specific user. |
| `group-{groupId}` | `message`         | Message Data                    | **Group Messages**: All group members subscribe to the group channel.                                                           |

**Group Management Events:**
| Channel | Event | Payload | Trigger Location |
|---|---|---|---|
| `create-group` | `create` | Group Data | `src/actions/communication/internal/creategroup.ts` |
| `delete-group` | `delete` | `{ id: groupId }` | `src/actions/communication/internal/deleteUserFromGroup.ts` |
| `add-member-in-group` | `add-member` | `{ group: groupData }` | `src/actions/communication/internal/addUserInGroup.ts` |

### C. Client Communication (External)

Handles real-time updates for communication with external clients (SMS, Email).

| Channel                                | Event           | Payload                   | Purpose                                                                      |
| -------------------------------------- | --------------- | ------------------------- | ---------------------------------------------------------------------------- |
| `sms-{companyId}-{clientId}`           | `sms`           | `ClientSMS` Object        | Real-time update in the `SmsContainer` component when a client sends an SMS. |
| `mail-{companyId}-{clientId}`          | `mail`          | `MailgunEmail` Object     | Real-time update in `MailgunMessageBox` when an email arrives.               |
| `client-notify-{companyId}`            | `client-notify` | `ClientConversationTrack` | Updates the main list of client conversations (e.g., sidebars).              |
| `client-notify-{companyId}-{clientId}` | `client-notify` | `ClientConversationTrack` | Updates specific client conversation headers or active views.                |

### D. Voice / Call Implementation

Handles real-time call state synchronization across multiple devices in a company (e.g., dismissing a ringing modal if answered elsewhere).

| Channel               | Event           | Payload                                    | Trigger Location                                 |
| --------------------- | --------------- | ------------------------------------------ | ------------------------------------------------ |
| `company-{companyId}` | `call-accepted` | `{ callSid, action, deviceId, timestamp }` | Triggered when a call is answered on any device. |
| `company-{companyId}` | `call-rejected` | `{ callSid, action, deviceId, timestamp }` | Triggered when a call is rejected.               |
| `company-{companyId}` | `call-ended`    | `{ callSid, action, deviceId, timestamp }` | Triggered when a call ends.                      |

**Subscriber**: [`src/context/VoiceDeviceContext.tsx`](src/context/VoiceDeviceContext.tsx) listens to these events to manage the UI state of the dialer.

### E. Pipeline / Lead Communication

Handles real-time updates for unread messages count on lead cards or pipeline view.

| Channel              | Event    | Payload                      | Trigger Location                                       | Subscriber Location                                                        |
| -------------------- | -------- | ---------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------- |
| `message-{clientId}` | `client` | `{ count, updatedColumnId }` | `src/app/api/twilio/sms-receive/[companyIds]/route.ts` | `src/app/(dashboard)/dashboard/pipeline/components/CommunicationsNoti.tsx` |

### F. Collaboration (Inter-Company Communication)

Handles real-time messaging between **companies** that have established collaboration relationships. This is a company-to-company model distinct from the user-to-user internal chat.

> **Note:** This section was reworked. Messages are now sent via a dedicated
> `/api/pusher/collaboration` route and scoped to company-level channels
> (`company-{id}`), using the `CollaborationMessage` / `CompanyChatTrack` DB
> models instead of the shared `Message` / `ChatTrack` models.

#### F.1 — Real-Time Message Delivery

Messages are broadcast to both the **sender's** and **receiver's** company channels so both parties see the update instantly.

| Channel                   | Event     | Payload                                                                                                                         | Description                                                                                                 |
| ------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `company-{fromCompanyId}` | `message` | `{ fromCompanyId, toCompanyId, senderUserId, message, attachment, requestEstimate, senderUser, createdAt, isOwnMessage: true }` | Delivered to the **sender's** company. `isOwnMessage: true` is used for right-aligning bubbles in the UI.   |
| `company-{toCompanyId}`   | `message` | Same shape as above but `isOwnMessage: false`                                                                                   | Delivered to the **receiver's** company. `isOwnMessage: false` is used for left-aligning bubbles in the UI. |

#### F.2 — Chat Track (Sidebar / Last-Message Updates)

After a message is sent, both companies' sidebar lists are updated with the latest message snippet.

| Channel                         | Event        | Payload                                                                                     | Description                                                           |
| ------------------------------- | ------------ | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `company-track-{fromCompanyId}` | `chat-track` | `CompanyChatTrack` object (`senderCompanyId`, `receiverCompanyId`, `lastMessage`, `isRead`) | Updates the collaboration list sidebar for the **sending** company.   |
| `company-track-{toCompanyId}`   | `chat-track` | Same `CompanyChatTrack` object                                                              | Updates the collaboration list sidebar for the **receiving** company. |

#### F.3 — Key Implementation Details

| Concern                  | Detail                                                                                                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **DB Models**            | `CollaborationMessage` (messages), `CompanyChatTrack` (last-message tracking), both store `fromCompanyId` + `toCompanyId` instead of user IDs.                                                                                 |
| **Trigger Route**        | [`src/app/api/pusher/collaboration/route.ts`](src/app/api/pusher/collaboration/route.ts) — dedicated `POST` endpoint; validates company IDs and saves to `CollaborationMessage`.                                               |
| **Subscriber**           | [`src/app/(dashboard)/dashboard/communication/CompanyMessageBox.tsx`](<src/app/(dashboard)/dashboard/communication/CompanyMessageBox.tsx>) — subscribes to `company-{currentCompanyId}`, binds `message`, updates local state. |
| **Message Fetch**        | On mount, `CompanyMessageBox` fetches history from `/api/communication/collaboration/messages/v2-messages?companyA=&companyB=&viewerCompanyId=`.                                                                               |
| **Notification**         | On send, `sendCollaborationMessageNotification({ companyId: toCompanyId })` is called to push an in-app notification to the receiver company.                                                                                  |
| **Estimate Attachments** | An estimate/invoice can be attached via `InvoiceEstimateModal`, which sends `requestEstimateId` in the body; the receiver sees an inline "Requested an Estimate" card.                                                         |
| **Attachment Upload**    | Files are uploaded to `/api/upload` first, then their URLs are passed as `attachmentFiles[]` in the collaboration push request.                                                                                                |

#### F.4 — Flow Diagram

```
Client (CompanyMessageBox)
  → POST /api/pusher/collaboration
      → db.collaborationMessage.create()
      → db.companyChatTrack.upsert()
      → pusher.trigger("company-{from}", "message", payloadFrom)
      → pusher.trigger("company-{to}",   "message", payloadTo)
      → pusher.trigger("company-track-{from}", "chat-track", chatTrack)
      → pusher.trigger("company-track-{to}",   "chat-track", chatTrack)
      → sendCollaborationMessageNotification({ companyId: to })

CompanyMessageBox (receiver's browser)
  ← pusher.subscribe("company-{myCompanyId}").bind("message") → setMessages(...)
```

## 4. Key Files

- **Triggers (Server-Side)**:
  - [`src/app/api/pusher/route.ts`](src/app/api/pusher/route.ts) (Internal / user-to-user chat dispatcher)
  - [`src/app/api/pusher/collaboration/route.ts`](src/app/api/pusher/collaboration/route.ts) (Company-to-company collaboration dispatcher)
  - [`src/app/api/twilio/call-state/route.ts`](src/app/api/twilio/call-state/route.ts) (Call state)
  - [`src/actions/notification/sendNotification.ts`](src/actions/notification/sendNotification.ts)

- **Subscribers (Client-Side)**:
  - [`src/components/NotificationProvider.tsx`](src/components/NotificationProvider.tsx)
  - [`src/context/VoiceDeviceContext.tsx`](src/context/VoiceDeviceContext.tsx)
  - [`src/components/SideNavbar.tsx`](src/components/SideNavbar.tsx)
  - [`src/app/(dashboard)/dashboard/communication/internal/UserMessageBox.tsx`](<src/app/(dashboard)/dashboard/communication/internal/UserMessageBox.tsx>)
  - [`src/app/(dashboard)/dashboard/communication/CompanyMessageBox.tsx`](<src/app/(dashboard)/dashboard/communication/CompanyMessageBox.tsx>) (Collaboration)
