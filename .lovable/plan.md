

## Goal

Build a server-pushed notification system so you can send notifications to all users, or target by platform (iPhone / Android / Web). Users see them in their existing Notifications page, persisted across sessions.

## How it works

1. You insert a row into a new `push_notifications` table (via Cloud table UI or a future admin panel)
2. Each row has a `target_platform` field: `'all'`, `'iphone'`, `'android'`, or `'web'`
3. The app polls for new notifications every 60 seconds (or on app focus) and shows them in the notification feed
4. Users can dismiss/read them — tracked per-device in localStorage

## Database changes

**New table: `push_notifications`**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | auto-generated |
| `type` | text | `'info'`, `'price_alert'`, `'transaction'`, `'security'` |
| `title` | text | notification title |
| `message` | text | notification body |
| `icon` | text (nullable) | emoji or icon identifier |
| `target_platform` | text | `'all'`, `'iphone'`, `'android'`, `'web'` |
| `is_active` | boolean | default true (set false to hide) |
| `expires_at` | timestamptz (nullable) | auto-hide after this time |
| `created_at` | timestamptz | default now() |

RLS: public SELECT (read-only, same pattern as `config`). No INSERT/UPDATE/DELETE from client.

**Add `platform` column to `wallet_users`**

```sql
ALTER TABLE wallet_users ADD COLUMN platform text DEFAULT 'web';
```

So you can see which platform each user registered from.

## Edge function changes

**`register-user`** — accept and store `platform` field from the client (uses `usePlatform()` value).

## Frontend changes

**1. Update `register-user` calls** (WalletOnboarding + AccountSwitcherSheet)
- Send `platform: usePlatform()` in the `device_info` body, and as a top-level field.

**2. New hook: `src/hooks/useServerNotifications.ts`**
- On mount + every 60s + on window focus: fetch from `push_notifications` where `target_platform IN ('all', currentPlatform)` AND `is_active = true` AND (`expires_at IS NULL OR expires_at > now()`)
- Track dismissed IDs in localStorage (`timetrade_dismissed_notifications`)
- Filter out already-dismissed ones
- Return array of server notifications

**3. Update `useNotifications.ts`**
- Merge server notifications from `useServerNotifications` with local (in-app) notifications
- Server notifications appear at the top, sorted by `created_at` desc
- When user deletes a server notification, its ID is added to the dismissed list

**4. No changes to NotificationsPage/NotificationCenter UI** — they already render from the notifications array.

## How you send a notification

Open Cloud -> Tables -> `push_notifications`, insert a row:

```
title: "Maintenance tonight"
message: "The app will be briefly offline at 2am UTC"
type: "info"
target_platform: "all"       -- or "iphone", "android", "web"
is_active: true
```

All matching users see it within 60 seconds.

## Files touched

- `supabase/migrations/<ts>_push_notifications.sql` (new table + platform column on wallet_users)
- `supabase/functions/register-user/index.ts` (accept platform field)
- `src/hooks/useServerNotifications.ts` (new — polling hook)
- `src/hooks/useNotifications.ts` (merge server notifications)
- `src/components/WalletOnboarding.tsx` (send platform)
- `src/components/wallet/AccountSwitcherSheet.tsx` (send platform)

