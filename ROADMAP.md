# FinQuest roadmap

Work top to bottom. Each phase builds on the one before it. Tick boxes as items land.
Agents: read `CLAUDE.md` first for rules, commands and decisions already made.

| Phase | What | Status |
| --- | --- | --- |
| 0 | v0.1 code written (transactions, plan, goals, budgets, analytics, themes) | Done, untested on device |
| 1 | First device build and smoke test | **In progress**: builds and runs on an emulator, checklist partly walked |
| 2 | Recurring transactions, custom categories, custom month start | 2a, 2b and 2c written and unit-tested, not device-tested |
| 3 | Accounts and transfers | |
| 4 | Backup, restore, CSV import | |
| 5 | Split expenses | |
| 6 | Settle up: UPI QR, two-sided confirmation, WhatsApp requests and reminders | |
| 7 | Bill and budget reminders, app lock | |
| 8 | Reports, quarter view, appearance options | |
| 9 | Widget, receipt photos, tags | |

Every phase follows the same path: **schema migration -> domain functions with tests -> repo -> store -> screens -> README**.

---

## Phase 1: make it run

Steps and the smoke checklist are in `CLAUDE.md` ("Your first job").

- [x] App builds and opens on an Android emulator
- [ ] Smoke checklist passes
- [x] `package-lock.json` committed
- [ ] Manual "Android APK" workflow produces an installable APK

**Done when:** a fresh clone runs with `npm install && npx expo run:android` and every checklist item passes.

---

## Phase 2: daily-use basics

### 2a. Recurring transactions

Rent, salary and subscriptions that log themselves.

- Schema (migration 2): `recurring (id, type, amount, category_id, note, frequency, interval, anchor_date, end_date, last_run_date, active)`. `frequency` is `daily | weekly | monthly | yearly`.
- Domain: `src/domain/recurring.ts`
  - `dueDates(rule, from, to): ISODate[]` (monthly rules on the 29th-31st clamp to the last day)
  - `materialize(rules, today): { transactions, updatedRules }` creates every missed occurrence since `last_run_date`
- Store: run `materialize` once in `hydrate()` and when the app returns to the foreground.
- Screens: "Repeat" option on the transaction form; `app/recurring.tsx` list with pause, edit, delete; link from More.
- Tests: month-end clamping, catch-up after 3 months closed, end date respected, paused rules skipped.

- [ ] Migration and repo
- [ ] Domain and tests
- [ ] Form option and list screen

**Done when:** a monthly rent rule created last month shows one transaction for each month on next launch, never duplicates.

### 2b. Custom categories

- Schema (migration 3): `categories (id, name, sprite, color, type, sort, archived)`. Seed from `src/domain/categories.ts` on first run so existing `category_id` values keep working.
- `getCategory` moves from a constant lookup to a store selector; unknown ids still fall back to "Other".
- Screens: `app/categories.tsx` (add, rename, pick sprite and colour, reorder, archive). Archived categories stay on old transactions but leave the picker.

- [ ] Migration with seed
- [ ] Store-backed lookup everywhere `getCategory` is used
- [ ] Manage screen

### 2c. Custom month start day

For people paid on, say, the 25th.

- Setting: `monthStartDay` (1-28, default 1).
- Domain: `cycleFor(date, startDay): { start, end }` in `dates.ts`; `plan.ts`, month analytics, budgets and goal contribution dates use the cycle instead of the calendar month.
- Tests: startDay 25 on Nov 11 gives Oct 25 - Nov 24; days-left and allowance follow.

- [ ] Domain and tests
- [ ] Setting in Savings Plan screen
- [ ] Month labels show the range when startDay is not 1

---

## Phase 3: accounts and transfers

