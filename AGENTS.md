## Cloud-specific instructions

### Overview

Whisper is a Next.js + Convex secret-sharing app. The frontend runs locally; the backend is hosted on Convex cloud.

### Services

| Service | Command | Notes |
|---------|---------|-------|
| Next.js dev server | `npx next dev` | Serves at http://localhost:3000 |
| Convex backend | `npx convex dev` | Syncs functions to Convex cloud; requires Convex auth. See `npm run dev` which runs both concurrently. |

### Running

- `npm run dev` starts both Next.js and Convex dev sync via `concurrently`.
- If you only need the frontend (e.g. the Convex cloud backend at the URL in `.env` is already deployed), run `npx next dev` alone.
- The `.env` file contains `NEXT_PUBLIC_CONVEX_URL` pointing to the deployed Convex backend.

### Lint / Test / Build

- **Lint**: `npm run lint` (ESLint + Prettier)
- **Test**: `npm test` (Vitest with `convex-test`; tests run in-memory, no Convex backend needed)
- **Build**: `npm run build`

### Caveats

- `npm ci` may fail if `package-lock.json` is out of sync with `package.json`. Use `npm install` to regenerate it first.
- Watchpack permission warnings (e.g. `/etc/credstore`, `/root/.ssh`) in Next.js dev output are harmless and can be ignored.
- `convex dev` requires Convex CLI authentication. Without it, the frontend still works if `NEXT_PUBLIC_CONVEX_URL` points to an already-deployed backend.
