import type { ReactNode } from "react"
import { PageHead } from "../components/ui"
import { config } from "../config"
import { useRouteChecks } from "../org/routeChecks"
import { KeyProbe } from "./KeyProbe"
import { OrgProbe } from "./OrgProbe"

// How Plat5 does what this app does, and two probes to try it. All of it is
// here, in src/learn/: delete the folder, its route in App.tsx, and its link in
// Layout.tsx, and the app has none of it.

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card">
      <div className="card-head">
        <h2>{title}</h2>
      </div>
      <div className="card-body prose">{children}</div>
    </section>
  )
}

export function LearnPage() {
  // No links or buttons of its own, but its batch carries the profile menu's.
  useRouteChecks({})
  return (
    <div className="stack" style={{ maxWidth: "52rem" }}>
      <PageHead
        eyebrow="/learn"
        title="How it works"
        lede="This app signs people in, works inside organizations, their projects and their environments, and calls your API, and the API writes none of the sign-in, membership, or permission code. Plat5's gateway does. Here is how."
      />

      <Section title="One credential">
        <p>
          Signing in (OAuth with PKCE) gives a token, and every call sends it as <code>Authorization: Bearer</code>.
          The same token reaches every org you're in; there are no sessions. A personal API key (
          <code>/user/keys</code>) and a service account's key go in the same header.
        </p>
      </Section>

      <Section title="The path names the node">
        <p>
          The tree is organizations, projects inside them, and environments inside those. Paths carry slugs:{" "}
          <code>/orgs/acme/projects/web/envs/production/tasks</code>. This app's pages use the same paths. The
          gateway resolves the slugs, checks your roles there, and calls your API at{" "}
          <code>/environments/{"{environment_id}"}/tasks</code> with your member id in{" "}
          <code>X-Plat5-Member-Id</code>. Your API never sees a token, a slug, or who you are
          outside that org.
        </p>
        <p>
          Your own data is on user routes: <code>GET /user</code>, <code>/user/keys</code>, and your API's{" "}
          <code>/user/profile</code>, which it gets as <code>/users/{"{user_id}"}/profile</code>.
        </p>
      </Section>

      <Section title="What you can do here">
        <p>
          <code>GET …/membership</code> on any node answers with your member id, the roles that count there (bound
          on it, or on a node above it), and the permissions they grant. This app shows the roles and marks you in
          lists.
        </p>
        <p>
          To hide what you can't use, each page names the requests its links and buttons make, by method and path,
          and asks the gateway about all of them in one <code>POST {config.routeChecksPath}</code>: a route check
          answers whether the gateway would allow each one for you. The gateway decides anyway: a refusal is{" "}
          <code>403</code>, with <code>required_permissions</code> in its details.
        </p>
        <p>
          A <code>403</code> never says whether something exists: an org you're not in and one that doesn't exist
          answer the same.
        </p>
      </Section>

      <Section title="Lists show what you can see">
        <p>
          <code>GET /user/nodes?kind=organization</code> is the org switcher. <code>GET /orgs/{"{organization}"}/projects</code>{" "}
          returns the projects you can read, so someone with a role on one project sees that one, and its
          environments. Lists page with{" "}
          <code>has_more</code>; this app walks every page.
        </p>
      </Section>

      <Section title="Who has access">
        <p>
          A <strong>binding</strong> gives a member a role on one node. <strong>Access</strong> lists every binding
          that counts there, its own and its ancestors'. <strong>Members</strong> are everyone in the org: people,
          guests (people with roles only below the org, from an invite there), and service accounts.
        </p>
        <p>
          <strong>Invites</strong> are links to this app's <code>/login?invite=</code>. The token stays in the
          browser while you sign in, then <code>POST /user/invites/redeem</code> joins you and names where to go.
          Plat5 sends no email. <strong>Service accounts</strong> are members for machines, with roles and keys of
          their own. They belong to the org, for automation across it, or to an environment, for its keys.
        </p>
      </Section>

      <Section title="Deleting is soft">
        <p>
          A deleted org, project or environment can be restored until its <code>purge_after</code>: <code>?status=deleted</code>{" "}
          lists them, <code>POST …/restore</code> brings one back with everything in it.
        </p>
      </Section>

      <Section title="Audit">
        <p>
          The gateway records every write: who, where, and how it ended; your API adds what changed with{" "}
          <code>X-Plat5-Audit-Details</code>. An org's log is <code>GET /orgs/{"{organization}"}/audit-events</code>,
          a project's or an environment's is under it, and yours is <code>GET /user/audit-events</code>.
        </p>
      </Section>

      <Section title="Try it: a key">
        <p>
          Calls the gateway with only the key you paste, as <code>Authorization: Bearer</code>.
        </p>
        <KeyProbe />
      </Section>

      <Section title="Try it: another org">
        <p>
          <code>GET /orgs/{"{organization}"}</code> with your sign-in. Not a member, or no such org: the same{" "}
          <code>403</code>.
        </p>
        <OrgProbe />
      </Section>

      <Section title="Local setup">
        <ul>
          <li>
            Auth on <code>{config.authIssuer}</code> with redirect <code>{config.authRedirectUri}</code> allowed
          </li>
          <li>
            Plat5 gateway on <code>{config.gatewayUrl}</code>
          </li>
          <li>
            Your API behind the gateway, with <code>plat5.yml</code> applied (<code>plat5 start</code> does both)
          </li>
        </ul>
      </Section>
    </div>
  )
}
