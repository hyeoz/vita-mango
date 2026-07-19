# 비타망고 AI backend — Firebase Cloud Functions

The Gemini proxy (AI recommendation + intake timing), integrated into the
`vita-mango` Firebase project. Replaces the standalone `server/` folder.

- `POST /api/recommend` — AI supplement recommendation
- `POST /api/timing` — intake-time decision (works for any name)

The app reaches these via a Firebase Hosting rewrite (`/api/**` → the `api`
function), so the client base URL is just the Hosting domain.

## Prerequisites

1. **Blaze plan** (pay-as-you-go). Cloud Functions that call external APIs
   (Gemini) can't run on the free Spark plan. Upgrade in the Firebase console.
2. Firebase CLI + login:
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

## One-time setup

Store the Gemini key as a Firebase secret (never in code / .env):

```bash
firebase functions:secrets:set GEMINI_API_KEY
# paste the key from server/.env when prompted
```

## Deploy

From the repo root:

```bash
firebase deploy --only functions,hosting
# (optional) also push the Firestore rules that now live in firebase.json:
firebase deploy --only firestore:rules
```

After deploy, point the app at the Hosting URL and rebuild:

```
# app/.env
EXPO_PUBLIC_API_URL=https://vita-mango.web.app
```

## Local development

Run the function locally with the emulator instead of the old `server/`:

```bash
firebase emulators:start --only functions
# → http://localhost:5001/vita-mango/asia-northeast3/api  (routes: /api/recommend, /api/timing)
```

Give the emulator the key for the session:
`GEMINI_API_KEY=... firebase emulators:start --only functions`

## App Check (protects the paid endpoints)

The app attaches a Firebase App Check token (`X-Firebase-AppCheck` header); the
function verifies it. Enforcement is **off until you flip it on**, so deploying
this code never breaks live traffic (App Check's monitor→enforce rollout).

Rollout order:

1. **Firebase Console → App Check** → register the apps:
   - iOS: **App Attest** (requires the App Attest capability on the build)
   - Android: **Play Integrity**
   - For local/dev builds: run the app once, copy the **debug token** it logs,
     and add it under App Check → Manage debug tokens.
2. Ship an app build that initializes App Check (already wired in
   `app/src/firebase/appCheck.ts`) and let it reach users.
3. Turn on hard rejection — set the env var and redeploy:
   ```bash
   echo "APP_CHECK_ENFORCE=true" >> functions/.env
   firebase deploy --only functions
   ```
   Until then the function verifies-and-logs but still serves requests without a
   valid token.

## Config

- Model: `GEMINI_MODEL` env var (default `gemini-flash-latest`).
- `APP_CHECK_ENFORCE` env var (default off) — set `true` to reject requests
  without a valid App Check token.
- Region: `asia-northeast3` (see `index.js`). Change there + in the Hosting rewrite
  region if you move it.
