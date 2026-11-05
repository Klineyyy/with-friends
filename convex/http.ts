import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

/**
 * Clerk webhook (scope §6): user.created / user.updated / user.deleted.
 * Endpoint: `<EXPO_PUBLIC_CONVEX_SITE_URL>/clerk-webhook`. Secret from Clerk
 * Dashboard → Webhooks, set with `npx convex env set CLERK_WEBHOOK_SECRET whsec_…`.
 * Clerk signs with Svix; verified here with Web Crypto, no extra package.
 */

const http = httpRouter();

const TOLERANCE_S = 5 * 60;

async function verifySvix(req: Request, body: string): Promise<boolean> {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  const id = req.headers.get("svix-id");
  const timestamp = req.headers.get("svix-timestamp");
  const signatures = req.headers.get("svix-signature");
  if (!secret || !id || !timestamp || !signatures) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > TOLERANCE_S) return false;

  const keyBytes = Uint8Array.from(atob(secret.replace(/^whsec_/, "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${body}`));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  // Header holds space-separated "v1,<base64>" entries (several during secret rotation).
  return signatures.split(" ").some((entry) => {
    const [version, sig] = entry.split(",");
    return version === "v1" && sig !== undefined && timingSafeEqual(sig, expected);
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = await req.text();
    if (!(await verifySvix(req, body))) return new Response("Invalid signature", { status: 401 });

    let event: unknown;
    try {
      event = JSON.parse(body);
    } catch {
      return new Response("Bad JSON", { status: 400 });
    }
    if (typeof event !== "object" || event === null) return new Response("Bad event", { status: 400 });
    const { type, data } = event as { type?: unknown; data?: unknown };
    if (typeof data !== "object" || data === null) return new Response("Bad event", { status: 400 });
    const d = data as Record<string, unknown>;
    const clerkId = str(d.id);
    if (!clerkId) return new Response("Missing user id", { status: 400 });

    if (type === "user.created" || type === "user.updated") {
      const name = [str(d.first_name), str(d.last_name)].filter(Boolean).join(" ") || undefined;
      await ctx.runMutation(internal.users.upsertFromWebhook, {
        clerkId,
        name,
        imageUrl: d.has_image === true ? str(d.image_url) : undefined,
      });
    } else if (type === "user.deleted") {
      await ctx.runMutation(internal.users.deleteFromWebhook, { clerkId });
    }
    return new Response(null, { status: 200 });
  }),
});

export default http;
