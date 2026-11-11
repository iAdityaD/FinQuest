# FinQuest roadmap

Order matters: each phase builds on the one before it.

| Phase | What | Why here |
| --- | --- | --- |
| 1 | First device build, fix what breaks, commit the lockfile | Nothing else is safe until the app runs |
| 2 | Recurring transactions, custom categories, custom month start day | Daily-use basics |
| 3 | Accounts (cash, bank, card) and transfers | Split and settle need accounts underneath |
| 4 | Backup and restore to a file, CSV import | Protects data before it gets more complex |
| 5 | Split expenses: people, groups, split types, balances | Core of the social feature |
| 6 | Settle up: UPI QR, two-sided confirmation, WhatsApp requests and reminders | Builds on phase 5 |
| 7 | Bill and budget reminders, app lock (PIN / biometrics) | Uses the notification work from phase 6 |
| 8 | Reports pages, quarter view, accent colour, pixel density | Polish |
| 9 | Home-screen widget, receipt photos, tags | Nice to have |

## Split expenses (phase 5)

- **People**: name, phone number (for WhatsApp), UPI ID (optional). Stored on the device only.
- **Groups**: a named set of people (flat, trip, office lunch).
- **Split types**: equal, exact amounts, shares or percentages.
- **Balances**: who owes whom, simplified so each pair settles with one payment.
- Your own share of a split counts as a normal expense in budgets and analytics; the rest is money owed to you, not spending.

## Settle up (phase 6)

FinQuest is free and offline. It has no UPI API and no server, so it never moves money and never sees a bank confirmation. Both people confirm by hand.

### Paying

1. The payer taps **Settle** and picks a mode: UPI, cash or bank transfer.
2. For UPI the app shows the receiver's UPI QR with the amount filled in, plus **Copy UPI ID** and a best-effort **Open UPI app** button. The QR is the main path: UPI apps often decline link-initiated payments to personal (non-merchant) UPI IDs.
3. The payer pays in the app of their choice, taps **I've paid** and can enter the UPI reference number.

### Two-sided confirmation

A settlement has three states: `requested` -> `paid (awaiting confirmation)` -> `settled`.

- The payer's **I've paid** creates a short settlement code and opens WhatsApp with a message to the receiver containing a `finquest://settle?...` link.
- The receiver opens the link in FinQuest, checks their bank or UPI app, and taps **I received it**. That sends a confirmation link back the same way.
- Only when both sides have confirmed is the debt marked `settled` on both phones.
- Codes carry the group, amount, payer, receiver and a checksum made with a secret shared when the group was created, so an edited link is rejected.

### Friends without FinQuest

- **Settlement request**: WhatsApp opens with a ready message: what the expense was, their share, your UPI ID and a UPI payment link they can tap.
- When they pay, you mark it received yourself. It is recorded as **confirmed by you only**.

### Reminders for people who owe money

- Each unpaid split can have a reminder schedule (for example every 3 days, or on a chosen date).
- FinQuest raises a local notification on your phone: "Remind Ravi about Rs 500 for Goa trip". Tapping it opens WhatsApp with the reminder already written; you press send.
- Fully automatic sending is not possible in a free offline app: it needs the paid WhatsApp Business API, a server, and the other person's opt-in. This is a deliberate non-goal.
- Reminders stop when the debt is settled.

### Out of scope

- Moving money, storing UPI PINs or bank credentials.
- Reading SMS or notifications to detect payments (possible later as an opt-in Android feature).
- A sync server.
