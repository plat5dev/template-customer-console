# Plat5 starter web

The web app every Plat5 starter runs beside its API. It talks to Plat5 through the **gateway** and signs in with **Plat5 Auth** (browser OAuth/PKCE redirect). Profiles, user and member API keys, orgs, members, service accounts, invite links, projects, and tasks.

Every `template-*-api` starter implements the same API (profiles, projects, tasks), so this app works with any of them. A starter's `docker-compose.yml` runs it as the `web` service from `ghcr.io/plat5dev/template-web`. A starter with its own frontend (SSR, Next.js) runs that instead.

Stack: Vite · React · TypeScript · Bootstrap 5.

## Run

With a starter, `plat5 start` runs it at `http://localhost:3001`. Sign in as `dev@example.com` / `password`.

On its own, against a running stack:

```bash
bun install
bun run dev            # http://localhost:3001
```

`:3001` is the starter contract's web port, beside the API on `:3000`. The defaults match `plat5 start`: gateway `:5400`, Auth `:5401`. Auth must allow `http://localhost:3001/callback` as a redirect URI and `http://localhost:3001` as an origin; `plat5 start` sets both.

## Image

`ghcr.io/plat5dev/template-web` serves the app on `:8080`. Settings are the container's environment, read at start, so one image serves any stack. Unset ones fall back to the defaults below. Images are built on `v*` tags.

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
