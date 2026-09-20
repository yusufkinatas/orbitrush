# Orbitrush

Orbitrush is a mobile-first, one-button neon space game played in portrait orientation. The player holds to latch onto a planet's orbit, releases to launch off tangentially, and tries to survive as long as possible.

## Technical setup

- Uses Next.js, React, and TypeScript.
- Deployed on Vercel.
- The game runs on Canvas; progress and developer settings are stored in `localStorage`.

## Working principles

- The proof of concept should stay simple, fast, and mobile-focused.
- Use [mechanics.md](./mechanics.md) as the source of truth for core game behavior.
- When core mechanics change, `mechanics.md` must be updated as part of the same change.
- After making changes, run `npm run lint` and `npm test`.
