import { v } from "convex/values";

import { mutation } from "./_generated/server";
import { requireMember } from "./lib/helpers";
import { reportReason } from "./schema";

/** Report sheet (board 19). Reviewed by hand in the Convex dashboard (scope A5): `reports` where status = "open". */
export const create = mutation({
  args: {
    targetType: v.union(v.literal("post"), v.literal("comment"), v.literal("user")),
    targetId: v.string(),
    targetUserId: v.optional(v.string()),
    reason: reportReason,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await requireMember(ctx);
    const targetUserId = args.targetUserId ? ctx.db.normalizeId("users", args.targetUserId) : null;
    await ctx.db.insert("reports", {
      reporterId: me._id,
      targetType: args.targetType,
      targetId: args.targetId.slice(0, 64),
      targetUserId: targetUserId ?? undefined,
      reason: args.reason,
      status: "open",
      createdAt: Date.now(),
    });
    return null;
  },
});
