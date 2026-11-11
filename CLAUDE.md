# FinQuest: instructions for coding agents

Read this file, then `ROADMAP.md`. Together they are the full handover.

## What this is

FinQuest is an open-source, offline, pixel-style personal finance tracker.
React Native with Expo SDK 58, TypeScript, SQLite on the device. Android first, iOS later from the same code.
The owner's design reference is a dark pixel-art UI (night sky, chunky bordered panels, gold accent).

## What has happened so far

- v0.1 was written in a cloud sandbox that could not install packages or run an emulator.
- **Verified:** the pure logic in `src/domain` (11 unit tests pass), `npm install` resolves on CI, sprite grids are valid.
- **Not verified:** everything that needs a device. No screen has ever been rendered. Treat all of `app/` and `src/ui/` as plausible but untested.
- Type-check passes on CI (`tsc --noEmit` against the real Expo and React Native types). That proves the code compiles, not that it works.
- One APK build was started on GitHub Actions (run 43009969619, on the commit before the type fix). Its result was not read: check it with `gh run view 43009969619` before building again.

## Your first job: Phase 1 (make it run)

Do these in order. Do not start feature work until the app opens and the checklist passes.

1. `npm install`
2. `npx expo install --fix` (aligns native package versions with SDK 58), then `npx expo-doctor@latest`.
3. `npm test` and `npm run typecheck`. Fix every error.
4. `npx expo run:android` on an emulator or a USB device. Fix build and runtime errors until the app opens.
5. Walk the smoke checklist below. Fix what fails.
6. Commit `package-lock.json` and the fixes. Update "What has happened so far" in this file.

### Smoke checklist

- [ ] Onboarding shows, currency can be picked, "Get Started" lands on Home.
- [ ] "Explore with demo data" fills Home, Transactions, Analytics, Budget and Goals.
- [ ] Add an expense and an income; both appear on Home and in Transactions; balance updates.
- [ ] Edit and delete a transaction (tap to edit, hold to delete).
- [ ] Kill and reopen the app: data is still there (SQLite persistence).
- [ ] Savings plan: set income and target, "Safe to spend today" appears on Home; switching start/end rule changes the preview.
- [ ] Goals: create with a date, add money, see the monthly amount; create one with no deadline.
- [ ] Budget: set an overall limit and a category limit; bars change colour near and over the limit.
- [ ] Analytics: Day, Month and Year each show totals, donut, bars and guide cards; arrows move the period.
- [ ] Settings: all three themes render legibly; currency change relabels amounts; erase data works.
- [ ] More > Export CSV opens the share sheet.
- [ ] The 3D coin spins and speeds up on tap. If it does not render, see "Known risk points".
- [ ] The pixel font is applied (headings should look blocky). The rupee sign may fall back to the system font; that is acceptable.

### Known risk points (check these first when something breaks)

| Area | File | Risk |
| --- | --- | --- |
| Routing | `app/_layout.tsx`, `app/(tabs)/_layout.tsx` | expo-router's navigation core was reworked in SDK 58. `Stack`, `Tabs`, `Redirect`, `contentStyle` and the `tabBar*` options were written from pre-58 knowledge. Check the SDK 58 migration guide. |
| 3D coin | `src/ui/Coin3D.tsx` | three.js `WebGLRenderer` on an `expo-gl` context through a fake canvas object. May need extra canvas fields or a different three version. It already falls back to a sprite on error; keep that fallback. |
| Fonts | `app/_layout.tsx` | `@expo-google-fonts/pixelify-sans` is pinned loosely (`>=0.2.3`); confirm the export names `PixelifySans_400Regular` and `PixelifySans_700Bold`. |
| SQLite | `src/data/db.ts`, `src/data/repo.ts` | Uses the async API (`openDatabaseAsync`, `runAsync`, `getAllAsync`, `withTransactionAsync`). Confirm against the SDK 58 docs. |
| Keyboard | `src/ui/kit.tsx` (`Screen`, `AmountPrompt`) | `KeyboardAvoidingView` behaviour on Android is a guess. |
| Layout | `src/ui/kit.tsx` (`Button`) | Pressed state swaps border width for margin to fake a "push"; check it does not jitter. |
| Types | `package.json` | `@types/react` and `typescript` versions were guessed; let `expo install --fix` correct them. |

## Commands

```sh
npm test              # unit tests (node:test via tsx), no native deps needed
npm run typecheck     # tsc --noEmit
npx expo run:android  # dev build on emulator/device
npx expo start        # Metro only
```

CI: `.github/workflows/ci.yml` runs tests and type-check on every push. `.github/workflows/android.yml` builds an APK only when started by hand (Actions tab > Android APK > Run workflow).

## Architecture rules

```
app/            Screens. expo-router file routes. No SQL, no finance maths.
src/domain/     Pure TypeScript. No React, no Expo imports. Every rule here has a test.
src/data/       db.ts (schema + migrations), repo.ts (the only file with SQL).
src/store/      Zustand store. Updates memory first, then writes through repo.ts.
src/ui/         Theme, kit.tsx components, sprites, charts, Coin3D.
tests/          node:test suites for src/domain and sprites.
```

- **Money** is an integer in minor units (paise, cents). Never a float. Format with `formatMoney`, parse with `parseAmount`.
- **Dates** are local `YYYY-MM-DD` strings. Use helpers in `src/domain/dates.ts`. Do not use `Date` arithmetic in screens.
- **Schema changes**: add a new `if (version < N)` block in `src/data/db.ts` and bump `user_version`. Never edit an existing block: users have data.
- **New finance logic** goes in `src/domain` with a test first, then the store, then the screen.
- **UI**: reuse `Screen`, `Panel`, `Button`, `Segmented`, `Stepper`, `Field`, `Row`, `ProgressBar`, `AmountPrompt`, `Txt`. Colours come from `useTheme()` only. Icons are 10x10 character grids in `src/ui/sprites.ts` (a test checks their shape). Touch targets at least 44pt.
- **Offline first**: nothing may require a network, an account or a server. FinQuest never moves money and never stores UPI PINs or bank credentials.
- **No new dependency** without a reason written in the commit message. Prefer Expo SDK packages.

## Product decisions already made (do not reopen)

- Savings rule: `start` = pay yourself first, daily limit from planned income; `end` = save what is left, daily limit from income actually received. See `src/domain/plan.ts`.
- Daily allowance is fixed for the day and recalculated the next day.
- Goal contributions fall on the 1st (`start`) or last day (`end`) of each month.
- Split-expense settlement is confirmed by hand on both sides. Confirmation codes travel as links shared over WhatsApp. No server.
- UPI: show a QR first; the `upi://pay` link is best effort because UPI apps often decline link payments to personal IDs.
- Friends without FinQuest get a WhatsApp settlement request; the owner marks it received ("confirmed by you only").
- WhatsApp reminders are one tap, not automatic: a local notification opens WhatsApp with the message pre-written. The WhatsApp Business API is out of scope.
- Art is drawn in code. Do not add copyrighted artwork or image packs without a licence that allows it.

## Working agreement

- Small commits, one concern each. Run `npm test` and `npm run typecheck` before every commit.
- Work phase by phase from `ROADMAP.md`. Tick the boxes there as you finish items.
- After a phase: update the README feature list and the "What has happened so far" section here.
- If a decision is not covered here or in the roadmap, ask the owner instead of guessing.
