# MindPal public (DayStart)

https://drwho9.github.io/mindpal/

## Currently live (`main` @ `8882f974bf9b7c3861a9942d31b55f1ae5a51571`)

Welcome hike PNG fallback (WelcomeHikePhoto) + PWA mindpal-shell-v2 from daystart #5
(`0711be5491cd7cfbd23eabad2fa978a51a621534`). Hard-refresh / clear site data once
so skipWaiting/clientsClaim and the new precache (welcome-hike.png + webp) take effect.

Served JS: `/mindpal/assets/index-a56fa88f.js`. That bundle does **not** contain
`RelationshipGoals` or a Relationship goals Today entry.

## Blocked: Relationship goals & targets (2026-09-19)

Preferred publish path failed. This environment’s GitHub token cannot read private
`DrWho9/mindpal-daystart` (GitHub REST **404** / `git ls-remote` “Repository not found”).
The token can only see public `DrWho9/mindpal`. No local daystart checkout exists here.

Intended source of truth (merged on `mindpal-daystart@main`, not rebuildable here):

- Content pack PR **#6** → `3909ffa`
- UI module PR **#7** → `3e9773c3e689928b409c01a8ff1eae22e814b55d`
  (RelationshipGoals on DayStart Today, filters, streaks, weekly focus, celebrations)

No site files were replaced and no hand-rolled RelationshipGoals UI was added.

### Unblock and publish

1. Grant the Cloud Agent / GitHub App **read** access to `DrWho9/mindpal-daystart`
   (add the private repo to the environment repository scope).
2. Clone `mindpal-daystart@main`, run `npm ci && npm run build` (Vite base `/mindpal/`).
3. Replace this site’s served files with `dist/` (keep `.nojekyll` if present).
4. Confirm `RelationshipGoals` and a Today entry exist in the built JS assets.
   Report the new commit SHA. Do not commit `.env` secrets.
