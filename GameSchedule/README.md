# GameSchedule

Mobile-first social gaming coordination app for streamers and gamers. This repo started as an Expo starter and is now a Supabase-backed prototype with real auth, profiles, game library, favorites, roulette, lobbies, scheduling, availability, and a first pass at a real friends/request flow.

This README is meant to preserve the working context from the build session: product direction, architecture decisions, implementation status, validation notes, limitations, and next steps.

## Current Working Context

- repository root: `C:\Users\matt6\Project\nEVER STOP`
- Expo app folder: `C:\Users\matt6\Project\nEVER STOP\GameSchedule`
- active branch during this checkpoint: `main`
- screen entry point: [`app/index.tsx`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/app/index.tsx)
- extracted home feature modules now live under [`features/home/`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/features/home)
- hosted demo: `https://mattengin.github.io/GameSchedule/`
- GitHub Pages workflow location: [`.github/workflows/deploy-pages.yml`](/c:/Users/matt6/Project/nEVER%20STOP/.github/workflows/deploy-pages.yml)

Important repo-shape lesson:

- GitHub Actions workflows must live under the repository root `.github/workflows/`
- this repo's Git root is the parent `nEVER STOP` folder, not the `GameSchedule` app folder
- the workflow builds from the `GameSchedule/` subdirectory and deploys `GameSchedule/dist`

## Product Direction

Original concept:

- manage friends and invites
- create or join game lobbies
- use game roulette to decide what to play
- sync availability
- notify across Discord or mobile

Refined direction from this session:

- keep the UI low-clutter and easy to use
- design primarily for Twitch streamers and gamers
- assume most users already have Discord
- avoid forcing users to rebuild a giant second social graph if Discord already holds those relationships

Current product conclusion:

- Discord should likely become the primary identity/discovery layer later
- the app should still keep a small app-owned relationship layer for:
  - favorite squad members
  - roulette groups
  - availability
  - invite preferences
  - lobby membership
- long-term, this should become **Discord-first**, not a standalone social network first

## Session Timeline / Decisions

This is the practical chat history condensed into a handoff:

- started from a Figma-style blueprint for onboarding, friends, games, roulette, lobbies, scheduling, notifications, and profile/settings
- agreed to use placeholder game data first and avoid external game APIs until the core app worked
- wired Supabase for auth, profiles, games, favorites, roulette pool, lobbies, availability, and friends
- added Cypress coverage as each major feature landed
- used Playwright/manual validation for real browser checks when needed
- hit Supabase hosted email rate limits during repeated signup testing, so Cypress tests mostly mock auth/backend calls
- fixed the lobby RLS infinite-recursion issue by simplifying policies for the current MVP phase
- tightened friend acceptance by moving mirrored friendship-row creation into the `accept_friend_request` RPC
- discussed IGDB/Twitch and decided future game API work should go through a backend layer, not direct Expo client calls
- shifted social strategy toward Discord-first because streamers/gamers already have Discord communities
- set up GitHub Pages public hosting with a separate demo Supabase project and repo variables
- added Discord login as an option while keeping email/password fallback
- reprioritized auth so Discord is the recommended entry path while email/password remains as fallback
- cleaned up Expo starter noise, while leaving some empty folder stubs in place
- paused new feature work to improve scheduling UX with picker-based event start/end times and cleaner recurring availability ranges
- redesigned lobby creation into a low-friction scheduler path: select game, pick event time, invite people
- added squad/community-based friend discovery so users can join or create one Discord-shaped community and get suggested friends from it
- replaced the brittle fixed availability block UI with recurring windows like `Mon 8:00 PM - 10:00 PM`
- started improvement-track cleanup work to break up the monolithic home screen into feature modules and data hooks
- moved extracted home helpers out of `app/` into `features/home/` after Expo Router treated those files as routes during web export
- added new Cypress account/API/database-contract coverage using mocked Supabase-shaped requests so tests stay secret-safe
- converted lobby invites from draft-only UI into real `lobby_members` invites with accept, decline, suggest-new-time, optional comments, and append-only response history

## Tech Stack

- Expo
- Expo Router
- React Native
- react-native-paper
- Supabase
- Cypress
- Playwright MCP

## Environment

