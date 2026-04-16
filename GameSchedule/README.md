# GameSchedule

Mobile-first social gaming coordination app for streamers and gamers. This repo started as an Expo starter and is now a Supabase-backed prototype with real auth, profiles, game library, favorites, roulette, lobbies, scheduling, availability, and a first pass at a real friends/request flow.

This README is meant to preserve the working context from the build session: product direction, architecture decisions, implementation status, validation notes, limitations, and next steps.

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

## Tech Stack

- Expo
- Expo Router
- React Native
- react-native-paper
- Supabase
- Cypress
- Playwright MCP

## Environment

Client environment variables currently used:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_APP_SCHEME=
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_ENABLE_DISCORD_AUTH=false
EXPO_PUBLIC_ENABLE_GOOGLE_AUTH=false
EXPO_PUBLIC_ENABLE_TWITCH_CONNECT=false
```

Important:

- never put `SUPABASE_SERVICE_ROLE_KEY` in this Expo app
- only the public Supabase URL and anon key belong in the client `.env`

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
npm run cypress:open
npm run cypress:run
npm run test:e2e
```

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
- create lobby form in the Lobbies tab
- create lobby from game card
- create lobby from roulette result
- fields implemented:
  - game
  - title
  - now/later scheduling
  - private/public toggle
- host membership insertion on create
- lobbies shown in both Lobbies and Schedule tabs
- invite draft UI in the lobby form
- invite draft count shown in UI
- invite draft currently local-only

### Step 6: Scheduling + Availability

- `availability_settings` table
- `availability_slots` table
- live load/save availability flow
- weekly slot grid
- auto-decline preference
- availability save action
- selected slot count
- default state changed to available-by-default
- green/red slot styling:
  - green = available
  - red = not available
- schedule legend
- schedule view shows upcoming lobby countdown cards

### Friends System: First Real Pass

- `friend_requests` table
- `friends` table
- authenticated search across `public.profiles`
- Friends tab now uses live Supabase-backed data
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
- favorite games section
- preferences summary

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

Important note:

- the first lobby RLS version created an infinite recursion problem because `lobbies` and `lobby_members` policies referenced each other
- this was fixed by simplifying lobby reads to host-owned reads for the current phase

### `availability-schema.sql`

Creates:

- `public.availability_settings`
- `public.availability_slots`

### `friends-schema.sql`

Creates:

- `public.friend_requests`
- `public.friends`

Also adds:

- authenticated read access for `public.profiles`

That profile read policy is needed for the current client-side people search flow.

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
- `friend_requests`
- `friends`

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

## Testing

### Cypress Coverage

Current Cypress specs:

- [`cypress/e2e/auth-smoke.cy.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/cypress/e2e/auth-smoke.cy.ts)
- [`cypress/e2e/auth-session.cy.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/cypress/e2e/auth-session.cy.ts)
- [`cypress/e2e/profile-onboarding.cy.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/cypress/e2e/profile-onboarding.cy.ts)
- [`cypress/e2e/games-library.cy.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/cypress/e2e/games-library.cy.ts)
- [`cypress/e2e/game-social.cy.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/cypress/e2e/game-social.cy.ts)
- [`cypress/e2e/lobbies.cy.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/cypress/e2e/lobbies.cy.ts)
- [`cypress/e2e/schedule-availability.cy.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/cypress/e2e/schedule-availability.cy.ts)
- [`cypress/e2e/friends.cy.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/cypress/e2e/friends.cy.ts)

Covered behavior:

- auth screen rendering
- invalid auth behavior
- mocked session flows
- session restore
- profile bootstrap and onboarding
- games search
- favorites persistence
- roulette persistence
- lobby creation
- lobby invite-draft behavior
- availability save/reload
- friend search
- send request
- accept request
- favorite friend flow

Important note:

- many Cypress specs intentionally mock auth/backend interactions
- this was done because live Supabase signup hit email-send rate limits

### Current Repo Health

Current verification status:

- `npm run lint` passes
- `npx tsc --noEmit` does **not** currently pass

Known TypeScript issues:

- Supabase join responses in [`app/index.tsx`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/app/index.tsx) are cast too loosely for `roulette_pool_entries` and `lobbies`
- `SegmentedButtons` typing in [`app/index.tsx`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/app/index.tsx) does not like the top-level `testID` prop
- older starter issues still exist in:
  - [`components/ExternalLink.tsx`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/components/ExternalLink.tsx)
  - [`components/__tests__/ThemedText-test.tsx`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/components/__tests__/ThemedText-test.tsx)
- Cypress spec files are currently treated as global scripts by TypeScript, which causes duplicate identifier errors across shared helper names like `MockAccount`, `authStore`, and `makeAuthBody`

Practical meaning:

- the app is working and has been manually validated
- lint is green
- the repo still needs a TypeScript cleanup pass before it can be considered type-clean

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

- IGDB is a good future fit for the library
- it should **not** be called directly from the Expo client
- it should sit behind a backend layer such as a Supabase Edge Function

Reasoning:

- Twitch client credentials are required
- secrets must stay server-side
- IGDB has CORS and rate-limit constraints

Recommended future architecture:

- Expo app -> Supabase Edge Function -> IGDB/Twitch
- cache/import selected results into `public.games`

## Discord / Social Graph Discussion

A major product conclusion from the session:

- this app is for streamers and gamers
- most users already have Discord
- forcing them to rebuild a full second network is likely the wrong UX

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

- friend requests and friendships are client-managed right now
- accepting a request creates both friendship rows from the client
- the current `friends` policy is intentionally permissive enough to support that client-side accept flow, which is convenient for now but not ideal long-term
- lobby invite drafts are still local-only
- real invited `lobby_members` beyond the host are not yet persisted
- notifications are placeholder-only
- chat is placeholder-only
- Discord integration is not implemented
- Twitch integration is not implemented
- IGDB integration is not implemented
- the app is still largely a single-screen prototype shell rather than full routed screens

## Recommended Next Steps

Short-term:

- live-validate the new friends flow with two real accounts
- connect accepted friends to real `lobby_members` invites
- build notifications from friend requests and lobby actions

Medium-term:

- redesign the social layer around a Discord-first model
- add Discord auth/account linking
- import or discover Discord-connected users
- reduce the amount of manual search/add work

Long-term:

- add backend functions or RPCs for:
  - accepting friend requests
  - creating mirrored friendship rows safely
  - inviting real friends into lobbies
  - syncing Discord and IGDB data

## Key Files

- [`app/_layout.tsx`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/app/_layout.tsx)
- [`app/index.tsx`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/app/index.tsx)
- [`services/supabaseClient.ts`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/services/supabaseClient.ts)
- [`scripts/games-schema.sql`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/scripts/games-schema.sql)
- [`scripts/game-social-schema.sql`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/scripts/game-social-schema.sql)
- [`scripts/lobbies-schema.sql`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/scripts/lobbies-schema.sql)
- [`scripts/availability-schema.sql`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/scripts/availability-schema.sql)
- [`scripts/friends-schema.sql`](/c:/Users/matt6/Project/nEVER%20STOP/GameSchedule/scripts/friends-schema.sql)
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
- scheduling
- availability
- the first real friends/request flow
- test coverage
- manual live validation
- Supabase limits discussion
- IGDB architecture discussion
- Discord-first product strategy

This README should be kept updated as the product direction and architecture evolve.
