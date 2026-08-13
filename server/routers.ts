import { z } from "zod";
import { createHash } from "node:crypto";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createWorkspaceLink,
  findLinkBySlug,
  getOrCreateWorkspace,
  getWorkspaceLinks,
  getWorkspaceMembership,
  getWorkspaceSummary,
  recordConnectionEvent,
} from "./db";

const slugSchema = z
  .string()
  .min(3)
  .max(120)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers, and hyphens"
  );

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  workspace: router({
    current: protectedProcedure.query(async ({ ctx }) =>
      getOrCreateWorkspace(ctx.user)
    ),
    summary: protectedProcedure.query(async ({ ctx }) => {
      const workspace = await getOrCreateWorkspace(ctx.user);
      return workspace
        ? getWorkspaceSummary(workspace.id)
        : {
            clicks: 0,
            scans: 0,
            links: 0,
            contacts: 0,
            events: 0,
            recentEvents: [],
            topLinks: [],
          };
    }),
  }),
  links: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const workspace = await getOrCreateWorkspace(ctx.user);
      return workspace ? getWorkspaceLinks(workspace.id) : [];
    }),
    create: protectedProcedure
      .input(
        z.object({
          slug: slugSchema,
          destinationUrl: z.string().url(),
          utmSource: z.string().max(120).optional(),
          utmMedium: z.string().max(120).optional(),
          utmCampaign: z.string().max(120).optional(),
          expiresAt: z.date().optional(),
          password: z.string().min(6).max(120).optional(),
          routingRules: z.record(z.string(), z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const workspace = await getOrCreateWorkspace(ctx.user);
        if (!workspace) throw new Error("Workspace could not be initialized");
        const membership = await getWorkspaceMembership(
          workspace.id,
          ctx.user.id
        );
        if (
          !membership ||
          !["owner", "admin", "member"].includes(membership.role)
        )
          throw new Error("Workspace access denied");
        const { password, ...rest } = input;
        return createWorkspaceLink({
          ...rest,
          passwordHash: password
            ? createHash("sha256").update(password).digest("hex")
            : null,
          workspaceId: workspace.id,
          createdBy: ctx.user.id,
        });
      }),
  }),
  redirect: router({
    resolve: publicProcedure
      .input(z.object({ slug: slugSchema }))
      .query(async ({ input, ctx }) => {
        const link = await findLinkBySlug(input.slug);
        if (!link) return { found: false as const };
        if (link.expiresAt && link.expiresAt.getTime() < Date.now())
          return { found: false as const, expired: true as const };
        const url = new URL(link.destinationUrl);
        const rules = (link.routingRules || {}) as Record<string, string>;
        const userAgent = String(
          ctx.req.headers["user-agent"] || ""
        ).toLowerCase();
        if (
          rules.device === "mobile" &&
          !/android|iphone|ipad|mobile/.test(userAgent)
        )
          return { found: false as const, routingMiss: true as const };
        if (link.utmSource) url.searchParams.set("utm_source", link.utmSource);
        if (link.utmMedium) url.searchParams.set("utm_medium", link.utmMedium);
        if (link.utmCampaign)
          url.searchParams.set("utm_campaign", link.utmCampaign);
        void recordConnectionEvent({
          workspaceId: link.workspaceId,
          linkId: link.id,
          eventType: "click",
          ipAddress:
            String(ctx.req.headers["x-forwarded-for"] || "").split(",")[0] ||
            null,
          referrer: ctx.req.headers.referer || null,
          deviceType: /android|iphone|ipad|mobile/.test(userAgent)
            ? "mobile"
            : "desktop",
          browser: /chrome/.test(userAgent)
            ? "chrome"
            : /safari/.test(userAgent)
              ? "safari"
              : /firefox/.test(userAgent)
                ? "firefox"
                : "other",
          utmSource: link.utmSource,
          utmMedium: link.utmMedium,
          utmCampaign: link.utmCampaign,
          metadata: { userAgent: ctx.req.headers["user-agent"] || null },
        });
        return { found: true as const, destinationUrl: url.toString() };
      }),
  }),
  ai: router({
    suggestSlug: protectedProcedure
      .input(z.object({ campaign: z.string().min(3).max(240) }))
      .mutation(({ input }) => {
        const suggestion = input.campaign
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 50);
        return {
          suggestion: suggestion || "new-campaign",
          note: "Assistive suggestion only. Review before publishing.",
        };
      }),
    generateUtm: protectedProcedure
      .input(z.object({ campaign: z.string().min(3).max(240) }))
      .mutation(({ input }) => {
        const base = input.campaign
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 60);
        return {
          utmSource: "konnekt",
          utmMedium: "campaign",
          utmCampaign: base || "new-campaign",
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
