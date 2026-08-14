import { parse as parseCookie } from "cookie";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createTicketCode } from "./eventHelpers";
import { storagePut } from "./storage";
import {
  checkInRegistration,
  createQrCode,
  createPaymentRecord,
  deleteQrCode,
  createWorkspaceEvent,
  createWorkspaceContact,
  createWorkspaceLink,
  findLinkBySlug,
  getOrCreateWorkspace,
  getWorkspaceLinks,
  getContactTimeline,
  getContactWorkspaceId,
  listWorkspaceContacts,
  getEventWorkspaceId,
  getPublicEvent,
  getRegistrationWorkspaceId,
  getSmartLinkWorkspaceId,
  requireWorkspaceRole,
  setWorkspaceScheduleCronTaskUid,
  getWorkspaceSummary,
  getAnalyticsOverview,
  getConnectionTrend,
  getOrCreateWhatsappConversation,
  createWhatsappMessage,
  listWhatsappMessages,
  getQrScanAnalytics,
  listEventRegistrations,
  listWorkspaceEvents,
  listWorkspaceQrCodes,
  renameQrCode,
  recordConnectionEvent,
  registerAttendee,
} from "./db";
import {
  detectBrowser,
  detectDevice,
  isContactInWorkspace,
  hashPassword,
  matchesRoutingRules,
  normalizeRoutingRules,
  verifyPassword,
} from "./security";
import {
  generateCampaignUtm,
  summarizeAnalytics,
  suggestCampaignSlug,
} from "./ai";
import { createHeartbeatJob } from "./_core/heartbeat";

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
    current: protectedProcedure.query(async ({ ctx }) => {
      const workspace = await getOrCreateWorkspace(ctx.user);
      if (workspace) await requireWorkspaceRole(workspace.id, ctx.user.id);
      return workspace;
    }),
    scheduleWeeklyDigest: protectedProcedure
      .input(
        z.object({
          cron: z
            .string()
            .regex(
              /^\d+ \d+ \d+ \S+ \S+ \S+$/,
              "Use a six-field UTC cron expression"
            )
            .default("0 0 9 * * 1"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const workspace = await getOrCreateWorkspace(ctx.user);
        if (!workspace) throw new Error("Workspace could not be initialized");
        await requireWorkspaceRole(workspace.id, ctx.user.id, [
          "owner",
          "admin",
        ]);
        const sessionToken =
          parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
        const job = await createHeartbeatJob(
          {
            name: `weekly-digest-${workspace.id}`,
            cron: input.cron,
            path: "/api/scheduled/weeklyDigest",
            description: `Weekly analytics digest for ${workspace.name}`,
          },
          sessionToken
        );
        await setWorkspaceScheduleCronTaskUid(workspace.id, job.taskUid);
        return { taskUid: job.taskUid, nextExecutionAt: job.nextExecutionAt };
      }),
    summary: protectedProcedure.query(async ({ ctx }) => {
      const workspace = await getOrCreateWorkspace(ctx.user);
      if (workspace) await requireWorkspaceRole(workspace.id, ctx.user.id);
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
      if (workspace) await requireWorkspaceRole(workspace.id, ctx.user.id);
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
        await requireWorkspaceRole(workspace.id, ctx.user.id);
        const { password, destinationUrl, customDomain, ...rest } = input;
        return createWorkspaceLink({
          ...rest,
          destinationUrl: normalizeDestination(destinationUrl),
          customDomain:
            customDomain
              ?.replace(/^https?:\/\//i, "")
              .replace(/\/$/, "")
              .trim() || null,
          passwordHash: password ? hashPassword(password) : null,
          routingRules: normalizeRoutingRules(input.routingRules),
          workspaceId: workspace.id,
          createdBy: ctx.user.id,
        });
      }),
  }),
  redirect: router({
    resolve: publicProcedure
      .input(
        z.object({
          slug: slugSchema,
          password: z.string().max(120).optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        const link = await findLinkBySlug(input.slug);
        if (!link) return { found: false as const };
        if (link.expiresAt && link.expiresAt.getTime() < Date.now())
          return { found: false as const, expired: true as const };
        if (
          link.passwordHash &&
          (!input.password ||
            !verifyPassword(input.password, link.passwordHash))
        ) {
          return { found: false as const, passwordRequired: true as const };
        }
        const url = new URL(link.destinationUrl);
        const rules = (link.routingRules || {}) as Record<string, string>;
        const userAgent = String(ctx.req.headers["user-agent"] || "");
        const country = String(
          ctx.req.headers["cf-ipcountry"] || ctx.req.headers["x-country"] || ""
        ).toLowerCase();
        if (!matchesRoutingRules(rules, userAgent, country))
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
          country: country || null,
          deviceType: detectDevice(userAgent),
          browser: detectBrowser(userAgent),
          utmSource: link.utmSource,
          utmMedium: link.utmMedium,
          utmCampaign: link.utmCampaign,
          metadata: { userAgent: ctx.req.headers["user-agent"] || null },
        });
        return { found: true as const, destinationUrl: url.toString() };
      }),
  }),
  events: router({
    publicDetail: publicProcedure
      .input(z.object({ eventId: z.number().int().positive() }))
      .query(async ({ input }) => getPublicEvent(input.eventId)),
    list: protectedProcedure.query(async ({ ctx }) => {
      const workspace = await getOrCreateWorkspace(ctx.user);
      if (workspace) await requireWorkspaceRole(workspace.id, ctx.user.id);
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
        await requireWorkspaceRole(workspace.id, ctx.user.id, [
          "owner",
          "admin",
        ]);
        return createWorkspaceEvent({
          ...input,
          workspaceId: workspace.id,
          createdBy: ctx.user.id,
        });
      }),
    registrations: protectedProcedure
      .input(z.object({ eventId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const workspaceId = await getEventWorkspaceId(input.eventId);
        if (!workspaceId) throw new Error("Event not found");
        await requireWorkspaceRole(workspaceId, ctx.user.id);
        return listEventRegistrations(input.eventId);
      }),
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
      .mutation(async ({ ctx, input }) => {
        const workspaceId = await getRegistrationWorkspaceId(input.ticketCode);
        if (!workspaceId) throw new Error("Ticket not found");
        await requireWorkspaceRole(workspaceId, ctx.user.id);
        return checkInRegistration(input.ticketCode);
      }),
  }),
  contacts: router({
    timeline: protectedProcedure
      .input(z.object({ contactId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const workspace = await getOrCreateWorkspace(ctx.user);
        if (!workspace) throw new Error("Workspace could not be initialized");
        await requireWorkspaceRole(workspace.id, ctx.user.id);
        return getContactTimeline(input.contactId, workspace.id);
      }),
    list: protectedProcedure.query(async ({ ctx }) => {
      const workspace = await getOrCreateWorkspace(ctx.user);
      if (!workspace) throw new Error("Workspace could not be initialized");
      await requireWorkspaceRole(workspace.id, ctx.user.id);
      return listWorkspaceContacts(workspace.id);
    }),
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().max(180).optional(),
          email: z.string().email().max(320).optional(),
          phone: z.string().max(40).optional(),
          whatsappOptIn: z.boolean().default(false),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const workspace = await getOrCreateWorkspace(ctx.user);
        if (!workspace) throw new Error("Workspace could not be initialized");
        await requireWorkspaceRole(workspace.id, ctx.user.id, [
          "owner",
          "admin",
        ]);
        return createWorkspaceContact({ ...input, workspaceId: workspace.id });
      }),
  }),
  conversations: router({
    timeline: protectedProcedure
      .input(z.object({ contactId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const workspace = await getOrCreateWorkspace(ctx.user);
        if (!workspace) throw new Error("Workspace could not be initialized");
        await requireWorkspaceRole(workspace.id, ctx.user.id);
        const contactWorkspaceId = await getContactWorkspaceId(input.contactId);
        if (!isContactInWorkspace(contactWorkspaceId, workspace.id))
          throw new Error("Contact access denied");
        const conversation = await getOrCreateWhatsappConversation(
          workspace.id,
          input.contactId
        );
        if (!conversation) return [];
        return listWhatsappMessages(conversation.id);
      }),
    record: protectedProcedure
      .input(
        z.object({
          contactId: z.number().int().positive(),
          direction: z.enum(["inbound", "outbound"]),
          body: z.string().min(1).max(4000),
          providerMessageId: z.string().max(160).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const workspace = await getOrCreateWorkspace(ctx.user);
        if (!workspace) throw new Error("Workspace could not be initialized");
        await requireWorkspaceRole(workspace.id, ctx.user.id);
        const contactWorkspaceId = await getContactWorkspaceId(input.contactId);
        if (!isContactInWorkspace(contactWorkspaceId, workspace.id))
          throw new Error("Contact access denied");
        const conversation = await getOrCreateWhatsappConversation(
          workspace.id,
          input.contactId
        );
        if (!conversation)
          throw new Error("Conversation could not be initialized");
        return createWhatsappMessage({
          conversationId: conversation.id,
          direction: input.direction,
          body: input.body,
          providerMessageId: input.providerMessageId,
          deliveryStatus:
            input.direction === "inbound" ? "received" : "deferred",
        });
      }),
  }),
  payments: router({
    record: protectedProcedure
      .input(
        z.object({
          provider: z.string().min(2).max(80),
          providerReference: z.string().max(180).optional(),
          idempotencyKey: z.string().min(8).max(180),
          amountMinor: z.number().int().nonnegative(),
          currency: z.string().length(3),
          status: z.enum(["pending", "succeeded", "failed", "refunded"]),
          metadata: z.record(z.string(), z.unknown()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const workspace = await getOrCreateWorkspace(ctx.user);
        if (!workspace) throw new Error("Workspace could not be initialized");
        await requireWorkspaceRole(workspace.id, ctx.user.id, [
          "owner",
          "admin",
        ]);
        return createPaymentRecord({ ...input, workspaceId: workspace.id });
      }),
  }),
  analytics: router({
    summary: protectedProcedure.mutation(async ({ ctx }) => {
      const workspace = await getOrCreateWorkspace(ctx.user);
      if (!workspace) throw new Error("Workspace could not be initialized");
      await requireWorkspaceRole(workspace.id, ctx.user.id);
      const summary = await getWorkspaceSummary(workspace.id);
      return summarizeAnalytics({
        clicks: summary.clicks,
        scans: summary.scans,
        links: summary.links,
        events: summary.events,
      });
    }),
    overview: protectedProcedure
      .input(
        z
          .object({ from: z.date().optional(), to: z.date().optional() })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        const workspace = await getOrCreateWorkspace(ctx.user);
        if (!workspace) throw new Error("Workspace could not be initialized");
        await requireWorkspaceRole(workspace.id, ctx.user.id);
        return getAnalyticsOverview(workspace.id, input?.from, input?.to);
      }),
    trends: protectedProcedure
      .input(
        z.object({
          from: z.date(),
          to: z.date(),
          previousFrom: z.date(),
          previousTo: z.date(),
        })
      )
      .query(async ({ ctx, input }) => {
        const workspace = await getOrCreateWorkspace(ctx.user);
        if (!workspace) throw new Error("Workspace could not be initialized");
        await requireWorkspaceRole(workspace.id, ctx.user.id);
        const [current, previous] = await Promise.all([
          getConnectionTrend(workspace.id, input.from, input.to),
          getConnectionTrend(
            workspace.id,
            input.previousFrom,
            input.previousTo
          ),
        ]);
        const total = (rows: typeof current) =>
          rows.reduce((sum, row) => sum + Number(row.count ?? 0), 0);
        return {
          current,
          previous,
          totals: { current: total(current), previous: total(previous) },
        };
      }),
    qrScans: protectedProcedure
      .input(
        z
          .object({ from: z.date().optional(), to: z.date().optional() })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        const workspace = await getOrCreateWorkspace(ctx.user);
        if (workspace) await requireWorkspaceRole(workspace.id, ctx.user.id);
        return workspace
          ? getQrScanAnalytics(workspace.id, input?.from, input?.to)
          : [];
      }),
  }),
  qr: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const workspace = await getOrCreateWorkspace(ctx.user);
      if (workspace) await requireWorkspaceRole(workspace.id, ctx.user.id);
      return workspace ? listWorkspaceQrCodes(workspace.id) : [];
    }),
    rename: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          name: z.string().trim().min(2).max(160),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const workspace = await getOrCreateWorkspace(ctx.user);
        if (!workspace) throw new Error("Workspace could not be initialized");
        await requireWorkspaceRole(workspace.id, ctx.user.id, [
          "owner",
          "admin",
          "member",
        ]);
        const renamed = await renameQrCode(workspace.id, input.id, input.name);
        if (!renamed) throw new Error("QR asset not found");
        return { success: true };
      }),
    remove: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const workspace = await getOrCreateWorkspace(ctx.user);
        if (!workspace) throw new Error("Workspace could not be initialized");
        await requireWorkspaceRole(workspace.id, ctx.user.id, [
          "owner",
          "admin",
          "member",
        ]);
        const removed = await deleteQrCode(workspace.id, input.id);
        if (!removed) throw new Error("QR asset not found");
        return { success: true };
      }),
    create: protectedProcedure
      .input(
        z.object({
          smartLinkId: z.number().int().positive().optional(),
          destinationUrl: z.string().min(3).max(2000).optional(),
          name: z.string().min(2).max(160),
          foregroundColor: z
            .string()
            .regex(/^#[0-9A-Fa-f]{6}$/)
            .default("#003D32"),
          foregroundEndColor: z
            .string()
            .regex(/^#[0-9A-Fa-f]{6}$/)
            .nullable()
            .optional(),
          backgroundColor: z
            .string()
            .regex(/^#[0-9A-Fa-f]{6}$/)
            .default("#DDF8EC"),
          shape: z.enum(["square", "dots", "rounded"]).default("rounded"),
          cornerStyle: z
            .enum(["square", "rounded", "circle"])
            .default("rounded"),
          frameLabel: z.string().max(80).optional(),
          frameStyle: z.enum(["minimal", "pill", "bold"]).default("minimal"),
          logoDataUrl: z.string().max(2_000_000).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const workspace = await getOrCreateWorkspace(ctx.user);
        if (!workspace) throw new Error("Workspace could not be initialized");
        if (!input.smartLinkId && !input.destinationUrl)
          throw new Error("Choose a smart link or enter a destination URL");
        if (input.smartLinkId && input.destinationUrl)
          throw new Error("Choose one QR destination source");
        if (input.smartLinkId) {
          const smartLinkWorkspaceId = await getSmartLinkWorkspaceId(
            input.smartLinkId
          );
          if (smartLinkWorkspaceId !== workspace.id)
            throw new Error("Smart link access denied");
        }
        await requireWorkspaceRole(workspace.id, ctx.user.id, [
          "owner",
          "admin",
          "member",
        ]);
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
        return createQrCode({
          ...qrInput,
          destinationUrl: input.destinationUrl
            ? normalizeDestination(input.destinationUrl)
            : null,
          logoUrl,
          workspaceId: workspace.id,
        });
      }),
  }),
  ai: router({
    suggestSlug: protectedProcedure
      .input(z.object({ campaign: z.string().min(3).max(240) }))
      .mutation(({ input }) => suggestCampaignSlug(input.campaign)),
    generateUtm: protectedProcedure
      .input(z.object({ campaign: z.string().min(3).max(240) }))
      .mutation(({ input }) => generateCampaignUtm(input.campaign)),
  }),
});

export type AppRouter = typeof appRouter;
