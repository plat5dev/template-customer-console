# Customer console

Your customers' console. It talks to Plat5 through the **gateway** and signs in with **Plat5 Auth** (browser OAuth/PKCE redirect): profile, personal API keys, organizations, their projects and their environments, who has access to each, members, invite links, service accounts and their keys, audit logs, and tasks.

`plat5 init` copies it into a project's `customer-console/` folder, beside the API starter. Every `template-*-api` starter implements the same API (tasks inside an environment, and the person's profile), so it works with any of them. It is a starting point the project owns: change anything.

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

`:3001` is beside the API on `:3000`. The defaults match `plat5 start`: gateway `:5400`, Auth `:5401`. Auth must allow `http://localhost:3001/callback` as a redirect URI and `http://localhost:3001` as an origin; `plat5 start` sets both from `app.web` in `plat5.dev.yml`. The gateway must allow the origin too, in `plat5.yml`:

```yaml
cors:
  allowed_origins: ["http://localhost:3001"]
```

## Layout

```
src/
  pages/        one per route (App.tsx); Layout.tsx is the sidebar
  styles/       tokens.css (colors, type, the accent) and ui.css (components)
  api/          endpoints.ts: every call; tree.ts: the kinds, paths and default permissions
  auth/         sign-in (PKCE), the token, the pending invite
  org/          the org switcher's list, and the node in view (NodeScope)
  components/   panels the pages share
  learn/        the "How it works" page, and two probes
```

The app's paths are the gateway's, by slug: `/user`, `/user/keys`, `/orgs/{organization}/…`, `/orgs/{organization}/projects/{project}/…` and `…/envs/{environment}/…`, with each section a sub-path (`members`, `bindings`, `service-accounts`, `invites`, `audit-events`, `settings`). `src/api/tree.ts` holds the kinds as `plat5.yml` declares them (`organization` at `/orgs`, `project` at `/projects`, `environment` at `/envs`), with how the app shows each: its home page, its names, and whether service accounts and invites belong there. `src/App.tsx` builds each kind's routes from it, and the sidebar its switchers and pages; change it with the kinds.

To add a page: a file in `src/pages/`, a route in `src/App.tsx`, a link in `src/components/Layout.tsx`. A page inside a node reads it with `useNodeView()` (`src/org/nodeView.ts`): its path, and your membership there. `NodeScope` loads it, at each kind's level of the routes.

To drop the teaching material: delete `src/learn/`, its route in `src/App.tsx`, and its link in `src/components/Layout.tsx`.

## Image

For production, the Dockerfile's last stage builds the app and serves it with nginx on `:8080` (`docker build -t my-console .`). Settings are the container's environment, read at start, so one image serves any stack. Unset ones fall back to the defaults below.

| Container env | Build-time (`bun run dev`) | Default |
|---------------|----------------------------|---------|
| `GATEWAY_URL` | `VITE_GATEWAY_URL` | `http://localhost:5400` |
| `AUTH_ISSUER` | `VITE_AUTH_ISSUER` | `http://localhost:5401` |
| `AUTH_CLIENT_ID` | `VITE_AUTH_CLIENT_ID` | `plat5` |
| `AUTH_REDIRECT_URI` | `VITE_AUTH_REDIRECT_URI` | `{window.location.origin}/callback` |
| `AUTH_AUDIENCE` | `VITE_AUTH_AUDIENCE` | (unset) |
| `AUTH_SUBJECT_CLAIM` | `VITE_AUTH_SUBJECT_CLAIM` | `properties.user_id` (the gateway's `AUTH_SUBJECT_CLAIM`) |

## What it shows

Sign in → Auth password UI (locally, the seeded `dev@example.com` / `password`; or register, with login codes in the Auth logs) → your profile and keys, your orgs, and inside an org: projects, members, access, service accounts, invites, the audit log and settings; inside a project: its environments, access, invites, the audit log and settings; inside an environment: tasks, access, service accounts, invites, the audit log and settings.

**One credential.** Every call sends the person's Auth token as `Authorization: Bearer`. The same token reaches every org they're in; there are no sessions. The browser never sends ids for the caller: the gateway resolves the person from the token and the node from the path.

**The person.** `GET /user` is the account; the name comes from the IdP's name claim, so the app doesn't edit it. `DELETE /user` deletes the account. `/user/keys` are personal keys, sent as `Authorization: Bearer` too. `GET /user/audit-events` is the person's own log. The profile (`/user/profile`, a bio) is your API's.

**Orgs.** The switcher is `GET /user/nodes?kind=organization`; each node carries its `ancestors`, and the app builds its links from them. `POST /orgs` creates one. Deleted orgs are `GET /user/nodes?kind=organization&status=deleted`, restorable until `purge_after` with `POST /orgs/{organization}/restore`. Projects and environments in orgs the person can't open (a guest's) are `GET /user/nodes`, every kind, showing the highest node on each path.

