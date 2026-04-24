# Meta (Instagram + Facebook) Messaging Integration

Allows shop staff to send and receive **Instagram Direct Messages** and **Facebook Messenger** messages directly inside the AutoWorx Client Communication Hub, alongside the existing SMS and Email channels.

---

## Table of contents

1. [Feature overview](#feature-overview)
2. [Architecture & data flow](#architecture--data-flow)
3. [Database models](#database-models)
4. [File map](#file-map)
5. [Setup guide](#setup-guide)
6. [Testing locally](#testing-locally)
7. [Deploying to production](#deploying-to-production)
8. [Troubleshooting](#troubleshooting)
9. [Known limitations](#known-limitations)
10. [Future improvements](#future-improvements)

---

## Feature overview

Once a Facebook Page (and optionally its linked Instagram Business Account) is connected:

- Incoming messages from both Instagram DMs and Facebook Messenger appear in the client's conversation view in real-time
- Staff can reply from either channel using the platform toggle in the message composer
- If a message arrives from an unknown sender, AutoWorx automatically creates a `Client` record using the sender's Meta profile name
- The unread badge, conversation preview, and notification system all reflect Meta messages alongside SMS and email

---

## Architecture & data flow

```
┌─────────────────────────────────────────────────────────────────┐
│  CONNECT                                                        │
│                                                                 │
│  1. Staff clicks "Connect with Meta" in Settings               │
│     → initiateMetaConnect() builds OAuth URL with companyId    │
│       encoded in `state`, redirects to Facebook dialog         │
│                                                                 │
│  2. User approves → Facebook redirects to:                     │
│     GET /api/meta/callback?code=…&state=…                      │
│     → Exchange code → short-lived token (1h)                   │
│     → Exchange short-lived → long-lived token (60d)            │
│     → GET /me → metaUserId                                     │
│     → GET /me/accounts → list of managed Pages + page tokens   │
│     → For each page: GET /{pageId}?fields=instagram_business…  │
│     → Encrypt full payload → redirect /meta-select?data=…     │
│                                                                 │
│  3. Staff selects one Page at /meta-select                     │
│     → connectMetaPage() server action:                         │
│       → POST /{pageId}/subscribed_apps (webhook subscription)  │
│       → Deactivate previous MetaCredentials for company        │
│       → Upsert MetaCredentials with AES-256-GCM encrypted      │
│         page access token                                      │
│       → redirect → settings?meta=connected                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  INCOMING MESSAGE                                               │
│                                                                 │
│  Meta → POST /api/meta/webhook                                 │
│    │  Verify X-Hub-Signature-256 HMAC                          │
│    │  Parse body.object → "instagram" | "page" (FB)            │
│    │  Find MetaCredentials by pageId                           │
│    │  Find/create Client by metaSenderId                       │
│    │    └─ if new: fetch Meta profile → create Client record   │
│    │  Create ClientMetaMessage + ClientMetaAttachments         │
│    │  updateMetaChatTrack (metaIsRead=false, count++)          │
│    │                                                           │
│    ├─ pusher.trigger("meta-{companyId}-{clientId}", "meta", …) │
│    │    └─ MetaContainer prepends to TanStack Query cache      │
│    │                                                           │
│    ├─ sendClientMailOrSMSNotify → Pusher "client-notify-…"    │
│    │    └─ ChatHead badge + ClientItem preview update         │
│    │                                                           │
│    └─ pusher.trigger("message-{clientId}", "client", …)       │
│         └─ Fallback invalidate query                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  OUTGOING MESSAGE                                               │
│                                                                 │
│  Staff types in SendMeta → handleSend()                        │
│    → useMetaSendMutation (optimistic cache prepend)            │
│    → Upload files to /api/upload (if any)                     │
│    → sendMetaMessage server action:                           │
│        → Decrypt pageAccessToken                              │
│        → POST /me/messages (text + each attachment)           │
│        → Create ClientMetaMessage + ClientMetaAttachments      │
│        → updateMetaChatTrackOutgoing                          │
│          (metaIsRead=true, no unread count increment)         │
│        → pusher.trigger("meta-{companyId}-{clientId}", "meta") │
│    → onSettled: invalidate query to sync with DB              │
└─────────────────────────────────────────────────────────────────┘
```

### Pusher channels

| Channel                                | Event             | Direction       | Purpose                                           |
| -------------------------------------- | ----------------- | --------------- | ------------------------------------------------- |
| `meta-{companyId}-{clientId}`          | `"meta"`          | server → client | Real-time message delivery to open conversation   |
| `message-{clientId}`                   | `"client"`        | server → client | Unread count badge update in sidebar              |
| `client-notify-{companyId}-{clientId}` | `"client-notify"` | server → client | Conversation preview + track update in `ChatHead` |

---

## Database models

### `MetaCredentials`

Stores the OAuth credentials for one Facebook Page per company.

| Field                | Type          | Description                                                          |
| -------------------- | ------------- | -------------------------------------------------------------------- |
| `companyId`          | Int           | Owning company                                                       |
| `pageId`             | String        | Facebook Page ID (from `/me/accounts`)                               |
| `pageName`           | String?       | Display name of the Page                                             |
| `pageAccessToken`    | String (Text) | **AES-256-GCM encrypted** page token; format `iv:authTag:ciphertext` |
| `instagramAccountId` | String?       | Linked Instagram Business Account ID                                 |
| `instagramUsername`  | String?       | Instagram handle (e.g. `@shopname`)                                  |
| `metaUserId`         | String        | Meta user ID of the staff member who connected                       |
| `isActive`           | Boolean       | Only `true` rows are used; disconnect sets this to `false`           |

Unique constraint: `(companyId, pageId)` — one row per page per company.

### `ClientMetaMessage`

Mirrors `ClientSmsMessage`. One row per sent or received Meta message.

| Field           | Type              | Description                                              |
| --------------- | ----------------- | -------------------------------------------------------- |
| `message`       | String (Text)     | Message text (empty string for attachment-only messages) |
| `platform`      | String            | `"INSTAGRAM"` or `"FACEBOOK"`                            |
| `metaMessageId` | String?           | Meta's own message ID (for deduplication)                |
| `metaSenderId`  | String            | Meta PSID (page-scoped user ID) of the sender            |
| `sentBy`        | `ClientSMSSentBy` | `"Client"` or `"Company"`                                |
| `isRead`        | Boolean           | Whether the message has been read                        |
| `userId`        | Int?              | AutoWorx user who sent it (Company messages only)        |
| `companyId`     | Int               | Owning company                                           |
| `clientId`      | Int               | Associated client                                        |

### `ClientMetaAttachments`

One row per attachment on a Meta message. Cascades delete when the parent message is deleted.

| Field  | Description                                                           |
| ------ | --------------------------------------------------------------------- |
| `url`  | CDN URL of the attachment                                             |
| `name` | File name (generated as `{messageId}_{timestamp}.{type}` for inbound) |
| `type` | MIME category: `"image"`, `"video"`, `"audio"`, `"file"`              |

### `ClientConversationTrack` additions

| Field              | Description                                                        |
| ------------------ | ------------------------------------------------------------------ |
| `metaLastMessage`  | Preview text for the conversation list                             |
| `metaIsRead`       | Whether there are unread Meta messages                             |
| `metaUnReadCount`  | Number of unread Meta messages                                     |
| `metaLastPlatform` | `"INSTAGRAM"` or `"FACEBOOK"` — which platform last sent a message |

### `Client` addition

| Field          | Description                                                                      |
| -------------- | -------------------------------------------------------------------------------- |
| `metaSenderId` | Meta PSID — indexed, used to match incoming webhook messages to existing clients |

---

## File map

```
src/lib/
  encryption.ts                     AES-256-GCM encrypt/decrypt for page tokens

src/actions/meta/
  connect.ts                        Builds and redirects to Facebook OAuth URL
  connectPage.ts                    Finalises the connection for a chosen page
  disconnect.ts                     Sets MetaCredentials.isActive = false
  sendMessage.ts                    Sends a message via Meta Graph API + saves to DB

src/app/api/meta/
  callback/route.ts                 OAuth callback: exchanges code, collects pages, redirects to /meta-select
  webhook/route.ts                  Receives incoming messages from Meta (GET verify + POST handler)

src/app/(dashboard)/dashboard/communication/client/
  _actions/
    getMetaMessages.ts              Paginated fetch of ClientMetaMessage rows
    getMetaCredentials.ts           Returns active MetaCredentials (safe subset, no token)
    readMetaMessages.ts             Marks all Meta messages as read
  _hooks/
    useInfinityMetaQuery.ts         TanStack infinite-scroll query hook for messages
    useMetaSendMutation.ts          TanStack mutation with optimistic update for sending
  _utils/queryKey.ts                (modified) metaQueryKey added
  _component/conversations/meta/
    Meta.tsx                        Server Component guard: checks credentials → renders container
    MetaContainer.tsx               Pusher subscriptions, read-on-mount, passes to MetaBox + SendMeta
    MetaBox.tsx                     Infinite-scroll message list with date chips and jump-to-latest
    MetaMessage.tsx                 Single message bubble with IG/FB platform badge
    SendMeta.tsx                    Message composer with IG/FB platform toggle
  _component/conversations/
    ChatHead.tsx                    (modified) Meta tab with Messenger icon + IG/FB popover
    ConversationsBox.tsx            (modified) INSTAGRAM / FACEBOOK switch cases
  _component/
    ClientItem.tsx                  (modified) Meta preview row and unread badge

src/app/(dashboard)/dashboard/settings/communications/
  MetaIntegrationCard.tsx           Connected/disconnected card in Settings
  MetaConnectedToast.tsx            Reads ?meta=connected and shows toast
  meta-select/
    page.tsx                        Server Component: decrypts payload, renders selection UI
    PageSelectForm.tsx              Client form: page cards, checkmark, submit to connectMetaPage
  page.tsx                          (modified) Fetches MetaCredentials, renders card + toast

src/constants/public-route.ts       (modified) /api/meta/callback and /api/meta/webhook added

prisma/schema.prisma                (modified) MetaCredentials, ClientMetaMessage,
                                    ClientMetaAttachments models; Client.metaSenderId (indexed);
                                    ClientConversationTrack meta fields; Company + User relations
prisma/migrations/
  20260417000000_add_meta_integration.sql   Raw SQL migration
```

---

## Setup guide

### 1. Create a Meta Developer App

1. Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps** → **Create App**
2. Choose **Business** as the app type
3. Add the **Messenger** product and the **Instagram** product to your app
4. Under **Messenger → Settings**: add your Facebook Page(s) and generate/subscribe

### 2. Configure OAuth

In **Facebook Login → Settings**:

- Add `{YOUR_DOMAIN}/api/meta/callback` to **Valid OAuth Redirect URIs**
- Enable **Client OAuth Login** and **Web OAuth Login**

### 3. Configure Webhooks

In **Webhooks** (or via each product's Webhooks tab):

- **Callback URL**: `https://your-domain.com/api/meta/webhook`
- **Verify Token**: the value of `META_WEBHOOK_VERIFY_TOKEN` in your `.env`
- Subscribe to the **`page`** object with fields: `messages`, `messaging_postbacks`
- Subscribe to the **`instagram`** object with fields: `messages`, `messaging_postbacks`

> Note: the page-level subscription (`POST /{pageId}/subscribed_apps`) is done automatically by `connectMetaPage` when a page is connected. The app-level subscription above is a **separate step** in the Meta dashboard.

### 4. Environment variables

```bash
META_APP_ID=                    # App ID from Meta dashboard (App Settings → Basic)
META_APP_SECRET=                # App Secret from Meta dashboard (App Settings → Basic)
META_OAUTH_REDIRECT_URI=        # Must exactly match what's in Valid OAuth Redirect URIs
META_WEBHOOK_VERIFY_TOKEN=      # Any random string; set the same in the Meta webhook config
META_TOKEN_ENCRYPTION_KEY=      # 64-char hex string — generate: openssl rand -hex 32
```

### 5. Apply the database migration

```bash
npx prisma db execute --file prisma/migrations/20260417000000_add_meta_integration.sql
npx prisma generate
```

---

## Testing locally

Meta webhooks require a publicly accessible HTTPS URL. Use ngrok (or a similar tunnel):

```bash
# Start the dev server
yarn dev

# In a second terminal, expose it (replace 3000 with your port)
ngrok http 3000
```

1. Copy the ngrok HTTPS URL (e.g. `https://abc123.ngrok.io`)
2. Set `META_OAUTH_REDIRECT_URI=https://abc123.ngrok.io/api/meta/callback` in `.env`
3. Update the **Valid OAuth Redirect URI** in the Meta app dashboard to match
4. Update the **Webhook Callback URL** to `https://abc123.ngrok.io/api/meta/webhook`
5. Click **Verify and Save** in the webhook config — this calls `GET /api/meta/webhook` and must echo back the challenge
6. Go to `http://localhost:3000/dashboard/settings/communications` and click **Connect with Meta**

**Testing messages:**

- Send a DM to your Facebook Page on Messenger (use the Page's inbox or a test account)
- Send a DM to the linked Instagram account from a non-Page account
- Messages should appear in the client conversation in real-time

**Checking webhook delivery:**
Meta's dashboard shows webhook delivery logs under your app's webhook configuration. Look for green checkmarks or error codes. You can also run the diagnostic script:

```bash
node scripts/check-meta-webhook.mjs
```

---

## Deploying to production

1. **Update `META_OAUTH_REDIRECT_URI`** to your production domain:
   `https://app.autoworx.tech/api/meta/callback`

2. **Update the Meta app dashboard**:
   - Add the production URL to Valid OAuth Redirect URIs
   - Update the Webhook Callback URL to the production URL
   - Re-verify the webhook

3. **Request Advanced Access** for the permissions your app uses (required for non-test users):
   - `pages_messaging`
   - `instagram_manage_messages`
   - `instagram_basic`

4. **Rotate `META_TOKEN_ENCRYPTION_KEY`** from the development value to a new production secret. Existing tokens stored with the old key will need to be re-connected.

5. **Run the migration** on the production database:
   ```bash
   npx prisma db execute --file prisma/migrations/20260417000000_add_meta_integration.sql --schema prisma/schema.prisma
   ```

---

## Troubleshooting

### `?meta=error` after OAuth

Check the server logs for `[meta/callback]` prefixed lines. Common causes:

| Error                                       | Cause                                                              | Fix                                                         |
| ------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------- |
| Short-lived token exchange failed           | `redirect_uri` in env doesn't exactly match the Meta app dashboard | Ensure both have the same URL including protocol and path   |
| `META_APP_ID` or `META_APP_SECRET` is wrong | Typo in env                                                        | Copy from Meta app dashboard → App Settings → Basic         |
| No Pages found                              | The Facebook user who authorized doesn't manage any Pages          | Log in with an account that manages a Page                  |
| State decoding error                        | `state` param was modified in transit                              | Usually a browser extension stripping params; try incognito |

### Webhook not receiving messages

1. **App-level subscription missing**: in the Meta dashboard, confirm the `page` and `instagram` objects are subscribed
2. **Page-level subscription missing**: run `node scripts/check-meta-webhook.mjs` — look for `subscribed_fields` including `messages`
3. **Signature verification failing** (HTTP 403 response): check `META_APP_SECRET` matches the secret in your Meta app
4. **App in Development Mode**: messages only arrive from test users/pages added in the dashboard; submit the app for review to reach real users
5. **Tunnel not running**: if testing locally, ensure ngrok is running and the URL hasn't changed (ngrok URLs change on restart unless you have a paid plan)

### `META_TOKEN_ENCRYPTION_KEY` errors

```
Error: META_TOKEN_ENCRYPTION_KEY must be a 64-char hex string
```

Generate a valid key:

```bash
openssl rand -hex 32
```

If you rotate the key, all existing `MetaCredentials` rows have tokens encrypted with the old key and will fail to decrypt. Staff will need to reconnect their Pages.

### Token expiry

Long-lived page tokens derived from a long-lived user token do not expire as long as the Page remains connected. If staff revoke the app permission from Facebook, the token becomes invalid and the next outgoing message will fail. The `disconnectMeta` action should be called and the Page reconnected.

---

## Known limitations

- **Development Mode restriction**: while the Meta app is in Development Mode, only Facebook users listed as app testers/developers can send messages that arrive via the webhook. Submit for App Review to lift this for production.
- **Instagram requires Advanced Access**: `instagram_manage_messages` requires Advanced Access approval from Meta. Until approved, only test users can exchange DMs in testing.
- **One Page per company**: the current implementation supports one active Facebook Page (and its linked Instagram account) per company. Switching pages deactivates the previous connection.
- **No token auto-refresh**: long-lived tokens are valid for ~60 days but can be renewed. There is currently no cron job to auto-renew expiring tokens.
- **Attachment display**: inbound attachments render as clickable file links (no inline preview). Outgoing attachments are uploaded to S3 and sent as URLs.
- **Read receipts and typing indicators**: Meta supports webhook events for delivery and read receipts (`message_deliveries`, `message_reads`) but these are not currently handled.
- **Group/story mentions**: only direct messages are supported. Story mention events are not subscribed.

---

## Future improvements

- **Token auto-renewal**: add a cron job that calls `GET /oauth/access_token?grant_type=fb_exchange_token` for tokens expiring within 7 days
- **Inline attachment previews**: render image/video attachments directly in the message bubble instead of as links
- **Read receipts**: subscribe to `message_reads` webhook events and mark `isRead` on `ClientMetaMessage` rows
- **Typing indicators**: subscribe to `messaging_typing` and show a typing indicator in the UI
- **Multi-page support**: allow a company to connect multiple Pages and route messages to the correct one based on which Page the client messaged
- **Story mention handling**: subscribe to and display story mentions as a new message type
- **Message reaction support**: Meta supports emoji reactions on messages — surfacing these in the UI
- **Handover protocol**: allow AutoWorx to participate in Meta's handover protocol alongside other inbox tools

---

## Merge Notes for Dev Team

### Branch: taiseer/meta-integration (base: development)

**Conflict risk: Low–Medium**

Most changes are new files (no conflict possible). The files that touch shared infrastructure are limited and well-scoped.

**New files (safe — no conflict possible):**

- All files under `src/app/api/meta/` (webhook, callback, OAuth routes)
- All files under `src/actions/meta/` (connect, disconnect, connectPage, sendMessage)
- All files under `src/app/(dashboard)/dashboard/settings/communications/meta-select/`
- All files under `src/app/(dashboard)/dashboard/communication/client/_component/conversations/meta/`
- All files under `src/app/(dashboard)/dashboard/communication/client/_actions/` (meta-specific)
- All files under `src/app/(dashboard)/dashboard/communication/client/_hooks/` (meta-specific)
- `src/lib/encryption.ts`, `README-META.md`, `CLAUDE.md` additions

**Modified files to review:**

- `src/app/(dashboard)/dashboard/settings/communications/page.tsx` — adds MetaIntegrationCard and DB query; check for conflicts if anyone else modified the settings page.
- `src/app/(dashboard)/dashboard/communication/client/_component/ClientItem.tsx` — adds Meta unread indicator and message preview; high conflict risk if the communication hub UI was touched on development.
- `src/app/(dashboard)/dashboard/communication/client/_component/conversations/ChatHead.tsx` — adds Meta tab button; medium risk.
- `prisma/schema.prisma` — adds `MetaCredentials`, `ClientMetaMessage`, `ClientMetaAttachments` models and new fields on `Client` and `ClientConversationTrack`; always review schema diffs carefully.
- `src/constants/public-route.ts` — adds `/api/meta/webhook` to PUBLIC_API_ROUTES.
- `src/middleware.ts` (if modified) — verify JWT bypass for webhook route is correct.

**Dependencies:** No dependency on other open PRs. Can be merged independently.

**Post-merge steps:**

1. Run `npx prisma migrate deploy` (or apply the SQL migration manually)
2. Run `npx prisma generate` to regenerate the Prisma client with new models
3. Set required environment variables: `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`, `ENCRYPTION_KEY`
4. Configure the Meta webhook URL in the Meta Developer dashboard (`/api/meta/webhook`)
5. Subscribe to `page` and `instagram` webhook objects in the Meta app settings

**Known schema migration note:** The `ClientConversationTrack` model has new fields (`metaIsRead`, `metaUnReadCount`, `metaLastMessage`, `metaLastPlatform`). If development has new migrations that also touch `ClientConversationTrack`, resolve conflicts in the migration file carefully.
