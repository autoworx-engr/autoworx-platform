# Call status — required DB changes

Hand-off notes for whoever applies schema changes. These back the stale-call
and missed-call fixes in `src/app/api/twilio/call-status` and `call-state`.

## New columns

Already declared in `prisma/schema.prisma`, so they come across with the normal
schema sync. Listed here only so the reviewer knows what to expect:

| Table                     | Column            | Type           | Notes                                                                                    |
| ------------------------- | ----------------- | -------------- | ---------------------------------------------------------------------------------------- |
| `ClientConversationTrack` | `call_status`     | `TEXT`         | Live call state, so the client list can tell a ringing call from a finished one          |
| `ClientConversationTrack` | `call_updated_at` | `TIMESTAMP(3)` | When `call_status` was last written; a stale timestamp means the call is not really live |
| `ClientSMS`               | `message_type`    | `TEXT`         | Defaults to `'SMS'`; `'MISSED_CALL'` marks the divider row in the SMS thread             |

Until these exist, `updateCallChatTrack` and the missed-call thread marker fail
silently — both are wrapped in try/catch so call handling never breaks, which
means the symptom is "the feature quietly does nothing", not an error.

## One-off backfill

**Not** covered by a schema sync — this has to be run once, by hand.

Calls whose final Twilio callback never arrived are still sitting at `ringing`
or `in-progress` and render as live calls forever (the original bug: a call from
July still showing "Ringing…" in August). The code now treats anything older
than ten minutes as missed at render time, so the UI is already correct — this
just settles the stored rows to match.

```sql
UPDATE "ClientCall"
SET "status" = 'no-answer'
WHERE "status" IN ('ringing', 'in-progress')
  AND "created_at" < NOW() - INTERVAL '1 hour';
```

Safe to re-run; it only ever touches rows that are still unsettled. Check the
blast radius first with the same `WHERE` clause as a `SELECT count(*)`.