- Schema (migration 4): `accounts (id, name, kind, opening_balance, archived)` with `kind` in `cash | bank | card | wallet`; add `account_id` to `transactions` (existing rows go to a default "Cash" account); `transfers (id, from_account, to_account, amount, date, note)`.
- Domain: `balances(accounts, transactions, transfers)`. Transfers are neither income nor expense and must not appear in analytics.
- Screens: account picker on the transaction form; `app/accounts.tsx`; Transfer quick action on Home (it is in the design mockup).
- Tests: balances with transfers, analytics unchanged by transfers, archived account keeps history.

- [ ] Migration with default account
- [ ] Domain and tests
- [ ] Accounts screen, picker, transfer form

**Done when:** total balance on Home equals the sum of account balances, and moving money between accounts changes neither income nor expense.

---

## Phase 4: backup, restore, CSV import

- Backup: one JSON file `{ app: "finquest", schema: N, exportedAt, data: {...every table} }` written with `expo-file-system` and shared with `expo-sharing`.
- Restore: pick with `expo-document-picker`, validate `app` and `schema`, migrate older schemas forward, confirm, then replace everything in one SQLite transaction.
- CSV import: accept the app's own export format first; map unknown categories to "Other"; show a preview with row count and skipped rows before importing.
- Domain: `src/domain/backup.ts` (`serialize`, `parse`, `validate`) and `parseCSV` in `csv.ts`. Both pure and tested, including malformed input.

- [ ] Backup and restore
- [ ] CSV import with preview
- [ ] "Last backup" date shown in Settings

**Done when:** backup on one phone, restore on another, and every screen shows the same numbers.

---

## Phase 5: split expenses

### Data (migration 5)

```
people       (id, name, phone, upi_id, is_me)
groups       (id, name, secret, created_at)          -- secret signs settlement codes
group_members(group_id, person_id)
splits       (id, group_id, transaction_id, paid_by, total, date, note)
split_shares (split_id, person_id, amount)            -- amounts sum to total
settlements  (id, group_id, from_person, to_person, amount, mode, upi_ref,
              state, payer_confirmed_at, receiver_confirmed_at, created_at)
```

### Domain: `src/domain/split.ts`

- `splitEqual(total, n)`: distributes leftover paise so shares always sum to the total
- `splitByShares(total, weights)`, `splitExact(total, amounts)` (rejects a mismatch)
- `netBalances(splits, settlements)`: per person, positive = is owed
- `simplifyDebts(balances)`: fewest payments that clear everyone
- Only **settled** settlements reduce a balance.

### Accounting rule

When you pay 3,000 for three people: your expense is 1,000 (your share). The other 2,000 is a receivable, not spending, and must not inflate analytics or budgets.

### Screens

- `app/people.tsx`: add from scratch (name, phone, UPI ID). Contact-book import is optional and later.
- `app/groups.tsx`, `app/group.tsx`: members, expenses, "who owes whom".
- "Split this" toggle on the transaction form: pick group, payer, split type.

- [ ] Migration and repo
- [ ] Domain and tests (rounding, three-way cycles, partial settlements)
- [ ] People and group screens
- [ ] Split option on the transaction form

**Done when:** a 1,000 bill split three ways shows shares of 333.34 / 333.33 / 333.33, and balances net to zero after all are settled.

---

## Phase 6: settle up

FinQuest is free and offline: no UPI API, no server. It never moves money and never sees a bank confirmation. Both people confirm by hand.

### 6a. Paying

1. Payer taps **Settle**, picks a mode: UPI, cash, bank transfer.
2. UPI shows the receiver's QR (`upi://pay?pa=<id>&pn=<name>&am=<amount>&cu=INR&tn=<note>`) plus **Copy UPI ID** and a best-effort **Open UPI app** button. The QR is the main path: UPI apps often decline link payments to personal IDs. Do not treat any value returned by a UPI app as proof of payment.
3. Payer taps **I've paid**, optionally enters the UPI reference number.

Needs a QR renderer. Draw it with plain views like the pixel donut, using a small pure-JS QR encoder (new dependency: justify in the commit).

### 6b. Two-sided confirmation

