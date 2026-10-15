# Web app

Your customers' web app. It talks to Plat5 through the **gateway** and signs in with **Plat5 Auth** (browser OAuth/PKCE redirect): profile, user and member API keys, organizations, members, service accounts, invite links, projects, and tasks.

`plat5 init` copies it into a project's `web/` folder, beside the API starter. Every `template-*-api` starter implements the same API (profiles, projects, tasks), so it works with any of them. It is a starting point the project owns: change anything.

Stack: Vite · React · TypeScript, with plain CSS: design tokens and a small set of components, no UI framework.

## Look

The look is plat5.com's: paper and ink, Inter and JetBrains Mono, light or dark from the system or the switch in the sidebar. The accent is violet, and a `starter` tag sits beside the wordmark, so a fresh app does not pass for Plat5's own product.

To make it yours, change the `--accent-*` lines in `src/styles/tokens.css` (light at the top, dark in the two blocks below), and swap `src/components/Wordmark.tsx` and `public/favicon.svg` for your own. Components are in `src/styles/ui.css`; status is shown by shape (filled, hollow, struck), so no status color fights your accent.

## Run

`plat5 start` runs it at `http://localhost:3001`, with this folder mounted into the Vite dev server: edit a file and the page reloads. Sign in as `dev@example.com` / `password`.

On your own machine instead, against a running stack (`plat5 start -x app`):

```bash
bun install
bun run dev            # http://localhost:3001
```

`:3001` is beside the API on `:3000`. The defaults match `plat5 start`: gateway `:5400`, Auth `:5401`. Auth must allow `http://localhost:3001/callback` as a redirect URI and `http://localhost:3001` as an origin; `plat5 start` sets both (`app.web` in `plat5.yml`).

## Layout

```
src/
  pages/        one per route (App.tsx); Layout.tsx is the sidebar
  styles/       tokens.css (colors, type, the accent) and ui.css (components)
  api/          endpoints.ts: every call, user and org routes
  auth/         sign-in (PKCE), the user token
  org/          the active org, and its member session
  components/   panels the pages share
  learn/        the "How it works" page: how Plat5 does each page, and two probes
```

To add a page: a file in `src/pages/`, a route in `src/App.tsx`, a link in `src/components/Layout.tsx`. Organization routes send the member session (`listProjects` in `src/api/endpoints.ts`).

To drop the teaching material: delete `src/learn/`, its route in `src/App.tsx`, and its link in `src/components/Layout.tsx`.

## Image

For production, the Dockerfile's last stage builds the app and serves it with nginx on `:8080`; `ghcr.io/plat5dev/template-web` is that image. Settings are the container's environment, read at start, so one image serves any stack. Unset ones fall back to the defaults below. Images are built on `v*` tags.

| Container env | Build-time (`bun run dev`) | Default |
|---------------|----------------------------|---------|
| `GATEWAY_URL` | `VITE_GATEWAY_URL` | `http://localhost:5400` |
| `AUTH_ISSUER` | `VITE_AUTH_ISSUER` | `http://localhost:5401` |
| `AUTH_CLIENT_ID` | `VITE_AUTH_CLIENT_ID` | `plat5` |
| `AUTH_REDIRECT_URI` | `VITE_AUTH_REDIRECT_URI` | `{window.location.origin}/callback` |
| `AUTH_AUDIENCE` | `VITE_AUTH_AUDIENCE` | (unset) |
| `AUTH_USER_ID_CLAIM` | `VITE_AUTH_USER_ID_CLAIM` | `properties.user_id` (the gateway's `AUTH_USER_ID_CLAIM`) |

## What it shows

Sign in → Auth password UI (locally, the seeded `dev@example.com` / `password`; or register, with login codes in the Auth logs) → profile / user API keys / orgs (member session, members, copy-invite-link, service accounts and their keys, your member keys, session probe) / projects / tasks.

The browser does not send subject ids. User routes use the user JWT (`Authorization: Bearer`). Opening an org mints a member session (`POST /user/organizations/{id}/session`). Organization and member routes, including `/org/projects`, send that token as `X-API-Key`, not the user JWT. The gateway fills the subject into the path. A user JWT on those routes is 401. Not an active member → session mint 404; the app does not then call `/org`.

Roles: with roles on (`roles.yml`, applied to the control plane), the org page shows your role and its labels (from the session mint), a role picker on invite, add-member, and service-account create, and role / status / remove on other members (`PATCH` / `DELETE /org/members/{id}`). Controls whose label you lack are disabled; the gateway still decides, and a 403 names the `required_labels`. With roles off, members have no role, every member holds every label, and the role controls are hidden.

Invite copy-link is `{origin}/login?invite={token}`. Already signed in: redeem immediately (skip PKCE). Else the app stashes the token in a first-party cookie (`plat5_web_demo_invite`) plus an origin stash keyed by OAuth CSRF `state`, strips the query so Referer to Auth cannot leak it, starts PKCE (Auth `/authorize` does **not** get `invite=`; token never in OAuth `state`), then `POST /user/invites/redeem` with `{ "token" }` and the user JWT. Cookie/stash clear only after a successful redeem. Adding by IdP subject (shown on the Profile page) still works. Email is unbound. No SMTP.

## Auth notes

Plat5 Auth (OpenAuth) returns **access + refresh** tokens (no `id_token`). This app uses authorization-code + **PKCE** against `/authorize` and `/token`, not a full OIDC client library.

User routes send `Authorization: Bearer <access_token>`. Organization and member routes send the member session (or a member key) as `X-API-Key`. Do not send both headers on one call. The browser does not send subject ids; the gateway fills the subject into the path. User API keys cover user routes only.

**JWT `iss` must match gateway `AUTH_ISSUER` exactly.**  
`http://localhost:5401` ≠ `http://127.0.0.1:5401`. Use the same host string in:

- browser Auth URL (`VITE_AUTH_ISSUER`)
- gateway `AUTH_ISSUER`

Mismatch → `401` with `details.reason=invalid_issuer`.

## Boundaries

No monorepo imports. Wire by published URLs / env only.

## License

MIT — see [LICENSE](LICENSE).
