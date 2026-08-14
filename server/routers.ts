import { z } from "zod";
import { createHash } from "node:crypto";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createTicketCode } from "./eventHelpers";
import { storagePut } from "./storage";
import {
  checkInRegistration,
  createQrCode,
  createWorkspaceEvent,
  createWorkspaceLink,
  findLinkBySlug,
  getOrCreateWorkspace,
  getWorkspaceLinks,
  getWorkspaceMembership,
  getWorkspaceSummary,
  getQrScanAnalytics,
  listEventRegistrations,
  listWorkspaceEvents,
  listWorkspaceQrCodes,
  recordConnectionEvent,
  registerAttendee,
} from "./db";

const slugSchema = z
  .string()
  .min(3)
  .max(120)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers, and hyphens"
  );

const normalizeDestination = (value: string) => {
  const trimmed = value.trim();
  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const parsed = new URL(candidate);
  if (!parsed.hostname.includes("."))
    throw new Error("Enter a valid domain such as google.com");
  return parsed.toString();
};

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
          destinationUrl: z.string().min(3).max(2000),
          customDomain: z.string().min(3).max(255).optional(),
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
        const { password, destinationUrl, customDomain, ...rest } = input;
        return createWorkspaceLink({
          ...rest,
          destinationUrl: normalizeDestination(destinationUrl),
          customDomain:
            customDomain
              ?.replace(/^https?:\/\//i, "")
              .replace(/\/$/, "")
              .trim() || null,
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
  events: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const workspace = await getOrCreateWorkspace(ctx.user);
      return workspace ? listWorkspaceEvents(workspace.id) : [];
    }),
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(2).max(200),
          description: z.string().max(5000).optional(),
          venue: z.string().max(240).optional(),
          startsAt: z.date(),
          capacity: z.number().int().positive().optional(),
          status: z.enum(["draft", "published", "ended"]).default("draft"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const workspace = await getOrCreateWorkspace(ctx.user);
        if (!workspace) throw new Error("Workspace could not be initialized");
        return createWorkspaceEvent({
          ...input,
          workspaceId: workspace.id,
          createdBy: ctx.user.id,
        });
      }),
    registrations: protectedProcedure
      .input(z.object({ eventId: z.number().int().positive() }))
      .query(({ input }) => listEventRegistrations(input.eventId)),
    register: publicProcedure
      .input(
        z.object({
          eventId: z.number().int().positive(),
          ticketTierId: z.number().int().positive().optional(),
          workspaceId: z.number().int().positive(),
          attendeeName: z.string().min(2).max(180),
          attendeeEmail: z.string().email(),
          attendeePhone: z.string().max(40).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const ticketCode = createTicketCode();
        return registerAttendee({ ...input, ticketCode });
      }),
    checkIn: protectedProcedure
      .input(z.object({ ticketCode: z.string().min(4).max(80) }))
      .mutation(({ input }) => checkInRegistration(input.ticketCode)),
  }),
  analytics: router({
    qrScans: protectedProcedure
      .input(
        z
          .object({ from: z.date().optional(), to: z.date().optional() })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        const workspace = await getOrCreateWorkspace(ctx.user);
        return workspace
          ? getQrScanAnalytics(workspace.id, input?.from, input?.to)
          : [];
      }),
  }),
  qr: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const workspace = await getOrCreateWorkspace(ctx.user);
      return workspace ? listWorkspaceQrCodes(workspace.id) : [];
    }),
    create: protectedProcedure
      .input(
        z.object({
          smartLinkId: z.number().int().positive(),
          name: z.string().min(2).max(160),
          foregroundColor: z
            .string()
            .regex(/^#[0-9A-Fa-f]{6}$/)
            .default("#003D32"),
          backgroundColor: z
            .string()
            .regex(/^#[0-9A-Fa-f]{6}$/)
            .default("#DDF8EC"),
          shape: z.enum(["square", "dots", "rounded"]).default("rounded"),
          frameLabel: z.string().max(80).optional(),
          logoDataUrl: z.string().max(2_000_000).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const workspace = await getOrCreateWorkspace(ctx.user);
        if (!workspace) throw new Error("Workspace could not be initialized");
        let logoUrl: string | null = null;
        if (input.logoDataUrl) {
          const match = input.logoDataUrl.match(
            /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/
          );
          if (!match)
            throw new Error("Logo must be a PNG, JPEG, or WebP image");
          const contentType =
            match[1] === "image/jpg" ? "image/jpeg" : match[1];
          const uploaded = await storagePut(
            `workspaces/${workspace.id}/qr-logos/logo`,
            Buffer.from(match[2], "base64"),
            contentType
          );
          logoUrl = uploaded.url;
        }
        const { logoDataUrl: _logoDataUrl, ...qrInput } = input;
        return createQrCode({ ...qrInput, logoUrl, workspaceId: workspace.id });
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
