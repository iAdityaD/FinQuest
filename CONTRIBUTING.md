# Contributing to FinQuest

Thanks for helping out.

1. Fork, then create a branch from `main`.
2. `npm install && npx expo install --fix`
3. Make your change. Keep finance logic in `src/domain` (pure TypeScript, no React) and add a test in `tests/`.
4. Run `npm test` and `npm run typecheck`.
5. Open a pull request that says what changed and why. Add a screenshot for UI changes.

Ground rules:

- FinQuest is offline-first. Do not add anything that needs a network or an account to work.
- Money is stored as integers in minor units. Dates are `YYYY-MM-DD` strings.
- Schema changes go in a new migration block in `src/data/db.ts`. Never edit an existing one.
- Reuse the components in `src/ui/kit.tsx` and the theme colours so every screen keeps the pixel look.