Client environment variables currently used by the app:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_DISCORD_CLIENT_ID=
EXPO_PUBLIC_ALLOW_SIGNUP=true
EXPO_PUBLIC_DEMO_LABEL=
```

Important:

- never put `SUPABASE_SERVICE_ROLE_KEY` in this Expo app
- only the public Supabase URL and anon key belong in the client `.env`
- never use an `EXPO_PUBLIC_*` variable for private secrets
- Discord client secret belongs only in Supabase Auth provider settings or another server-side secret store
- `EXPO_PUBLIC_DISCORD_CLIENT_ID` is safe because it is public

Variables discussed earlier but not active in the current code:

- `EXPO_PUBLIC_APP_SCHEME`
- `EXPO_PUBLIC_APP_ENV`
- `EXPO_PUBLIC_ENABLE_DISCORD_AUTH`
- `EXPO_PUBLIC_ENABLE_GOOGLE_AUTH`
- `EXPO_PUBLIC_ENABLE_TWITCH_CONNECT`

## Commands

Install:

```bash
npm install
```

Run web:

```bash
npm run web
```

Useful scripts:

```bash
npm run lint
npx tsc --noEmit
npm run export:web
npm run cypress:open
npm run cypress:run
npm run cypress:run:smoke
npm run cypress:run:regression
npm run test:e2e
```

Phone development:

```bash
npm start
```

Then scan the Expo QR code with Expo Go on the same Wi-Fi network, or switch Expo to `Tunnel` mode if LAN does not work.

## Supabase Setup

The app is wired to Supabase. Auth lives in `auth.users`, and app-level user data lives in `public.profiles`.

Relationship:

- `public.profiles.id = auth.users.id`

Current SQL scripts:

- [`scripts/games-schema.sql`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/scripts/games-schema.sql)
- [`scripts/game-social-schema.sql`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/scripts/game-social-schema.sql)
- [`scripts/lobbies-schema.sql`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/scripts/lobbies-schema.sql)
- [`scripts/availability-schema.sql`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/scripts/availability-schema.sql)
- [`scripts/friends-schema.sql`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/scripts/friends-schema.sql)
- [`scripts/communities-schema.sql`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/scripts/communities-schema.sql)
- [`scripts/discord-profile-schema.sql`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/scripts/discord-profile-schema.sql)

## What Has Been Built

### App Shell

- global `react-native-paper` theme
- mobile-first single-screen shell with tabs:
  - Home
  - Friends
  - Games
  - Roulette
  - Lobbies
  - Schedule
  - Inbox
  - Profile
- dark visual design system

### Step 1: Authentication

- real Supabase email/password sign-in
- real Supabase email/password sign-up
- Discord login option added through Supabase OAuth
- session restore on app load
- auth state listener
- logout
- auth-gated app shell
- sign-in/sign-up toggle UI
- auth success/error messaging

### Step 2: Profiles + Session Bootstrap

- profile bootstrap after auth
- auto-create profile if missing
- fallback username/display name generation
- profile summary card
- onboarding completion form:
  - username
  - display name
  - avatar URL
- profile save flow
- onboarding completion persistence
- duplicate username handling

### Step 3: Game Library

- live `games` table integration
- seeded game rows
- load games from Supabase
- fallback local seed if table is empty or unreadable
- search by title, genre, platform, and description
- IGDB search/import MVP added through Supabase Edge Functions
- `igdb-search` returns normalized search results from the live IGDB catalog
- `igdb-import-game` upserts selected IGDB titles into `public.games`
- imported IGDB games keep working with favorites, roulette, and lobby creation because `public.games` remains the app source of truth
- `public.games` now supports:
  - `igdb_id`
  - `cover_url`
  - `release_date`
  - `rating`
  - `source`
- featured games on dashboard

### Step 4: Favorites + Roulette Pool

- `favorite_games` integration
- `roulette_pool_entries` integration
- favorite/unfavorite game actions
- add/remove roulette pool actions
- profile favorites section uses real data
- roulette tab uses real saved pool data
- dashboard shows roulette pool summary

### Step 5: Lobbies

- `lobbies` table
- `lobby_members` table
- load lobbies from Supabase
- create event scheduler in the Lobbies tab
- three-step creation flow:
  - select a game
  - pick event timing
  - invite people
- create lobby from game card
- create lobby from roulette result
- fields implemented:
  - game
  - title
  - private/public toggle
- now/later scheduling with a controlled calendar/time picker
- event date input and time modal use `react-native-paper-dates`
- separate start and end time controls
- `scheduled_for` stores the event start time
- `scheduled_until` stores the event end time
- validates that end time is after start time
- host membership insertion on create
- lobbies shown in both Lobbies and Schedule tabs
- invite chips in the lobby form use accepted friends with stable profile IDs
- lobby creation now goes through `create_lobby_with_invites(...)`
- host gets an `accepted` `lobby_members` row on create
- invitees get real `pending` `lobby_members` rows on create
- Lobbies tab now has `Incoming invites` and `Hosted lobbies` sections
- invitees can accept, decline, or suggest a new time
- every invite decision supports an optional comment
- invite suggestions use the same date/start/end picker pattern as scheduling
- response history is appended in `lobby_member_response_history`
- hosts can apply a suggested time and automatically reset other invitees to `pending`

### Step 6: Scheduling + Availability

- `availability_settings` table
- `availability_slots` table remains as harmless legacy/backward-compatible data
- `availability_windows` table is the new active recurring availability model
- live load/save/delete availability window flow
- schedule tab is now picker-based and lower clutter
- upcoming games show game, date, start/end range, and an `Edit time` action
- rescheduling uses the same event date picker plus start/end time modal pattern
- recurring availability uses weekday + start time + end time
- supports multiple custom availability windows per weekday
- validates that availability end time is after start time
- auto-decline preference
- compact availability summary cards
- schedule view shows upcoming lobby cards

### Friends System: First Real Pass

- `friend_requests` table
- `friends` table
- `communities` table
- `community_members` table
- `profiles.primary_community_id`
- authenticated search across `public.profiles`
- Friends tab now uses live Supabase-backed data
- Discord is now the recommended auth path for social discovery
- Discord-community squad suggestions added above the classic request flow
- join/create-community onboarding when a signed-in user has no squad yet
- single-squad invite code flow for low-friction discovery
- search by username/display name
- send friend requests
- incoming pending requests
- outgoing pending requests
- accept incoming requests
- decline incoming requests
- accepted friends list
- favorite/unfavorite friend rows
- lobby invite draft prefers accepted friends when available

### Inbox / Notifications

- placeholder notifications view
- placeholder invite/reminder/system items
- placeholder chat preview

### Profile

- profile overview card
- initials avatar
- avatar URL image rendering with initials fallback
- editable profile details:
  - username
  - display name
  - avatar URL
- editable account/security settings:
  - email update
  - password change
- favorite games section
- preferences summary
- Discord connection status card
- Discord connect/disconnect controls

### Internal Cleanup / Improvement Track 3

- `app/index.tsx` now acts more like the screen entry/orchestrator, with shared UI/data logic split into `features/home`
- home screen shared constants, styles, types, utilities, and section renderers extracted into:
  - [`features/home/homeConstants.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/features/home/homeConstants.ts)
  - [`features/home/homeStyles.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/features/home/homeStyles.ts)
  - [`features/home/homeTypes.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/features/home/homeTypes.ts)
  - [`features/home/homeUtils.tsx`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/features/home/homeUtils.tsx)
  - [`features/home/homeSections.tsx`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/features/home/homeSections.tsx)
