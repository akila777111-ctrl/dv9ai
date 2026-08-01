# DV9 Communications MVP

## Status

- Project: DV9 Website Platform
- Branch: `dv9-website-platform`
- Goal: add secure text chat plus browser-based audio and video calls without creating a separate product.
- Delivery model: modular monolith first; services are separated only when scaling requires it.

## Product scope

DV9 Communications is the communication layer inside the existing DV9 website.

### MVP capabilities

1. User registration and login.
2. User profile and availability status.
3. One-to-one text conversations.
4. Persistent message history.
5. Online/offline presence.
6. Typing indicator.
7. Message delivery and read state.
8. Attachments: image, document and short voice message.
9. Incoming-call screen with accept or reject.
10. Browser-to-browser audio calls.
11. Browser-to-browser video calls.
12. Microphone mute/unmute.
13. Camera on/off and camera switching on mobile.
14. Call duration, end-call control and call history.
15. Responsive interface for Android, iPhone and desktop.
16. Connection and permission error handling.
17. Audit events without storing secrets or private media.

### Not part of the first MVP

- Calls to public telephone numbers.
- SMS delivery.
- Automatic call recording.
- Hidden microphone or camera activation.
- Group conferences larger than four participants.
- End-user billing.

Calls to real telephone numbers can be added later through a SIP or telephony provider as a separate approved integration.

## Architecture

### Web application

- Next.js App Router
- React and TypeScript
- Tailwind CSS and DV9 design tokens
- Vercel deployment

### Identity, database and realtime chat

- Supabase Auth
- Supabase Postgres
- Supabase Row Level Security
- Supabase Realtime Broadcast for typing and transient events
- Supabase Realtime Presence for online status
- Supabase Storage for permitted attachments

### Audio and video

- LiveKit WebRTC transport
- LiveKit React components and client SDK
- Server-generated short-lived participant tokens
- One LiveKit room per active call
- Call authorization checked against authenticated DV9 users

### AI integration

The communication layer must later allow an approved DV9 AI participant to join a room for:

- voice assistant conversations;
- meeting notes after explicit consent;
- translation;
- document and construction consultation;
- customer support.

AI participation must be visible to all participants and controlled by a human approval action.

## Data model

### `profiles`

- `id`
- `display_name`
- `avatar_url`
- `status`
- `last_seen_at`
- `created_at`

### `conversations`

- `id`
- `type` (`direct`, later `group`)
- `created_by`
- `created_at`

### `conversation_members`

- `conversation_id`
- `user_id`
- `role`
- `joined_at`
- `last_read_message_id`

### `messages`

- `id`
- `conversation_id`
- `sender_id`
- `kind` (`text`, `image`, `file`, `voice`, `system`, `call_event`)
- `body`
- `attachment_path`
- `reply_to_id`
- `created_at`
- `edited_at`
- `deleted_at`

### `message_receipts`

- `message_id`
- `user_id`
- `delivered_at`
- `read_at`

### `call_sessions`

- `id`
- `conversation_id`
- `initiator_id`
- `livekit_room_name`
- `call_type` (`audio`, `video`)
- `status` (`ringing`, `active`, `declined`, `missed`, `ended`, `failed`)
- `started_at`
- `answered_at`
- `ended_at`
- `ended_by`

### `call_participants`

- `call_id`
- `user_id`
- `joined_at`
- `left_at`

## Security requirements

1. Never expose Supabase service-role keys or LiveKit API secrets to the browser.
2. Generate LiveKit participant tokens only on the server.
3. Use short-lived tokens bound to user identity, room and permissions.
4. Apply RLS to every user-owned table.
5. A user may read a conversation only when present in `conversation_members`.
6. A user may join a call only when authorized for its conversation.
7. Camera and microphone require an explicit browser permission and visible controls.
8. Do not record calls by default.
9. Require explicit consent from every participant before future recording or transcription.
10. Validate attachment type, size and ownership.
11. Rate-limit message sending, call creation and token generation.
12. Store audit metadata, not call media.
13. Keep `.env.example`; never commit real credentials.

## Required routes

- `/login`
- `/dashboard`
- `/messages`
- `/messages/[conversationId]`
- `/call/[callId]`
- `/settings/privacy`

## Required server endpoints

- `POST /api/conversations`
- `POST /api/messages`
- `POST /api/calls`
- `POST /api/calls/[callId]/accept`
- `POST /api/calls/[callId]/decline`
- `POST /api/calls/[callId]/end`
- `POST /api/livekit/token`

## Environment variables

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
```

## Implementation sequence

### Phase 0 — baseline

- Confirm existing branch builds.
- Preserve the current landing page and Vercel rollback path.
- Add TypeScript, lint, tests and environment validation.

### Phase 1 — web foundation

- Migrate the current Vite app to Next.js App Router inside the same repository.
- Keep the existing visual landing page functional.
- Add Supabase Auth and protected dashboard routes.

### Phase 2 — chat

- Add database migrations and RLS.
- Build conversation list and message panel.
- Add message history, optimistic sending, typing state and presence.
- Add attachment upload with validation.

### Phase 3 — calls

- Add LiveKit dependencies.
- Add server-only token endpoint.
- Add call state machine and incoming-call UI.
- Add audio call controls.
- Add video call controls.
- Add call history and missed-call events.

### Phase 4 — quality

- Test two browsers and two mobile devices.
- Test denied microphone/camera permission.
- Test reconnect after network loss.
- Test unauthorized room access.
- Add monitoring without logging message content or media.

## Definition of done for the Jobcenter demo

1. Two authenticated demo users can exchange text messages in real time.
2. Online state and typing state are visible.
3. One user can start an audio call and the second can accept it.
4. Either user can enable video, mute the microphone and disable the camera.
5. Ending the call creates a call-history event in the conversation.
6. The demo works on the deployed HTTPS site and on a Motorola browser.
7. No production secret exists in Git history or browser bundles.
8. A short README explains setup, architecture and privacy controls.

## Acceptance principle

Do not claim unsupported features as complete. The public services page may show future capabilities only when clearly labelled as planned or in development.