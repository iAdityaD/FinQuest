# FinQuest

An offline, pixel-style personal finance tracker. Log what you spend, set savings goals, and let the app tell you how much you can spend today and still hit your target.

Built with React Native (Expo). Android first, iOS from the same codebase. No account, no server: all data lives in a SQLite file on the device.

> **Status: v0.1, first cut.** The finance logic is unit tested. The app itself has not yet been run on a device, so expect to fix small things on the first build. See [Known gaps](#known-gaps).

## Features

- **Transactions**: add, edit and delete income and expenses with category, date and note. Search and filter by month.
- **Repeating transactions**: rent, salary and subscriptions that log themselves every day, week, month or year, and catch up on any they missed while the app was closed. Pause, edit or stop them under More > Repeating.
- **Your own categories**: add, rename, reorder and archive categories, each with its own icon and chart colour. Archived ones stay on old transactions.
- **Your own month start**: paid on the 25th? Set the day your month starts in the savings plan; budgets, analytics and the daily limit then run from pay day to pay day.
- **Savings plan**: set a monthly income and a monthly savings target. FinQuest shows a **safe to spend today** amount that keeps you on target, and adjusts it every day.
- **Start or end of month rule**: choose when savings are set aside (see below).
- **Goals**: save towards something with an optional target date. Each goal shows how much to put in per month and per day.
- **Analytics by day, month and year**: totals, a category donut, income and expense bars, and a plain-language guide (budget warnings, savings rate, biggest category, no-spend days).
- **Budgets**: an overall monthly limit plus limits per category.
- **Game layer**: logging streak, XP, levels and daily quests.
- **Extras**: three pixel themes, five currencies (Indian digit grouping for INR), CSV export, demo data, a three.js coin you can tap.

## How the savings rule works

| Rule | What it means | Daily limit is based on |
| --- | --- | --- |
| Start of month | Pay yourself first. Savings are reserved on day 1. | Planned monthly income (or actual, if higher) |
| End of month | Save what is left. Savings are moved on the last day. | Income actually received this month |

```
daily allowance = (income basis - savings target - spent before today) / days left in the month
```

The allowance is fixed for the day. Overspend today and tomorrow's allowance shrinks; underspend and it grows. Goals follow the same rule: contributions fall on the 1st or the last day of each month until the target date.

## Run it

Requires Node 22.13 or newer and Android Studio (or a phone with USB debugging).

```sh
npm install
npx expo install --fix    # aligns native package versions with the Expo SDK
npx expo run:android      # builds and installs a development build
```

`npx expo start` with Expo Go also works once Expo Go supports SDK 58. For iOS, run `npx expo run:ios` on a Mac.

```sh
npm test            # unit tests for the finance logic
npm run typecheck   # TypeScript
```

## Project layout

```
app/            Screens (expo-router, file-based routes)
  (tabs)/       Home, Transactions, Analytics, Budget, More
src/domain/     Pure TypeScript: dates, money, analytics, plan, goals, insights, game. No React, fully tested.
src/data/       SQLite schema, migrations and the repository (the only place with SQL)
src/store/      Zustand store: in-memory state, written through to SQLite
src/ui/         Theme, pixel UI kit, sprites, charts, three.js coin
tests/          node:test suites
```

Rules that keep it easy to scale:

- Amounts are integers in minor units (paise, cents). Never floats.
- Dates are local `YYYY-MM-DD` strings. No timezone maths.
- Screens never touch SQL; they call the store. To sync or swap storage later, replace `src/data/repo.ts`.
- New finance rules go in `src/domain` with a test.
- Sprites are 10x10 character grids in `src/ui/sprites.ts`. No image assets needed.

## Known gaps

- First run on an Android emulator: 12 Nov 2026. The smoke checklist in `CLAUDE.md` is only partly walked, and repeating transactions and the custom month start are unit-tested but not yet tried on a device.
- No date picker: dates are stepped with arrows.
- Money added to a goal is tracked on the goal only; it is not a transaction.

## Roadmap

See [ROADMAP.md](ROADMAP.md): recurring transactions, accounts, backup, split expenses with UPI settle-up and WhatsApp reminders, app lock and more.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Licensed under [MIT](LICENSE).
