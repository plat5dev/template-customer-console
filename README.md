# Plat5 web demo

Sample **SPA** that talks to Plat5 through the **gateway** and signs in with **Plat5 Auth** (browser OAuth/PKCE redirect). Not a template or product — dogfood UI for profiles, user/member API keys, orgs/members/service accounts, copy-invite-link, projects, and tasks.

Stack: Vite · React · TypeScript · Bootstrap 5.

## Prerequisites

1. **Plat5 Auth** on `:5000` with SPA allowlists (`plat5 init --auth` writes these to `plat5.yml` `auth.allowed_*`; the issuer's own `AUTH_ALLOWED_ORIGINS` default is empty):

   ```bash
   AUTH_ALLOWED_CLIENTS=plat5
   AUTH_ALLOWED_REDIRECT_URIS=http://localhost:5173/callback,https://oauth.pstmn.io/v1/callback
   AUTH_ALLOWED_ORIGINS=http://localhost:5173
   ```

   Auth: [`plat5dev/auth`](https://github.com/plat5dev/auth).

2. **Plat5** gateway on `:5001`. Empty `ALLOWED_ORIGINS` is fine locally (`*`).

3. A backend behind gateway routes for profiles / projects / tasks (e.g. a template API on `:3000` with routes applied).

## Run

```bash
cp .env.example .env   # optional; defaults match local ports
bun install
bun run dev            # http://localhost:5173
```

Sign in → Auth password UI (login codes in Auth issuer logs only when Auth runs with `AUTH_DEV_MODE=true` and SMTP is unset) → profile / user API keys / orgs (member session, members, copy-invite-link, service accounts and their keys, your member keys, session probe) / projects / tasks.

The browser does not send subject ids. User routes use the user JWT (`Authorization: Bearer`). Opening an org mints a member session (`POST /user/organizations/{id}/session`). Organization and member routes, including `/org/projects`, send that token as `X-API-Key`, not the user JWT. The gateway fills the subject into the path. A user JWT on those routes is 401. Not an active member → session mint 404; the app does not then call `/org`.

Roles: with a roles file (`roles.yml`), the org page shows your role and its labels (from the session mint), a role picker on invite, add-member, and service-account create, and role / status / remove on other members (`PATCH` / `DELETE /org/members/{id}`). Controls whose label you lack are disabled; the gateway still decides, and a 403 names the `required_labels`. With roles off, members have no role, every member holds every label, and the role controls are hidden.

Invite copy-link is `{origin}/login?invite={token}`. Already signed in: redeem immediately (skip PKCE). Else the app stashes the token in a first-party cookie (`plat5_web_demo_invite`) plus an origin stash keyed by OAuth CSRF `state`, strips the query so Referer to Auth cannot leak it, starts PKCE (Auth `/authorize` does **not** get `invite=`; token never in OAuth `state`), then `POST /user/invites/redeem` with `{ "token" }` and the user JWT. Cookie/stash clear only after a successful redeem. Adding by IdP subject (shown on the Profile page) still works. Email is unbound. No SMTP.

## Env

| Variable | Default |
|----------|---------|
| `VITE_GATEWAY_URL` | `http://localhost:5001` |
| `VITE_AUTH_ISSUER` | `http://localhost:5000` |
| `VITE_AUTH_CLIENT_ID` | `plat5` |
| `VITE_AUTH_REDIRECT_URI` | `{window.location.origin}/callback` |
| `VITE_AUTH_AUDIENCE` | (unset) |
| `VITE_AUTH_USER_ID_CLAIM` | `properties.user_id` (the gateway's `AUTH_USER_ID_CLAIM`) |

## Auth notes

Plat5 Auth (OpenAuth) returns **access + refresh** tokens (no `id_token`). This app uses authorization-code + **PKCE** against `/authorize` and `/token`, not a full OIDC client library.

User routes send `Authorization: Bearer <access_token>`. Organization and member routes send the member session (or a member key) as `X-API-Key`. Do not send both headers on one call. The browser does not send subject ids; the gateway fills the subject into the path. User API keys cover user routes only.

**JWT `iss` must match gateway `AUTH_ISSUER` exactly.**  
`http://localhost:5000` ≠ `http://127.0.0.1:5000`. Use the same host string in:

- browser Auth URL (`VITE_AUTH_ISSUER`)
- gateway `AUTH_ISSUER`

Mismatch → `401` with `details.reason=invalid_issuer`.

## Boundaries

No monorepo imports. Wire by published URLs / env only.

## License

MIT — see [LICENSE](LICENSE).