**Where you are.** The sidebar is a chain of switchers, one per kind: the org, then a project in it, then an environment in that, each a menu of the ones you can see. Below them are the pages of the innermost node in the path. Picking the one you're in opens it, which is how you go back up a level.

**What you can do here.** Each node's pages load `GET …/membership`: your member id (to mark "you"), your roles there (badges, and "Guest" for a guest), and your permissions. Buttons for routes your permissions don't reach are hidden or disabled; the gateway still decides. The permission names are identity's and audit's defaults, in `src/api/tree.ts`.

**Projects and environments** are `GET`/`POST /orgs/{organization}/projects` and `…/projects/{project}/envs` (the lists walk `has_more`), renamed and deleted on the node, with `?status=deleted` and `POST …/restore`. Creating a project also creates its `Production` and `Development` environments (`DEFAULT_ENVIRONMENTS` in `src/api/tree.ts`), which takes `environment:create`. An environment's tasks are your API's.

**Access** is `GET …/bindings`, in two parts: the roles given here, which you change and remove, and the inherited ones, given on a node above, each with a link to where it sits. Service accounts are beside people, guests marked. The starters' projects and environments don't bind their creator (`bind_creator: false` in `plat5.yml`), so a fresh environment's own list is empty and its access comes from above. `POST …/bindings` gives a member a role from `GET …/roles`; `PATCH` and `DELETE …/bindings/{binding_id}` change or remove it. **Members** is `GET /orgs/{organization}/members`; remove with `DELETE …/members/{member_id}`, leave with `DELETE /orgs/{organization}/membership`, or add a person by IdP subject (shown on their Profile page) with `POST …/members`.

**Invites** are at the org and at projects, for guests; not at environments, where the starters turn them off (the `invites` flag in `src/api/tree.ts` follows). `POST …/invites` with a `role`, an expiry, and, on an org, `grants`: roles on projects, bound on redeem. An invite below the org brings in a guest, where the deployment allows it. The link is `{origin}/login?invite={token}`. Already signed in: the app redeems at once. Else it stashes the token in a first-party cookie (`plat5_customer_console_invite`) plus an origin stash keyed by the OAuth `state`, strips the query so the Referer to Auth can't leak it, and starts PKCE (Auth's `/authorize` never gets the token). Then `POST /user/invites/redeem` with `{ "token" }`, and the app opens the node the answer names. The stash clears only after a successful redeem. Plat5 sends no email.

**Service accounts** belong to an org, for automation across it, or to an environment, for that environment's keys: the starters' `services/identity.yml` turns them off at projects. Each is created with a role, renamed, deleted, and its keys created (shown once) and revoked. An org's account that should reach one project is bound there on the project's Access page.

**Errors** show `error.message`. A `403` reads "Permission denied, or it may not exist." with an "ask an admin for…" line from `details.required_permissions`; the app never says whether something exists.

## Auth notes

Plat5 Auth (OpenAuth) returns **access + refresh** tokens (no `id_token`). This app uses authorization-code + **PKCE** against `/authorize` and `/token`, not a full OIDC client library.

**JWT `iss` must match gateway `AUTH_ISSUER` exactly.**  
`http://localhost:5401` ≠ `http://127.0.0.1:5401`. Use the same host string in:

- browser Auth URL (`VITE_AUTH_ISSUER`)
- gateway `AUTH_ISSUER`

Mismatch → `401` with `details.reason=invalid_issuer`.

## Boundaries

No monorepo imports. Wire by published URLs / env only.

## License

MIT — see [LICENSE](LICENSE).
