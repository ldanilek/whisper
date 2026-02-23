## Cloud-specific instructions

### Required secrets

- `CONVEX_DEPLOY_KEY` — Convex Preview Deploy Key. Generate from the Convex dashboard: Project → Settings → Deploy Keys → Preview Deploy Key.

### Overview

Whisper is a Next.js + Convex secret-sharing app. The frontend runs locally; the backend (database, serverless functions, file storage) is hosted on Convex cloud.

### Services

| Service            | Command                                     | Notes                                                                          |
| ------------------ | ------------------------------------------- | ------------------------------------------------------------------------------ |
| Next.js dev server | `npx next dev`                              | Serves at http://localhost:3000                                                |
| Convex backend | `npx convex dev --preview-name <name>`      | Watches and pushes changes to a preview deployment. Requires `CONVEX_DEPLOY_KEY`. |

### Preview Deployment (backend development)

The update script automatically creates a Convex preview deployment on startup when `CONVEX_DEPLOY_KEY` is set. It:

1. Derives a preview name from the current git branch
2. Runs `npx convex deploy --preview-create <name>` with `--cmd` / `--cmd-url-env-var-name` to write `.env.local`
3. Pushes Convex functions to the preview deployment
4. Sets `SSR_KEY=cloud-agent-ssr-key` on the preview deployment via `npx convex env set`

The `--cmd` / `--cmd-url-env-var-name` flags are on `convex deploy` (not `convex dev`). The update script uses them to write `.env.local` with the deployment URL. The Convex steps are guarded with `|| true` so failures (e.g. network restrictions) do not break startup.

After modifying any files in `convex/`, re-deploy with:

```
PREVIEW_NAME=$(git branch --show-current | tr '/' '-')
npx convex dev --preview-name "${PREVIEW_NAME:-cloud-agent}" --once
```

Alternatively, for continuous development with hot-reloading, run:

```
npx convex dev --preview-name "${PREVIEW_NAME:-cloud-agent}"
```

This watches for changes in `convex/` and automatically pushes them to the preview deployment.

### Running the frontend

```
npx next dev
```

Next.js reads `NEXT_PUBLIC_CONVEX_URL` from `.env.local` (or `.env` as fallback).

### Lint / Test / Build

- **Lint**: `npm run lint` (ESLint + Prettier)
- **Test**: `npm test` (Vitest with `convex-test`; tests run in-memory, no Convex backend needed)
- **Build**: `npm run build`

### Caveats

- `npm ci` may fail if `package-lock.json` is out of sync with `package.json`. The update script uses `npm install` instead.
- Watchpack permission warnings (e.g. `/etc/credstore`, `/root/.ssh`) in Next.js dev output are harmless and can be ignored.
- `SSR_KEY` must match between the Next.js server env and the Convex deployment env. The update script sets both to `cloud-agent-ssr-key`. Without `SSR_KEY`, the `/display` page (viewing a whisper) will error.
- The `/display` page uses SSR (`getServerSideProps`) to call `accessWhisper` with the `SSR_KEY`, so it only works when `SSR_KEY` is correctly configured on both sides.
- Cloud agent VMs may have restricted egress. If `convex deploy` or `convex dev` fails with `ECONNRESET`, Convex cloud endpoints are blocked. The frontend still starts but cannot reach the backend. Check Network Access settings in cloud agent configuration.
