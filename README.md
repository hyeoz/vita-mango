# 젤리 영양제 — Jelly Supplement App

A cute, character-centric supplement-tracking mobile app. A mango-slime mascot
named **젤리 (Jelly)** reminds you to take your supplements, reacts to your daily
condition, and uses **Claude** to recommend what your routine is missing.

This is the real implementation of the design exported from Claude Design
(`project/젤리 영양제.dc.html` — direction **C**, the character-centric concept).

```
app/      Expo React Native app (TypeScript) — the mobile client
server/   Express backend that calls the Claude API for AI recommendations
project/  Original Claude Design HTML/CSS prototype (reference only)
chats/    The design conversation that produced the prototype
firestore.rules   Firestore security rules
```

## Features

- **Google sign-in** (native) + **Firestore** persistence — your diaries, doses,
  and progress are saved per account and sync across devices.
- **5 screens**: 온보딩 · 홈 · 기록(한 줄 일기) · AI추천 · 젤리(마이페이지), in the
  design's chunky-outline / vivid-pill style.
- **Jelly mascot** — five expressions, idle bob + blink, and a squishy heart-burst
  on tap. Its home-screen mood reflects the day's state.
- **Real Claude integration** — the AI추천 screen sends your diary + supplements to
  `claude-opus-4-8` (via the backend) and gets back scored recommendation cards.

## Architecture

```
 ┌─────────────┐   Google sign-in    ┌──────────────┐
 │  RN app     │────────────────────▶│ Firebase Auth │
 │ (dev build) │                     └──────────────┘
 │             │   read/write own doc ┌──────────────┐
 │             │────────────────────▶ │  Firestore   │  users/{uid}
 │             │                      └──────────────┘
 │             │   POST /api/recommend ┌──────────────┐   ┌──────────┐
 │             │─────────────────────▶ │ Express proxy│──▶│  Claude  │
 └─────────────┘                       └──────────────┘   └──────────┘
```

- The app talks to **Firestore directly** (secured by rules scoped to the user's
  `uid`) for its data.
- The **Express backend exists only to hold the Claude API key** — the app never
  sees it.

> **Note on the workflow:** because native Firebase + native Google Sign-In are
> used, the app runs in a **custom dev build**, not Expo Go. Once the dev build is
> installed on your device, JS changes still hot-reload exactly like Expo Go — you
> only rebuild when native modules/config change.

---

## Setup

### 1. Firebase project (one-time)

1. Create a project at <https://console.firebase.google.com>.
2. **Authentication → Sign-in method → enable Google.**
3. **Firestore Database → create** (production mode).
4. Register apps with bundle id / package **`com.jelly.supplement`**:
   - iOS → download `GoogleService-Info.plist` → save to `app/GoogleService-Info.plist`
   - Android → download `google-services.json` → save to `app/google-services.json`
   - (templates are in `app/*.example`; the real files are git-ignored)
5. Copy `app/.env.example` → `app/.env` and set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
   (Authentication → Google → **Web client ID**).
6. Deploy the rules: `firebase deploy --only firestore:rules` (uses `firestore.rules`).

### 2. Backend (Claude proxy)

```bash
cd server
npm install
cp .env.example .env          # add ANTHROPIC_API_KEY (or use `ant auth login`)
npm start                     # → http://localhost:4000
```

### 3. App — build & run

```bash
cd app
npm install
npm i -g eas-cli              # if you don't have it

# build a dev client once (cloud build — no Mac needed for iOS):
eas build --profile development --platform android   # or ios
# install the resulting build on your device, then:

npx expo start --dev-client  # JS now hot-reloads on the device
```

On a physical device, point the app at your machine for the Claude backend:

```bash
EXPO_PUBLIC_API_URL=http://192.168.x.x:4000 npx expo start --dev-client
```

> Prefer a local build? `npx expo run:android` (Android SDK) or
> `npx expo run:ios` (Mac + Xcode) generates the native project and installs it.

---

## Data model (Firestore)

One document per user — small arrays, one read on launch, debounced writes:

```
users/{uid} {
  supplements: [{ name, time, color, taken }]
  diaries:     [string]        // newest first
  onbSelected: [string]
  addedRecs:   [string]
  onboarded:   boolean
  createdAt, updatedAt
}
```

Security rules (`firestore.rules`) allow a user to read/write **only their own**
document.

## How the AI recommendation works

1. The app POSTs recent diary entries + current supplements to
   `POST /api/recommend`.
2. The server calls `claude-opus-4-8` with Jelly's Korean persona and a
   **JSON-schema structured output**, so the response is always
   `{ analysis, signals[], recommendations[] }` — already shaped for the cards.
3. Claude recommends only from a known catalog and avoids supplements you already
   take, so each card renders a matching pill colour.

See `server/index.js` for the schema and prompt.

## Tech notes

- The prototype's custom DC runtime was **not** copied — the design was recreated
  natively. Gradients use `expo-linear-gradient`; the character's motion uses
  React Native `Animated`. Fonts are Jua + Gowun Dodum via `@expo-google-fonts`.
- Auth: `@react-native-firebase/auth` + `@react-native-google-signin`.
  Data: `@react-native-firebase/firestore`. Screen nav is local state + a custom
  bottom tab bar (no router dependency).
