# 비타망고 (vita-mango) — Jelly Supplement App

A cute, character-centric supplement-tracking mobile app. A mango-slime mascot
named **젤리 (Jelly)** reminds you to take your supplements, reacts to your daily
condition, and recommends what your routine is missing — all computed on the
device, with no account and no backend.

This is the real implementation of the design exported from Claude Design
(`project/젤리 영양제.dc.html` — direction **C**, the character-centric concept).

```
app/      Expo React Native app (TypeScript) — the entire product
public/   Static privacy policy + app-ads.txt (Firebase Hosting, free tier)
project/  Original Claude Design HTML/CSS prototype (reference only)
chats/    The design conversation that produced the prototype
```

## Features

- **50-question survey** (그렇다 / 모르겠다 / 아니다) that profiles you across 24
  health domains and recommends from a bundled table of **53 supplements**,
  ranked by fit and damped by how strong the clinical evidence is.
- **No account, no server, no network** — answers, supplements, doses, diaries
  and progress live only on the device.
- **Local reminders** — a daily repeating notification per supplement, with its
  own time you can adjust.
- **5 screens**: 설문 · 홈 · 기록(한 줄 일기) · AI추천 · 젤리(마이페이지), in the
  design's chunky-outline / vivid-pill style.
- **Jelly mascot** — expressions, idle bob + blink, and a squishy heart-burst on
  tap. Its home-screen mood reflects the day's state.

## Architecture

```
 ┌──────────────────────────────────────────────┐
 │  RN app (dev build)                          │
 │                                              │
 │  survey answers ─▶ logic/recommend.ts        │   no network calls
 │                     ├─ data/survey.ts        │   no account
 │                     └─ data/supplements.ts   │   no backend
 │                          │                   │
 │                          ▼                   │
 │  AsyncStorage ◀── supplements · diaries      │
 │       │                                      │
 │       └─▶ expo-notifications (local, daily)  │
 └──────────────────────────────────────────────┘
              │
              └─▶ Google Mobile Ads (the only external SDK)
```

Everything the app knows is bundled text plus device storage. The one remaining
piece of hosting is `public/` — a static privacy policy and `app-ads.txt`, served
free from Firebase Hosting because the App Store needs a privacy URL and AdMob
verifies `app-ads.txt`.

> **Note on the workflow:** the app runs in a **custom dev build**, not Expo Go
> (AdMob and notifications are native modules). Once installed, JS changes still
> hot-reload — you only rebuild when native modules/config change.

---

## Setup

```bash
cd app
npm install
npx expo run:ios       # Mac + Xcode
npx expo run:android   # Android SDK
```

There is no `.env` to fill in and no service to provision. The AdMob app ids are
in `app.json`; nothing else is configured.

> On macOS with a non-UTF-8 shell locale, CocoaPods can fail while *printing* an
> error (`Unicode Normalization not appropriate for ASCII-8BIT`). Prefix the
> command with `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8` if you hit it.

---

## How the recommendation works

It is deterministic, offline, and unit-checked — the same answers always produce
the same result.

1. **Answers → domain needs.** Each of the 44 scoring questions contributes
   weight to one or more of 24 health domains (수면, 피로, 장 건강, 눈 …).
   Scores are normalised per domain so a domain with four questions isn't twice
   as loud as one with two. `그렇다` = 1.0, `모르겠다` = 0.3, `아니다` = 0.
   Habit questions phrased positively ("채소를 매일 먹어요") are inverted, so it
   is the *no* answer that signals a gap.
2. **Needs → supplement fit.** Every supplement in `data/supplements.ts` declares
   how well it covers each domain (0–1). Fit is the dot product, then multiplied
   by an evidence weight (A = 1.0, B = 0.85, C = 0.68) so a well-studied option
   outranks a trendy one at equal fit.
3. **Safety filter.** The last 6 questions set exclusion flags — 임신·수유,
   항응고제, 신장 질환, 갑상선약, 호르몬 민감 질환, 수술 예정. Supplements
   listing a flag in `avoidIf` are dropped and the result says why; `warnIf`
   attaches a caution instead. Prescription-only substances are never suggested.
4. **Free text** nudges (max +0.15 per domain) and is echoed back as signal
   chips. The survey is the instrument; the text box is colour.

The 3-second "analysing" screen is deliberate theatre — the engine finishes in
under a millisecond.

Run the regression check after editing either table:

```bash
cd app && npm run verify:engine
```

It asserts domain coverage, alias collisions, safety exclusions actually
excluding, and that known archetypes still get sensible top picks.

## Data model (on-device)

`AsyncStorage`, one key per concern so a corrupt value degrades one feature
rather than the whole profile:

```
vm.supplements  [{ id?, name, time, color, taken, hour, minute, notify, dose? }]
vm.diaries      [string]              // newest first
vm.survey       { answers, freeText, takenAt }
vm.doseLog      [YYYY-MM-DD]          // days fully dosed → streak / level
vm.lastActiveDate, vm.onboarded, vm.createdAt, vm.notifyEnabled
```

Only the answers are stored, never the computed result — the engine is
deterministic, so persisting the output would just risk it going stale against
an updated table.

## Tech notes

- The prototype's custom DC runtime was **not** copied — the design was recreated
  natively. Gradients use `expo-linear-gradient`; the character's motion uses
  React Native `Animated`. Fonts are Jua + Gowun Dodum via `@expo-google-fonts`.
- Storage: `@react-native-async-storage/async-storage`. Reminders:
  `expo-notifications` (local only — no push tokens, no server). Screen nav is
  local state + a custom bottom tab bar (no router dependency).
- The supplement table is general wellness information, not medical advice. The
  UI says so and tells anyone pregnant, medicated, or managing a condition to
  consult a professional.