States: `requested -> paid -> settled` (also `rejected`, `cancelled`).

- **I've paid** builds a link `finquest://settle?d=<payload>&s=<sig>` and opens WhatsApp to the receiver with it (`https://wa.me/<phone>?text=...`).
- Payload: settlement id, group id, from, to, amount, state, timestamp. `sig` = HMAC of the payload with the group secret. A link with a bad signature or an unknown group is refused with a clear message.
- Receiver opens the link in FinQuest (handled by expo-router via the `finquest` scheme already in `app.json`), checks their bank, taps **I received it** or **Not received**. That sends a reply link back the same way.
- The debt is `settled` only when both confirmations exist on that phone. Opening the same link twice changes nothing.
- Joining a group works the same way: an invite link carries the group, members and secret.

Domain: `src/domain/settle.ts` with `encode`, `decode`, `verify`, `nextState(current, event)`. Tests: tampered amount rejected, replay ignored, out-of-order links handled.

### 6c. Friends without FinQuest

- **Settlement request**: WhatsApp opens with a ready message: the expense, their share, your UPI ID and a `upi://pay` link.
- When they pay, you tap **Mark received**. Stored as `settled` with only `receiver_confirmed_at`, shown as "confirmed by you only".

### 6d. Reminders to people who owe

- Per unpaid balance: remind every N days, or on a date. Schema: `reminders (id, person_id, group_id, every_days, next_at, active)`.
- `expo-notifications` schedules a **local** notification: "Remind Ravi about Rs 500 for Goa trip". Tapping it opens WhatsApp with the reminder pre-written. The owner presses send.
- Automatic sending is out of scope (needs the paid WhatsApp Business API, a server and opt-in).
- Reminders cancel themselves when the balance reaches zero.
- Message templates live in `src/domain/messages.ts`, tested, with the amount formatted in the group's currency.

- [ ] UPI QR and pay sheet
- [ ] Settlement codes, deep-link handler, state machine and tests
- [ ] WhatsApp settlement request for non-users
- [ ] Reminder schedule and notifications
- [ ] "Awaiting confirmation" and "Confirmed by you only" badges

**Done when:** two phones settle a debt end to end using only WhatsApp links, a tampered link is refused, and a reminder notification opens WhatsApp with the right text.

---

## Phase 7: reminders and app lock

- Bill reminders from recurring rules ("Rent due tomorrow"); budget alerts at 80% and 100%; optional daily "log your spending" nudge that protects the streak. All local notifications, each with its own switch.
- App lock: `expo-local-authentication` for biometrics plus a PIN fallback stored hashed in `expo-secure-store`. Lock on launch and after 1 minute in the background. Hide content in the app switcher.

- [ ] Notification settings screen
- [ ] Bill, budget and streak notifications
- [ ] PIN and biometric lock

---

## Phase 8: reports and appearance

- Reports (from the design mockup): Monthly Summary, Category Report, Trend Analysis as screens under More, built on existing `src/domain/analytics.ts`.
- Quarter view in Analytics: add `quarter` to `PeriodKind` (`inPeriod`, `shiftPeriod`, `periodLabel`, `series`).
- Appearance: accent colour picker and pixel density (compact / normal / large) scaling type and spacing through the theme.
- Excel export is optional; CSV already covers it.

- [ ] Three report screens
- [ ] Quarter period with tests
- [ ] Accent colour and density

---

## Phase 9: nice to have

- [ ] Android home-screen widget: "Safe to spend today"
- [ ] Receipt photo on a transaction (stored in app files, included in backups)
- [ ] Tags and tag filter
- [ ] iOS pass: build, safe areas, share sheet, App Store metadata
- [ ] Component tests and one end-to-end smoke test (Maestro)

---

## Out of scope (by decision)

- Moving money, storing UPI PINs or bank credentials
- A sync server or accounts
- Automatic WhatsApp sending
- Reading SMS to detect payments (may be revisited as an opt-in Android feature)
