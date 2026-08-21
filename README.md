# 비타망고 (vita-mango) — Jelly Supplement App

A cute, character-centric supplement-tracking mobile app. A mango-slime mascot
named **젤리 (Jelly)** reminds you to take your supplements, reacts to your daily
condition, and recommends what your routine is missing — all computed on the
device, with no account and no backend.

This is the real implementation of the design exported from Claude Design
(`project/젤리 영양제.dc.html` — direction **C**, the character-centric concept).

```
app/      Expo React Native app (TypeScript) — the entire product
project/  Original Claude Design HTML/CSS prototype (reference only)
chats/    The design conversation that produced the prototype
```

## Features

- **Adaptive survey** (그렇다 / 모르겠다 / 아니다) that profiles you across 24
  health domains and recommends from a bundled table of **53 supplements**,
  ranked by fit and damped by how strong the clinical evidence is.
- **No account or app backend** — answers, supplements, doses, diaries and
  progress live only on the device. AdMob is the only networked SDK.
- **Local reminders** — a daily repeating notification per supplement, with its
  own time you can adjust.
- **5 screens**: 설문 · 홈 · 기록(한 줄 일기) · 맞춤추천 · 젤리(마이페이지), in the
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

Everything the app knows is bundled text plus device storage. Privacy and
support pages live in the separate `hyeoz/privacy` GitHub Pages repository.

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

Deterministic, offline, and unit-checked — the same answers always produce the
same result.

### The survey adapts

Three stages, and only the first is asked in full:

| stage | count | when |
|---|---|---|
| `screen` | 18 | always — one broad probe per area |
| `deep` | 30 | only where the screener found something (`gate`) |
| `safety` | 6 | only when a supplement still in contention cares |

A typical profile answers **~25–32 questions**; someone who says yes to
everything reaches the full bank. Length now reflects how much there is to know
about *you*, not how much the form can hold.

Deep questions are written to **discriminate**, not re-confirm. By the time they
run the engine already knows you sleep badly; what it still needs is whether
that's cramping legs (마그네슘), a racing mind (아슈와간다·테아닌), or trouble
falling asleep at all.

### Scoring

1. **Answers → domain needs.** Each scoring question adds weight to one or more
   of 24 domains, normalised per domain so 수면 (more questions) isn't louder
   than 뼈 (fewer). `그렇다` = 1.0, `모르겠다` = 0.3, `아니다` = 0. Positively
   phrased habit questions are inverted — the *no* is the signal.
2. **Needs → value.** Value is mostly *absolute* coverage of your needs, nudged
   by focus and damped by evidence grade (A = 1.0, B = 0.85, C = 0.68). The
   obvious metric — "what fraction of this pill's abilities do you need" —
   punishes broad products: a multivitamin covering three of five gaps would
   score below a selenium tablet covering one gap perfectly. A dietitian ranks
   by benefit delivered.
3. **Overlap discounting.** Picks are greedy, and each one saturates the needs
   it covers before the next is scored. Without this, answering "잠을 못 자요"
   returns five sleep aids. The displayed percentage *is* the marginal score, so
   the order on screen always matches the numbers on screen; a card discounted
   by overlap says which earlier pick covers the same ground and what it scored
   on its own.
4. **Safety filter.** `avoidIf` drops the supplement with a stated reason;
   `warnIf` attaches a caution. Prescription-only substances are never suggested.
5. **Free text** nudges (max +0.15 per domain) and is echoed back as chips. The
   survey is the instrument; the text box is colour.

The 3-second "analysing" screen is deliberate theatre — the engine finishes in
under a millisecond.

### The radar

24 domains is the right resolution for scoring and the wrong one for a chart, so
they roll up into six macro axes — 활력·집중, 면역·항산화, 순환·대사,
수면·스트레스, 근골격, 장·피부. The chart shows **capability** (higher is
better) on a 30–100 band, with a dashed overlay projecting where the selected
supplements would take each axis. Ticking a card off shrinks the overlay live.
여성/남성 건강 stay off the radar — sex-specific rather than universal — and
surface as chips instead.

Run the regression check after editing either table:

```bash
cd app && npm run verify:engine
```

It asserts stage coverage, gates that nothing can open, alias collisions, axis
mapping, safety exclusions actually excluding, that a sleep complaint doesn't
return an all-sleep list, and that known archetypes still get sensible top picks.

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