- read-side data orchestration extracted into feature hooks:
  - [`features/home/homeGameHooks.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/features/home/homeGameHooks.ts)
  - [`features/home/homeSocialHooks.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/features/home/homeSocialHooks.ts)
  - [`features/home/homeLobbyHooks.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/features/home/homeLobbyHooks.ts)
  - [`features/home/homeAvailabilityHooks.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/features/home/homeAvailabilityHooks.ts)
- this refactor reduced `app/index.tsx` complexity without changing the current single-screen product shape
- key lesson: Expo Router treats files under `app/` as routes, so non-route helpers must live outside that tree

### Public Demo / GitHub Pages

- Expo web export configured for static hosting
- repo-path hosting configured with Expo Router base path `/GameSchedule`
- GitHub Pages workflow added at repo root:
  - [`.github/workflows/deploy-pages.yml`](/c:/Users/matt6/Project/nEVER%20STOP/.github/workflows/deploy-pages.yml)
- public demo environment variables supported:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `EXPO_PUBLIC_DISCORD_CLIENT_ID`
  - `EXPO_PUBLIC_ALLOW_SIGNUP`
  - `EXPO_PUBLIC_DEMO_LABEL`
- public demo mode can disable self-signup so the hosted backend does not get flooded with junk accounts
- GitHub Pages is intended to point at the separate QA/demo Supabase project rather than the prod project
- QA and prod Supabase projects were both validated against the current schema surface
- helper script added for QA schema application:
  - [`scripts/apply-qa-schema.ps1`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/scripts/apply-qa-schema.ps1)
- current local `.env` also points at the QA/demo Supabase project, so local Expo and GitHub Pages are aligned
- the latest lobby invite / response-history schema was applied and verified on QA
- local static export verified successfully with:
  - `npx expo export --platform web`
- hosted GitHub Pages deployment verified live:
  - `https://mattengin.github.io/GameSchedule/`
- Discord callback route verified live:
  - `https://mattengin.github.io/GameSchedule/discord-oauth-callback`

### Template Cleanup

Unused Expo starter/template code has been trimmed back:

- old starter files were removed from `app-example`, `components`, `constants`, and `hooks`
- some empty directory stubs still exist locally, but they are not part of the active app surface
- the active UI is now centered in [`app/index.tsx`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/app/index.tsx), [`app/_layout.tsx`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/app/_layout.tsx), and the extracted [`features/home/`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/features/home) modules

## Database Scripts

### `games-schema.sql`

Creates:

- `public.games`

Seeds:

- Helix Arena
- Drift Legends X
- Deep Raid
- Skyforge Party
- Pixel Strike Zero
- Wild Rally Online
- Void Divers
- Castle Circuit

### `game-social-schema.sql`

Creates:

- `public.favorite_games`
- `public.roulette_pool_entries`

### `lobbies-schema.sql`

Creates:

- `public.lobbies`
- `public.lobby_members`
- `public.lobby_member_response_history`

Important fields:

