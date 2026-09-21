# Tip-deploy checklist (Pages cache)

After **every** GitHub Pages tip deploy, Hands and users must drop the old service-worker shell. The first load can keep a stale SW and show the previous hashed bundle (seen after #31 Feelings and #36 Reflect tip-fix: `index-3cb5ea74` / `index-293ac69a` / `index-c020c8c9`).

## After deploy

1. Confirm tip `index.html` / `sw.js` point at the **new** hashed JS — not the last tip hash.
2. On the device that smokes tip, do **one** of:
   - **Clear site data** for `/mindpal/` (Application → Storage → Clear site data), then reload, **or**
   - **Hard refresh** with a new query: `https://<host>/mindpal/?cb=<new>` (this branch: `?cb=shell-v5`).
3. View-source / Network: the script must be the new `assets/index-….js`. If you still see the previous hash, the SW shell won — clear site data and retry.

## Service worker prefix

Bump the Workbox precache prefix when tip hashes change so old shells are not reused. `#35` shipped `mindpal-shell-v4`. This branch is **`mindpal-shell-v5`** (past that conflict). `registerSW.js` calls `reg.update()` and, on controller change, reloads with `?cb=shell-v5` if `cb` is missing.
