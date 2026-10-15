import type { ReactNode } from "react"
import { config } from "../config"
import { KeyProbe } from "./KeyProbe"
import { OrgProbe } from "./OrgProbe"

// How Plat5 does what this app does, page by page, and two probes to try it.
// All of it is here, in src/learn/: delete the folder, its route in App.tsx, and
// its link in Layout.tsx, and the app has none of it.

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="card mb-3">
      <div className="card-header">{title}</div>
      <div className="card-body small">{children}</div>
    </div>
  )
}

export function LearnPage() {
  return (
    <div className="row justify-content-center">
      <div className="col-lg-9">
        <h1 className="h3 mb-1">How it works</h1>
        <p className="mb-4">
          This app signs people in, works inside organizations, and calls your API, and the API writes none
          of the sign-in, membership, or permission code. Plat5's gateway does. Here is how, page by page.
        </p>

        <Section title="Two ideas">
          <ul className="mb-2">
            <li>
              <strong>You, as a person.</strong> Your profile, your organizations, your own API keys. Signing
              in gives you this.
            </li>
            <li>
              <strong>You, inside an organization.</strong> A member, with a role. Projects and everything
              else in the org belong to the org, not to you.
            </li>
          </ul>
          <p>
            Every credential is one of these two. The API behind this app sees the org and the member, never
            who the person is.
          </p>
          <ul className="mb-0">
            <li>
              <strong>Sign-in</strong>: OAuth with PKCE gives a user JWT, for user routes (<code>/user/…</code>).
              A <strong>user API key</strong> is the same, for scripts.
            </li>
            <li>
              <strong>Member session</strong>: minted for the org you pick (
              <code>POST /user/organizations/{"{id}"}/session</code>), and sent as <code>X-API-Key</code> on
              organization and member routes (<code>/org/…</code>, <code>/member/…</code>). It exists so the API
              gets an org-scoped credential and never the person's id. Not an active member: the mint is{" "}
              <code>404</code>.
            </li>
            <li>
              <strong>Member API keys</strong> are a member's long-lived credential (<code>/member/api-keys</code>
              ). A <strong>service account</strong> is a member with keys and no person.
            </li>
            <li>
              The gateway checks the credential, then writes the org into the path: <code>/org/projects</code>{" "}
              reaches the API as <code>/organizations/{"{organization_id}"}/projects</code>.
            </li>
          </ul>
        </Section>

        <Section title="Profile">
          <p>
            <strong>Account</strong> is identity's directory (<code>GET/PATCH/DELETE /user</code>) with your
            sign-in. The directory is private: organizations see your name and status, never your id or email.
          </p>
          <p>
            <strong>Your activity</strong> is <code>GET /user/audit-events</code>. The gateway records every
            write, with who, from where, and how it ended. Services add what changed.
          </p>
          <p className="mb-0">
            <strong>App profile</strong> is <code>GET/PUT /user/profile</code> on your API. The gateway writes
            your directory id into the path (<code>/users/{"{user_id}"}/profile</code>), so the API stores the
            profile by it and never parses a token.
          </p>
        </Section>

        <Section title="Organizations">
          <p>
            The list is <code>GET /user/memberships</code> with your sign-in; creating one is{" "}
            <code>POST /user/organizations</code>. Picking one mints a member session, which this app keeps until
            it expires. Organization and member calls send it as <code>X-API-Key</code>, and the gateway writes
            the org into the path.
          </p>
          <p>
            Everything on an org's page uses that member session, not your sign-in.{" "}
            <code>GET/PATCH/DELETE /org</code> reaches identity as{" "}
            <code>/organizations/{"{organization_id}"}</code>. Buttons your role can't use are disabled; the
            gateway would answer <code>403</code> anyway.
          </p>
          <p>
            <strong>Members</strong>: <code>GET/POST /org/members</code>. The org never sees a person's user id:
            you can also add someone by their IdP subject, shown on their Profile page. Service accounts are
            listed too (<code>principal=service_account</code>). Your own status is <code>PATCH /member</code>;
            others are <code>PATCH/DELETE /org/members/{"{id}"}</code>. Whoever holds{" "}
            <code>org:members:write</code> may assign any role, including to themselves.
          </p>
          <p>
            <strong>Invites</strong>: <code>POST /org/invites</code> mints a token. The link is{" "}
            <code>/login?invite=</code> on this app. The invitee's browser keeps the token (a first-party cookie,
            and a stash keyed by the OAuth <code>state</code>), strips it from the URL, and signs in with PKCE:
            the token never reaches <code>/authorize</code>. Then <code>POST /user/invites/redeem</code> with the
            token and their user JWT makes them an active member. Plat5 sends no email; you share the link.
          </p>
          <p>
            <strong>Service accounts</strong>: creating one adds a service account and an active member with the
            role you pick, not yours. Its keys (
            <code>/org/service-accounts/{"{id}"}/api-keys</code>) are member keys like any other.
          </p>
          <p className="mb-0">
            <strong>Your member keys</strong>: <code>GET/POST /member/api-keys</code>. Sent as{" "}
            <code>X-API-Key</code> on organization and member routes. A key carries its member's role; change the
            role and the key follows. User keys don't cover these routes.
          </p>
        </Section>

        <Section title="Projects">
          <p className="mb-0">
            The app calls <code>/org/projects</code> with the member session. The gateway checks it, checks the
            role's labels, and calls your API at <code>/organizations/{"{organization_id}"}/projects</code>. A
            project's page is <code>/org/projects/{"{id}"}</code>, which your API gets as{" "}
            <code>/organizations/{"{organization_id}"}/projects/{"{id}"}</code>: it only finds the project if it's
            in that org.
          </p>
        </Section>

        <Section title="Audit log">
          <p className="mb-0">
            <code>GET /org/audit-events</code> with the member session, newest first. The gateway records each
            write before calling the service, then its outcome. A service adds what changed with the{" "}
            <code>X-Plat5-Audit-Details</code> header. Reading the log needs <code>org:audit:read</code>.
          </p>
        </Section>

        <Section title="User keys">
          <p className="mb-0">
            <code>GET/POST /user/api-keys</code> with your sign-in. A user key is sent as <code>X-API-Key</code>{" "}
            and admitted on user routes (<code>/user/…</code>) only. On an organization or member route it is{" "}
            <code>401</code>: those take a member key or member session. Member keys look the same; the prefix
            says it's a key, not whose.
          </p>
        </Section>

        <Section title="Try it: which key works where">
          <p>
            Calls the gateway with only <code>X-API-Key</code>, no user JWT. User keys are admitted on user
            routes; member keys and member sessions on organization and member routes. The wrong kind is{" "}
            <code>401</code>, and the message says what the route takes.
          </p>
          <KeyProbe />
        </Section>

        <Section title="Try it: another org">
          <p>
            <code>POST /user/organizations/{"{id}"}/session</code> with your sign-in. Not an active member is{" "}
            <strong>404</strong>, the same as an org that doesn't exist.
          </p>
          <OrgProbe />
        </Section>

        <Section title="Local setup">
          <ul className="mb-0">
            <li>
              Auth on <code>{config.authIssuer}</code> with redirect <code>{config.authRedirectUri}</code> allowed
            </li>
            <li>
              Plat5 gateway on <code>{config.gatewayUrl}</code>
            </li>
            <li>
              Your API behind the gateway, with routes applied (<code>plat5 start</code> does both)
            </li>
          </ul>
        </Section>
      </div>
    </div>
  )
}