- `scheduled_for` stores the start timestamp
- `scheduled_until` stores the end timestamp
- `lobbies_scheduled_until_after_start` prevents end times before start times
- `lobby_members.rsvp_status` now supports `pending`, `accepted`, `declined`, and `suggested_time`
- `lobby_members` also stores current response comments, suggested start/end timestamps, and response timestamps

Important RPCs:

- `public.create_lobby_with_invites(...)`
- `public.respond_to_lobby_invite(...)`
- `public.apply_lobby_time_suggestion(...)`

Important note:

- the earliest lobby RLS version created an infinite recursion problem because `lobbies` and `lobby_members` policies referenced each other
- the current version avoids that by using security-definer helper functions for view checks and dedicated RPCs for write flows

### `availability-schema.sql`

Creates:

- `public.availability_settings`
- `public.availability_slots`
- `public.availability_windows`

Current model:

- `availability_windows` is active for new saves
- `availability_slots` is retained for backward compatibility
- each window stores `profile_id`, `day_key`, `starts_at`, `ends_at`, and `created_at`
- RLS allows authenticated users to read/insert/update/delete only their own availability windows

### `friends-schema.sql`

Creates:

- `public.friend_requests`
- `public.friends`

Also adds:

- authenticated read access for `public.profiles`
- `public.accept_friend_request(uuid)` RPC

### `profiles-schema.sql`

Adds the base `public.profiles` bootstrap for projects that do not already have it.

Used for:

- bootstrapping fresh QA/demo projects
- keeping auth-linked profile data consistent across environments

### `communities-schema.sql`

Creates:

- `public.communities`
- `public.community_members`

Also adds:

- `public.profiles.primary_community_id`
- `public.create_community(text)` RPC
- `public.join_community_by_invite(text)` RPC

Purpose:

- drive low-friction Discord-first squad suggestions
- keep GameSchedule lightweight instead of importing Discord’s restricted friends graph

### `discord-profile-schema.sql`

Adds Discord identity fields to `public.profiles`:

- `discord_user_id`
- `discord_username`
- `discord_avatar_url`
- `discord_connected_at`

Also adds:

- unique partial index on `discord_user_id`

Purpose:

- support Discord-first identity
- let Discord OAuth sessions bootstrap profile data
- prepare the app to reduce manual friend/profile setup friction

## Validation History

### Database Confirmation

The following tables were confirmed reachable from the client and returned `200`:

- `profiles`
- `games`
- `favorite_games`
- `roulette_pool_entries`
- `lobbies`
- `lobby_members`
- `availability_settings`
- `availability_slots`
- `availability_windows`
- `friend_requests`
- `friends`

Later QA verification also confirmed the newer lobby invite schema surface:

- `lobby_member_response_history`
- `lobby_members.response_comment`
- `create_lobby_with_invites(...)`
- `respond_to_lobby_invite(...)`
- `apply_lobby_time_suggestion(...)`

### Manual Playwright Validation

The live app was manually validated with Playwright MCP using:

- email: `mattmuslim324@gmail.com`
- password: `admin123`

Validated live:

- step 1 auth
- step 2 profile completion
- step 3 games
- step 4 favorites + roulette
- step 5 lobbies
- step 6 scheduling + availability

Specific observed results:

- sign-in worked
- profile save worked and onboarding became complete
- games loaded from Supabase
- favorites and roulette worked
- lobby creation worked
- schedule availability bug was found, fixed, and revalidated

### Discord Auth Validation

Discord login was tested with Playwright/local static export.

Initial failure:

- Supabase returned:
  - `Unsupported provider: provider is not enabled`

Fix:

- Discord provider was enabled in Supabase Auth
- Discord client ID and secret were entered in Supabase provider settings
- Discord redirect URLs were corrected

Current observed behavior:

- clicking `Continue with Discord` now redirects to Discord
- Discord page shows:
  - `Discord App Launched`
  - `Continue to Discord`
- OAuth scopes observed:
  - `email`
  - `identify`

Important redirect URLs:

- Supabase callback for dev/test:
  - `https://ujsguoktdnrjxqlcrwge.supabase.co/auth/v1/callback`
- Supabase callback for demo:
  - `https://utvqkxdhxonuxwrogda.supabase.co/auth/v1/callback`
- custom app callback:
  - `https://mattengin.github.io/GameSchedule/discord-oauth-callback`
- local custom app callback:
  - `http://localhost:8082/discord-oauth-callback`

Important lesson:

- the Discord OAuth URL generator invite link is not needed for our app flow
- the app/Supabase generate OAuth URLs automatically

### Secret Cleanup

During testing, a local variable named `EXPO_PUBLIC_DISCORD_CLIENT_SECRET` was found in `.env`.

Action taken:

- removed it from local `.env`
- verified Expo export no longer loads it
- confirmed `.env` is ignored by git

Rule:

- never place Discord client secret in `EXPO_PUBLIC_*`
- never place Discord client secret in repo variables
- keep it only in Supabase provider settings or server-side secrets

