import type { AuthConfig } from "convex/server";

/**
 * Clerk issues the JWT (Clerk Dashboard → Integrations → Convex must be on, so
 * tokens carry `aud: "convex"`). `CLERK_JWT_ISSUER_DOMAIN` is the Clerk
 * Frontend API URL, set per deployment: `npx convex env set ...`.
 */
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
