// Approve someone from the waitlist so their invitation email opens the app.
//
//   npm run approve -- list                 people waiting (pending waitlist entries)
//   npm run approve -- someone@gmail.com    approve: send the approval email
//   npm run approve -- set-email            install scripts/emails/waitlist-invitation.html
//                                           as Clerk's "Waitlist invitation" email
//
// The approval email has no button (2026-11-06, your call): it tells people to
// open the app and continue with Google / Apple (sign-in screen
// card) using that email. The pending invitation is what lets that email sign
// up. Clerk requires the template to contain {{action_url}}, so it sits in an
// HTML comment; the invitation still redirects to withfriends://accept-invite
// in case anyone digs the link out.
//
// Prefer this over the Dashboard's Approve button: same email (once set-email
// has run), but the Dashboard's invitation link opens Clerk's web sign-up page.
//
// Uses CLERK_SECRET_KEY from .env (the instance the app's key points at).

import { readFileSync } from "node:fs";

const REDIRECT_URL = "withfriends://accept-invite";
const EMAIL_SUBJECT = "You're in: {{app.name}}";
const API = "https://api.clerk.com/v1";
const key = process.env.CLERK_SECRET_KEY;

if (!key) {
  console.error("Missing CLERK_SECRET_KEY. Run with: npm run approve -- <email | list | set-email>");
  process.exit(1);
}

async function clerk(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = json?.errors?.map((e) => e.long_message || e.message).join("; ") || res.statusText;
    throw new Error(`${method} ${path}: ${message}`);
  }
  return json;
}

const list = (json) => (Array.isArray(json) ? json : (json?.data ?? []));

async function waitlistEntry(email) {
  const entries = list(await clerk("GET", `/waitlist_entries?query=${encodeURIComponent(email)}&limit=50`));
  return entries.find((e) => e.email_address.toLowerCase() === email.toLowerCase()) ?? null;
}

async function showWaiting() {
  // Approving here doesn't update the waitlist entry, so hide anyone already invited.
  const invited = new Set(
    list(await clerk("GET", "/invitations?limit=500"))
      .filter((i) => i.status === "pending" || i.status === "accepted")
      .map((i) => i.email_address.toLowerCase()),
  );
  const entries = list(await clerk("GET", "/waitlist_entries?status=pending&limit=100")).filter(
    (e) => !invited.has(e.email_address.toLowerCase()),
  );
  if (entries.length === 0) return console.log("Nobody is waiting.");
  for (const e of entries) console.log(`${new Date(e.created_at).toLocaleString()}  ${e.email_address}`);
}

async function approve(email) {
  const users = list(await clerk("GET", `/users?email_address=${encodeURIComponent(email)}`));
  if (users.length > 0) {
    console.log(`${email} already has an account. They can sign in from the app's sign-in screen.`);
    return;
  }

  // An older pending invitation (e.g. from the Dashboard) would block a new one
  // and points at the web page, so revoke it first.
  const pending = list(await clerk("GET", `/invitations?status=pending&query=${encodeURIComponent(email)}`));
  for (const inv of pending.filter((i) => i.email_address.toLowerCase() === email.toLowerCase())) {
    await clerk("POST", `/invitations/${inv.id}/revoke`);
    console.log(`Revoked an older invitation for ${email}.`);
  }

  await clerk("POST", "/invitations", {
    email_address: email,
    redirect_url: REDIRECT_URL,
    template_slug: "waitlist_invitation",
    notify: true,
    // Clerk can still count a just-revoked invitation as pending.
    ignore_existing: true,
  });
  console.log(`Approved ${email}. Approval email sent.`);
  // Note: if the Dashboard had approved them first, revoking that invitation
  // marks their waitlist entry "rejected". Only a label: the new invitation
  // is what lets them sign up.
  if (!(await waitlistEntry(email))) console.log("(They weren't on the waitlist; invited anyway.)");
}

async function setEmail() {
  const body = readFileSync(new URL("./emails/waitlist-invitation.html", import.meta.url), "utf8");
  await clerk("PUT", "/templates/email/waitlist_invitation", {
    name: "Waitlist invitation",
    subject: EMAIL_SUBJECT,
    body,
    delivered_by_clerk: true,
  });
  console.log("Clerk's Waitlist invitation email updated (no button, app instructions).");
}

const arg = process.argv[2]?.trim();
if (!arg) {
  console.error("Usage: npm run approve -- <email | list | set-email>");
  process.exit(1);
}

(arg === "list" ? showWaiting() : arg === "set-email" ? setEmail() : approve(arg)).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