### Availability Bug Found and Fixed

Problem:

- the schedule screen showed red/unavailable by default
- the count showed `0 saved slots`
- save messaging appeared, but the default behavior was wrong

Root cause:

- the UI treated the existence of an `availability_settings` row as "saved schedule exists"
- that prevented default green availability from showing when there were no saved slot rows

Fix:

- availability now initializes to all slots selected
- only actual `availability_slots` rows count as saved schedule data

Result after live revalidation:

- schedule loaded with `21 saved slots`
- slots displayed as green/available
- toggling a slot off turned it red
- saving persisted correctly

### Schedule Picker Redesign

The older availability-block scheduler was replaced with a lower-clutter picker flow.

Current behavior:

- lobby creation uses `DatePickerInput` and `TimePickerModal`
- lobby creation persists `scheduled_for` and `scheduled_until`
- old lobbies without `scheduled_until` display as a default one-hour event
- Schedule tab upcoming games can be rescheduled with date, start time, and end time
- weekly availability is saved as recurring windows such as `Mon 8:00 PM - 10:00 PM`
- users can add multiple availability windows per weekday
- users can delete individual availability windows
- invalid end-before-start ranges show an error and do not save

### Discord-First Squad Suggestions

The Friends flow now treats Discord identity as the primary social starting point without attempting a real Discord friends import.

Current behavior:

- auth screen recommends Discord as the fastest path into the app
- signed-in users without a squad are routed into join/create-community onboarding
- users can create a squad and receive a reusable invite code
- users can join a squad by invite code
- Friends tab shows `Suggested from your Discord community` above pending requests and manual search
- suggestions exclude the current user, existing friends, and pending-request relationships
- one-tap `Add friend` from suggestions uses the normal `friend_requests` flow underneath
- manual search remains as the fallback path when a user is not yet in the same squad

## Testing

### Cypress Coverage

Current Cypress suite layout:

Smoke:

- [`cypress/e2e/smoke/account-settings.cy.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/cypress/e2e/smoke/account-settings.cy.ts)
- [`cypress/e2e/smoke/auth-smoke.cy.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/cypress/e2e/smoke/auth-smoke.cy.ts)
- [`cypress/e2e/smoke/auth-session.cy.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/cypress/e2e/smoke/auth-session.cy.ts)

Regression:

- [`cypress/e2e/regression/profile-onboarding.cy.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/cypress/e2e/regression/profile-onboarding.cy.ts)
- [`cypress/e2e/regression/games-library.cy.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/cypress/e2e/regression/games-library.cy.ts)
- [`cypress/e2e/regression/game-social.cy.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/cypress/e2e/regression/game-social.cy.ts)
- [`cypress/e2e/regression/lobbies.cy.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/cypress/e2e/regression/lobbies.cy.ts)
- [`cypress/e2e/regression/schedule-availability.cy.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/cypress/e2e/regression/schedule-availability.cy.ts)
- [`cypress/e2e/regression/friends.cy.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/cypress/e2e/regression/friends.cy.ts)

Recommended commands:

- `npm run cypress:run:smoke`
- `npm run cypress:run:regression`

Covered behavior:

- profile save API contract
- email update API contract
- password update validation plus API contract
- Discord OAuth hash cleanup after return
- auth screen rendering
- invalid auth behavior
- mocked session flows
- session restore
- profile bootstrap and onboarding
- games search
- favorites persistence
- roulette persistence
- lobby creation
- host `lobby_members` row insertion contract
- real invite row creation for accepted friends
- invitee accept flow with optional comment
- invitee decline flow with optional comment
- invitee suggest-new-time flow with optional comment
- host apply-suggested-time flow
- invite response history append behavior
- lobby start/end time persistence
- schedule-page lobby rescheduling
- availability window add/delete behavior
- availability range validation
- community onboarding create flow
- community onboarding invalid invite flow
- community onboarding valid invite flow
- signed-in no-squad redirect to Friends/community onboarding
- Discord-community friend suggestions
- friend search
- send request
- accept request
- favorite friend flow

Important note:

- many Cypress specs intentionally mock auth/backend interactions
- this was done because live Supabase signup hit email-send rate limits
- the newer account/API/database coverage is contract-style and does not use live secrets or mutate real hosted data

### Current Repo Health

Current verification status:

- `npm run lint` passes
- `npx tsc --noEmit` passes
- targeted Cypress smoke run now uses:
  - `npm run cypress:run:smoke`
- targeted Cypress regression run now uses:
  - `npm run cypress:run:regression`
- targeted current-source verification was run against a fresh Expo web server on `http://localhost:8083` for:
  - `cypress/e2e/smoke/account-settings.cy.ts`
  - `cypress/e2e/regression/lobbies.cy.ts`

Recent repo-health fixes:

- normalized Supabase join shapes in [`app/index.tsx`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/app/index.tsx)
- removed invalid `SegmentedButtons` `testID` usage
- fixed older starter TypeScript issues before later removing the unused starter files
- converted Cypress specs into modules to avoid duplicate global identifier errors
- updated [`tsconfig.json`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/tsconfig.json) to use `moduleResolution: "bundler"`
- configured ESLint to ignore generated `dist/**` output in [`.eslintrc.js`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/.eslintrc.js)
- moved non-route home helpers out of `app/` so Expo Router no longer exports bogus route files
- split read-side home logic across `features/home` hooks/modules to reduce `app/index.tsx` coupling

## Supabase Limits Discussion

Current Free-plan numbers discussed from official docs:

- **50,000 MAU**
- **50,000 monthly active third-party users**
- **500 MB database**
- **1 GB storage**
- **5 GB egress**
- **500,000 Edge Function invocations**
- **2 million Realtime messages**
- **200 peak Realtime connections**

Practical estimate discussed for this app:

- safe current range: `100-1,000` users
- stretch with light usage: a few thousand
- hard MAU ceiling on paper: `50,000`

Important note:

- the first limit already hit during testing was hosted auth email sending

### Email Rate Limit Discussion

Observed live error from Supabase signup:

- `over_email_send_rate_limit`
- `email rate limit exceeded`

Discussion outcome:

- default hosted email limits are small on Free
- custom SMTP is the durable fix for higher volume
- mocked Cypress auth was used to avoid repeatedly hitting the limit during testing

## IGDB / Twitch Discussion

We discussed using IGDB for game metadata.

Conclusion:

- IGDB is now the chosen game metadata provider
- it is **not** called directly from the Expo client
- it sits behind Supabase Edge Functions

Reasoning:

- Twitch client credentials are required
- secrets must stay server-side
- IGDB has CORS and rate-limit constraints

Implemented architecture:

- Expo app -> Supabase Edge Functions -> IGDB/Twitch
- `igdb-search` searches the live IGDB catalog server-side
- `igdb-import-game` imports selected results into `public.games`
- app features continue to use `public.games` after import

Current Twitch Developer Console registration values agreed for the IGDB app:

- `Name`: `GameSchedule IGDB`
- `OAuth Redirect URLs`:
  - `https://mattengin.github.io/GameSchedule/`
  - `http://localhost:3000/`
- `Category`: `Website Integration`
- `Client Type`: `Confidential`

Important registration note:

- we intentionally did **not** keep the Supabase function callback URL in the Twitch app registration for now
- the first IGDB integration path uses Twitch **client credentials**, which is server-to-server and does not depend on a browser redirect
- the live GitHub Pages URL and `http://localhost:3000/` were kept as the minimal clean registration set for future flexibility

What we need from Twitch after app creation:

- `Client ID`
- `Client Secret`

Where those credentials belong:

- `Client ID` can be referenced by the backend integration and may also be safe in limited public contexts
- `Client Secret` must stay server-side only
- do **not** commit the Twitch client secret to the repo
- do **not** place the Twitch client secret in any `EXPO_PUBLIC_*` variable

Planned IGDB data surface for the first backend integration:

- game name
- summary
- cover image
- genres
- platforms
- release dates
- rating
- game modes
- enough mode data to derive a simple player-count label

First-pass IGDB scope intentionally does **not** include:

- screenshots
- artwork galleries
- videos
- companies / franchise data
- deep multiplayer normalization

Longer-term IGDB fields we may pull later if needed:

- storyline
- artwork
- themes
- player perspectives
- involved companies
- franchises / collections
- websites
- videos
- age ratings
- language support

Current repo status:

- local app wiring for IGDB search/import is implemented
- local regression coverage for search/import plus downstream game actions is in place
- QA `games` schema has been updated for IGDB-backed fields
- QA Edge Function secrets `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` are set
- QA `igdb-search` and `igdb-import-game` are deployed
- current hardening now includes:
  - server-side 429 handling in `igdb-search`
  - a short client-side search cooldown so users do not hammer the API from one tab
  - focused regression coverage for the friendly rate-limit error path
- prod has **not** been mirrored for IGDB yet

## Discord / Social Graph Discussion

A major product conclusion from the session:

- this app is for streamers and gamers
- most users already have Discord
- forcing them to rebuild a full second network is likely the wrong UX
- the practical v1 path is shared Discord-community membership, not Discord’s restricted friends-list API

Conclusion:

- do **not** build a fully separate social network as the main path
- do use Discord as the likely identity/discovery layer later
- keep a lightweight app-owned layer for:
  - favorites
  - recent squad
  - availability
  - lobby preferences
  - app-specific invite behavior

Suggested future framing:

- Connected on Discord
- Favorite squad
- Recent teammates
- Invite circles

This means the current friends implementation is useful as a bridge, but the long-term social model should likely become **Discord-first**.

Current Discord auth direction:

- keep email/password available as fallback for now
- add `Continue with Discord` as a visible login option
- use Discord identity to reduce profile setup friction
- Supabase Discord OAuth requires enabling the Discord provider in Supabase Auth
- the Discord client secret must be stored only in Supabase/provider settings or another server-side secret store, never in Expo client env
- profile bootstrap now reads Discord identities from Supabase sessions when available
- profiles can store linked Discord identity data

## Discord Server Metadata

We added a server-only Discord meetup layer for lobbies.

Current implementation:

- users can sync their Discord server list into `public.profile_discord_guilds`
- sync happens from Discord OAuth `guilds` scope
- lobby creation can optionally store:
  - `discord_guild_id`
  - `discord_guild_name`
  - `discord_guild_icon_url`
- this is metadata only for where the squad should meet
- hosts are **not** selecting channels yet
- invitees are **not** validated against the chosen Discord server yet
- no bot is involved in this phase

Important product boundary:

- channel browsing is explicitly out of scope for this phase
- the chosen Discord server should be treated as host-selected context, not as enforced membership logic

## Lobby History Retention

`lobby_member_response_history` is intentionally append-only while a lobby is active so accept/decline/suggested-time decisions remain visible during coordination.

Retention direction:

- keep `lobby_members` as the lightweight current-state table
- keep history for `24 hours` after the event ends
- delete only `lobby_member_response_history`
- use a daily Supabase Cron / `pg_cron` cleanup job
- QA currently has the cleanup job installed as:
  - `cleanup-lobby-response-history`
  - schedule: `15 5 * * *`

Effective end-time fallback rules:

- use `scheduled_until` when present
- else use `scheduled_for + 1 hour`
- else use `created_at + 1 hour`

Operational note:

- if `cron.job_run_details` starts growing noticeably, add a separate pruning routine later

## Lobby-Derived Busy Status

Hosted lobbies and accepted invites now create a derived busy signal without overwriting recurring weekly availability.

Current behavior:

- recurring availability still means `generally open for invites`
- hosted or accepted lobbies mean `already booked`
- fixed-time overlaps show `Busy`
- no-end lobbies use a hidden `2 hour` fallback window and show yellow `Maybe busy`
- lobby hosts can leave the end time unset instead of forcing a fake hard stop
- open-ended sessions render as `No set end time` in the lobby and schedule UI
- invite flow stays soft-warning only; hosts can still invite someone who is already booked
- accepting an overlapping invite warns first, then allows a second intentional confirm
- the derived read path is `public.get_profile_busy_blocks(...)`

Privacy:

- profiles now have `busy_visibility`
- `public` lets friends see the game title in busy warnings
- `private` redacts the game and only shows that the player is busy

Environment status:

- QA and prod now both carry the `busy_visibility` profile field
- QA and prod now both expose `public.get_profile_busy_blocks(...)`

## Friends Flow Safety Update

The first friends version allowed the client to create both friendship rows directly during accept. That was convenient for prototyping, but it was too permissive.

Current state:

- accepting a friend request now uses `public.accept_friend_request(uuid)`
- the RPC validates:
  - request exists
  - request is pending
  - caller is the addressee
- mirrored friendship rows are inserted server-side
- `friends` insert policy is tightened so users can only directly insert their own row

This is still MVP-level, but it is safer than the original client-only accept flow.

## Hosted Demo Notes

GitHub Pages setup now assumes:

- repository is public
- Pages source is `GitHub Actions`
- the repo root contains the workflow file
- the Expo app lives in the `GameSchedule/` subdirectory

Current hosted URL target:

- `https://mattengin.github.io/GameSchedule/`

Current hosted status:

- GitHub Pages workflow runs successfully
- public site returns `200`
- Discord callback route returns `200`

Important deployment lesson from this session:

- GitHub only detects workflow files placed at the repository root `.github/workflows/`
- the first Pages workflow version was incorrectly placed under `GameSchedule/.github/workflows/` and therefore did not show up in the Actions tab
- this was corrected by moving the workflow to:
  - [`.github/workflows/deploy-pages.yml`](/c:/Users/matt6/Project/nEVER%20STOP/.github/workflows/deploy-pages.yml)

Recommended public demo posture:

- use a second Supabase project for the public demo
- keep `EXPO_PUBLIC_ALLOW_SIGNUP=false`
- use a shared demo account rather than open self-signup
- keep development and public demo data separated

## Running on a Phone

For development on a real phone, the current path is Expo Go:

1. Install Expo Go on the phone.
2. From [`GameSchedule/package.json`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/package.json), run:
   - `npm start`
3. Scan the QR code with Expo Go.
4. If LAN does not work, switch Expo to `Tunnel`.

This uses the local `.env` values and the existing Supabase client configuration.

## Weird Testing Overlay

During Playwright validation, an unrelated overlay appeared with messaging like:

- join Discord community
- get premium free
- debug help and tutorials

The user clicked it and it referenced a Testwright user named `Ash`.

Conclusion:

- this is not part of the app
- it is almost certainly injected by the Playwright/Testwright browser context or an extension
- it should be treated as testing-environment noise, not a product bug

## Current Limitations

- notifications are placeholder-only
- chat is placeholder-only
- lobby response updates are surfaced in the Lobbies and Schedule tabs, not yet in Inbox notifications
- Discord login is started and redirects correctly, but full end-to-end manual confirmation after Discord approval should still be validated
- Discord relationship/friend import is not implemented
- Discord server selection is server-only; channel selection is not implemented
- Twitch integration is not implemented
- IGDB integration is not implemented
- the app is still largely a single-screen prototype shell rather than full routed screens

## Operational and Cost Risks

### Low

- server-only Discord metadata has low storage cost
- one daily cleanup cron has negligible user-facing impact
- deleting only history keeps the product simple and cheap

### Medium

- cron failure can silently let history accumulate
- QA/prod cron drift can cause inconsistent retention behavior
- Discord guild re-syncs can increase egress/compute if overused
- `cron.job_run_details` can grow over time if never pruned

### High

- incorrect effective-end-time logic can delete history too early
- assuming Discord channel browsing is available without a bot would lead to a broken product path
- schema/cron mismatch between environments can make Pages/local/prod behave differently

## Recommended Next Steps

Short-term:

- manually finish the Discord authorization flow and confirm the app session/profile bootstrap after return
- live-validate the new friends flow with two real accounts
- live-validate the new lobby invite/comment/history flow with multiple real accounts
- live-validate the optional Discord meetup-server selection with linked accounts
- live-validate the new `Busy` / `Maybe busy` invite warnings with two real accounts
- build notifications from friend requests and lobby actions
- manually validate the new schedule picker flow against real Supabase data after the SQL is applied

Medium-term:

- redesign the social layer around a Discord-first model
- add Discord auth/account linking
- expand community discovery beyond one primary squad if the product needs it
- reduce the amount of manual search/add work even further

Long-term:

- add backend functions or RPCs for:
  - accepting friend requests
  - creating mirrored friendship rows safely
  - sending notifications for lobby responses and time changes
  - syncing Discord and IGDB data

## Key Files

- [`app/_layout.tsx`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/app/_layout.tsx)
- [`app/index.tsx`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/app/index.tsx)
- [`features/home/homeSections.tsx`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/features/home/homeSections.tsx)
- [`features/home/homeSocialHooks.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/features/home/homeSocialHooks.ts)
- [`features/home/homeLobbyHooks.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/features/home/homeLobbyHooks.ts)
- [`services/supabaseClient.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/services/supabaseClient.ts)
- [`scripts/games-schema.sql`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/scripts/games-schema.sql)
- [`scripts/game-social-schema.sql`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/scripts/game-social-schema.sql)
- [`scripts/lobbies-schema.sql`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/scripts/lobbies-schema.sql)
- [`scripts/discord-guilds-schema.sql`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/scripts/discord-guilds-schema.sql)
- [`scripts/availability-schema.sql`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/scripts/availability-schema.sql)
- [`scripts/friends-schema.sql`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/scripts/friends-schema.sql)
- [`scripts/communities-schema.sql`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/scripts/communities-schema.sql)
- [`scripts/profiles-schema.sql`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/scripts/profiles-schema.sql)
- [`scripts/apply-qa-schema.ps1`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/scripts/apply-qa-schema.ps1)
- [`scripts/discord-profile-schema.sql`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/scripts/discord-profile-schema.sql)
- [`cypress/e2e/account-settings.cy.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/cypress/e2e/account-settings.cy.ts)
- [`cypress/e2e/auth-smoke.cy.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/cypress/e2e/auth-smoke.cy.ts)
- [`cypress/e2e/auth-session.cy.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/cypress/e2e/auth-session.cy.ts)
- [`cypress/e2e/profile-onboarding.cy.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/cypress/e2e/profile-onboarding.cy.ts)
- [`cypress/e2e/games-library.cy.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/cypress/e2e/games-library.cy.ts)
- [`cypress/e2e/game-social.cy.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/cypress/e2e/game-social.cy.ts)
- [`cypress/e2e/lobbies.cy.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/cypress/e2e/lobbies.cy.ts)
- [`cypress/e2e/schedule-availability.cy.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/cypress/e2e/schedule-availability.cy.ts)
- [`cypress/e2e/friends.cy.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/cypress/e2e/friends.cy.ts)

## Summary

This repo has been moved from a starter template into a functioning Supabase-backed prototype covering:

- auth
- profiles
- games
- favorites
- roulette
- lobbies
- lobby invite responses and history
- Discord meetup-server metadata
- scheduling
- availability
- account settings
- Discord login/profile identity groundwork
- the first real friends/request flow
- Discord-first squad suggestions
- internal home-feature refactor
- test coverage
- manual live validation
- Supabase limits discussion
- IGDB architecture discussion
- Discord-first product strategy

This README should be kept updated as the product direction and architecture evolve.
