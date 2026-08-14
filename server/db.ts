import { and, desc, eq, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  User,
  connectionEvents,
  contacts,
  eventRegistrations,
  events,
  qrCodes,
  smartLinks,
  ticketTiers,
  users,
  workspaceMembers,
  workspaces,
  whatsappConversations,
  whatsappMessages,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { isWorkspaceRoleAllowed } from "./security";
import { notifyWorkspaceOwner } from "./providers";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db
    .insert(users)
    .values(values)
    .onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result[0];
}

export async function getOrCreateWorkspace(user: User) {
  const db = await getDb();
  if (!db) return null;
  const membership = await db
    .select({ workspace: workspaces })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, user.id))
    .limit(1);
  if (membership[0]?.workspace) return membership[0].workspace;
  const slug = `${
    (user.name || "workspace")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 70) || "workspace"
  }-${user.id}`;
  const inserted = await db.insert(workspaces).values({
    name: `${user.name || "Your"} workspace`,
    slug,
    ownerId: user.id,
  });
  const workspaceId = Number(inserted[0].insertId);
  await db
    .insert(workspaceMembers)
    .values({ workspaceId, userId: user.id, role: "owner" });
  const created = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  return created[0] ?? null;
}

export async function getWorkspaceMembership(
  workspaceId: number,
  userId: number
) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    )
    .limit(1);
  return rows[0];
}

export async function requireWorkspaceRole(
  workspaceId: number,
  userId: number,
  allowedRoles: Array<"owner" | "admin" | "member"> = [
    "owner",
    "admin",
    "member",
  ]
) {
  const membership = await getWorkspaceMembership(workspaceId, userId);
  if (!isWorkspaceRoleAllowed(membership?.role, allowedRoles)) {
    throw new Error("Workspace access denied");
  }
  return membership;
}

export async function setWorkspaceScheduleCronTaskUid(
  workspaceId: number,
  taskUid: string
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(workspaces)
    .set({ scheduleCronTaskUid: taskUid })
    .where(eq(workspaces.id, workspaceId));
}

export async function listWorkspaceContacts(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(contacts)
    .where(eq(contacts.workspaceId, workspaceId))
    .orderBy(desc(contacts.updatedAt))
    .limit(100);
}

export async function createWorkspaceContact(
  input: typeof contacts.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const inserted = await db.insert(contacts).values(input);
  const rows = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, Number(inserted[0].insertId)))
    .limit(1);
  return rows[0];
}

export async function getContactTimeline(
  contactId: number,
  workspaceId: number
) {
  const db = await getDb();
  if (!db) return [];
  const contactRows = await db
    .select({ email: contacts.email, phone: contacts.phone })
    .from(contacts)
    .where(
      and(eq(contacts.id, contactId), eq(contacts.workspaceId, workspaceId))
    )
    .limit(1);
  const contact = contactRows[0];
  if (!contact) return [];
  const [conversationRows, registrations] = await Promise.all([
    db
      .select({ conversationId: whatsappConversations.id })
      .from(whatsappConversations)
      .where(
        and(
          eq(whatsappConversations.contactId, contactId),
          eq(whatsappConversations.workspaceId, workspaceId)
        )
      ),
    db
      .select({
        id: eventRegistrations.id,
        occurredAt: eventRegistrations.registeredAt,
        title: events.title,
        status: eventRegistrations.status,
        attendeeEmail: eventRegistrations.attendeeEmail,
      })
      .from(eventRegistrations)
      .innerJoin(events, eq(eventRegistrations.eventId, events.id))
      .where(
        and(
          eq(eventRegistrations.workspaceId, workspaceId),
          or(
            contact.email
              ? eq(eventRegistrations.attendeeEmail, contact.email)
              : undefined,
            contact.phone
              ? eq(eventRegistrations.attendeePhone, contact.phone)
              : undefined
          )
        )
      )
      .orderBy(desc(eventRegistrations.registeredAt)),
  ]);
  const messages = conversationRows.length
    ? await listWhatsappMessages(conversationRows[0].conversationId)
    : [];
  return [
    ...messages.map(message => ({
      id: `message-${message.id}`,
      occurredAt: message.createdAt,
      type: "conversation" as const,
      title:
        message.direction === "inbound"
          ? "Inbound WhatsApp message"
          : "Outbound WhatsApp message",
      detail: message.body,
      status: message.deliveryStatus,
    })),
    ...registrations.map(registration => ({
      id: `registration-${registration.id}`,
      occurredAt: registration.occurredAt,
      type: "event" as const,
      title: `Event registration: ${registration.title}`,
      detail: registration.attendeeEmail,
      status: registration.status,
    })),
  ].sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );
}

export async function getContactWorkspaceId(contactId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({ workspaceId: contacts.workspaceId })
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1);
  return rows[0]?.workspaceId;
}

export async function getOrCreateWhatsappConversation(
  workspaceId: number,
  contactId: number
) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await db
    .select()
    .from(whatsappConversations)
    .where(
      and(
        eq(whatsappConversations.workspaceId, workspaceId),
        eq(whatsappConversations.contactId, contactId),
        eq(whatsappConversations.status, "open")
      )
    )
    .limit(1);
  if (existing[0]) return existing[0];
  const inserted = await db.insert(whatsappConversations).values({
    workspaceId,
    contactId,
  });
  const rows = await db
    .select()
    .from(whatsappConversations)
    .where(eq(whatsappConversations.id, Number(inserted[0].insertId)))
    .limit(1);
  return rows[0];
}

export async function createWhatsappMessage(input: {
  conversationId: number;
  direction: "inbound" | "outbound";
  body: string;
  deliveryStatus?: "received" | "queued" | "sent" | "failed" | "deferred";
  providerMessageId?: string | null;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const inserted = await db.insert(whatsappMessages).values(input);
  const rows = await db
    .select()
    .from(whatsappMessages)
    .where(eq(whatsappMessages.id, Number(inserted[0].insertId)))
    .limit(1);
  return rows[0];
}

export async function listWhatsappMessages(conversationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(whatsappMessages)
    .where(eq(whatsappMessages.conversationId, conversationId))
    .orderBy(whatsappMessages.createdAt);
}

export async function getWorkspaceByScheduleCronTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.scheduleCronTaskUid, taskUid))
    .limit(1);
  return rows[0];
}

export async function getSmartLinkWorkspaceId(smartLinkId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({ workspaceId: smartLinks.workspaceId })
    .from(smartLinks)
    .where(eq(smartLinks.id, smartLinkId))
    .limit(1);
  return rows[0]?.workspaceId;
}

export async function getEventWorkspaceId(eventId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({ workspaceId: events.workspaceId })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  return rows[0]?.workspaceId;
}

export async function getRegistrationWorkspaceId(ticketCode: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({ workspaceId: events.workspaceId })
    .from(eventRegistrations)
    .innerJoin(events, eq(eventRegistrations.eventId, events.id))
    .where(eq(eventRegistrations.ticketCode, ticketCode))
    .limit(1);
  return rows[0]?.workspaceId;
}

export async function getWorkspaceLinks(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(smartLinks)
    .where(eq(smartLinks.workspaceId, workspaceId))
    .orderBy(desc(smartLinks.createdAt))
    .limit(20);
}

export async function getWorkspaceSummary(workspaceId: number) {
  const db = await getDb();
  if (!db)
    return {
      clicks: 0,
      scans: 0,
      links: 0,
      contacts: 0,
      events: 0,
      recentEvents: [],
      topLinks: [],
    };
  const [clicks] = await db
    .select({ count: sql<number>`count(*)` })
    .from(connectionEvents)
    .where(
      and(
        eq(connectionEvents.workspaceId, workspaceId),
        eq(connectionEvents.eventType, "click")
      )
    );
  const [scans] = await db
    .select({ count: sql<number>`count(*)` })
    .from(connectionEvents)
    .where(
      and(
        eq(connectionEvents.workspaceId, workspaceId),
        eq(connectionEvents.eventType, "scan")
      )
    );
  const [links] = await db
    .select({ count: sql<number>`count(*)` })
    .from(smartLinks)
    .where(eq(smartLinks.workspaceId, workspaceId));
  const [contactCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(contacts)
    .where(eq(contacts.workspaceId, workspaceId));
  const [eventCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(events)
    .where(eq(events.workspaceId, workspaceId));
  const recentEvents = await db
    .select()
    .from(connectionEvents)
    .where(eq(connectionEvents.workspaceId, workspaceId))
    .orderBy(desc(connectionEvents.occurredAt))
    .limit(8);
  const topLinks = await db
    .select({ linkId: connectionEvents.linkId, count: sql<number>`count(*)` })
    .from(connectionEvents)
    .where(eq(connectionEvents.workspaceId, workspaceId))
    .groupBy(connectionEvents.linkId)
    .orderBy(desc(sql`count(*)`))
    .limit(5);
  return {
    clicks: Number(clicks?.count ?? 0),
    scans: Number(scans?.count ?? 0),
    links: Number(links?.count ?? 0),
    contacts: Number(contactCount?.count ?? 0),
    events: Number(eventCount?.count ?? 0),
    recentEvents,
    topLinks,
  };
}

export async function createWorkspaceLink(
  input: typeof smartLinks.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(smartLinks).values(input);
  const rows = await db
    .select()
    .from(smartLinks)
    .where(eq(smartLinks.id, Number(result[0].insertId)))
    .limit(1);
  return rows[0];
}

export async function findLinkBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(smartLinks)
    .where(and(eq(smartLinks.slug, slug), eq(smartLinks.active, true)))
    .limit(1);
  return rows[0];
}

export async function listWorkspaceEvents(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(events)
    .where(eq(events.workspaceId, workspaceId))
    .orderBy(desc(events.startsAt))
    .limit(20);
}

export async function createWorkspaceEvent(input: typeof events.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(events).values(input);
  const rows = await db
    .select()
    .from(events)
    .where(eq(events.id, Number(result[0].insertId)))
    .limit(1);
  return rows[0];
}

export async function listEventRegistrations(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(eventRegistrations)
    .where(eq(eventRegistrations.eventId, eventId))
    .orderBy(desc(eventRegistrations.registeredAt));
}

export async function registerAttendee(
  input: typeof eventRegistrations.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const eventRows = await db
    .select({
      capacity: events.capacity,
      workspaceId: events.workspaceId,
      title: events.title,
    })
    .from(events)
    .where(eq(events.id, input.eventId))
    .limit(1);
  const event = eventRows[0];
  if (!event) throw new Error("Event not found");
  const [registered] = await db
    .select({ count: sql<number>`count(*)` })
    .from(eventRegistrations)
    .where(
      and(
        eq(eventRegistrations.eventId, input.eventId),
        eq(eventRegistrations.status, "registered")
      )
    );
  if (event.capacity && Number(registered?.count ?? 0) >= event.capacity)
    throw new Error("Event capacity reached");
  const result = await db.insert(eventRegistrations).values(input);
  const rows = await db
    .select()
    .from(eventRegistrations)
    .where(eq(eventRegistrations.id, Number(result[0].insertId)))
    .limit(1);
  if (event.capacity) {
    const [updatedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(eventRegistrations)
      .where(
        and(
          eq(eventRegistrations.eventId, input.eventId),
          eq(eventRegistrations.status, "registered")
        )
      );
    if (Number(updatedCount?.count ?? 0) >= event.capacity) {
      void notifyWorkspaceOwner({
        workspaceId: event.workspaceId,
        type: "event_sellout",
        title: `${event.title} is sold out`,
        body: `The event reached its configured capacity of ${event.capacity}.`,
      });
    }
  }
  return rows[0];
}

export async function findRegistrationByTicketCode(ticketCode: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(eventRegistrations)
    .where(eq(eventRegistrations.ticketCode, ticketCode))
    .limit(1);
  return rows[0];
}

export async function checkInRegistration(ticketCode: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const registration = await findRegistrationByTicketCode(ticketCode);
  if (!registration) return { status: "not_found" as const };
  if (registration.status === "checked_in")
    return { status: "already_checked_in" as const, registration };
  if (registration.status === "cancelled")
    return { status: "cancelled" as const, registration };
  await db
    .update(eventRegistrations)
    .set({ status: "checked_in", checkedInAt: new Date() })
    .where(eq(eventRegistrations.id, registration.id));
  return {
    status: "checked_in" as const,
    registration: {
      ...registration,
      status: "checked_in" as const,
      checkedInAt: new Date(),
    },
  };
}

export async function getQrScanAnalytics(
  workspaceId: number,
  from?: Date,
  to?: Date
) {
  const db = await getDb();
  if (!db) return [];
  const clauses = [
    eq(connectionEvents.workspaceId, workspaceId),
    eq(connectionEvents.eventType, "scan"),
  ];
  if (from) clauses.push(sql`${connectionEvents.occurredAt} >= ${from}` as any);
  if (to) clauses.push(sql`${connectionEvents.occurredAt} <= ${to}` as any);
  return db
    .select({
      day: sql<string>`DATE(${connectionEvents.occurredAt})`,
      scans: sql<number>`COUNT(*)`,
    })
    .from(connectionEvents)
    .where(and(...clauses))
    .groupBy(sql`DATE(${connectionEvents.occurredAt})`)
    .orderBy(sql`DATE(${connectionEvents.occurredAt})`);
}

export async function getAnalyticsOverview(
  workspaceId: number,
  from?: Date,
  to?: Date
) {
  const db = await getDb();
  if (!db)
    return {
      geography: [],
      devices: [],
      browsers: [],
      topLinks: [],
      funnel: { clicks: 0, scans: 0, registrations: 0, checkins: 0 },
    };
  const baseClauses = [eq(connectionEvents.workspaceId, workspaceId)];
  if (from)
    baseClauses.push(sql`${connectionEvents.occurredAt} >= ${from}` as any);
  if (to) baseClauses.push(sql`${connectionEvents.occurredAt} <= ${to}` as any);
  const [
    geography,
    devices,
    browsers,
    topLinks,
    clicks,
    scans,
    registrations,
    checkins,
  ] = await Promise.all([
    db
      .select({
        country: connectionEvents.country,
        count: sql<number>`COUNT(*)`,
      })
      .from(connectionEvents)
      .where(and(...baseClauses, eq(connectionEvents.eventType, "scan")))
      .groupBy(connectionEvents.country)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10),
    db
      .select({
        device: connectionEvents.deviceType,
        count: sql<number>`COUNT(*)`,
      })
      .from(connectionEvents)
      .where(and(...baseClauses, eq(connectionEvents.eventType, "scan")))
      .groupBy(connectionEvents.deviceType)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10),
    db
      .select({
        browser: connectionEvents.browser,
        count: sql<number>`COUNT(*)`,
      })
      .from(connectionEvents)
      .where(and(...baseClauses, eq(connectionEvents.eventType, "scan")))
      .groupBy(connectionEvents.browser)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10),
    db
      .select({
        linkId: connectionEvents.linkId,
        slug: smartLinks.slug,
        count: sql<number>`COUNT(*)`,
      })
      .from(connectionEvents)
      .leftJoin(smartLinks, eq(connectionEvents.linkId, smartLinks.id))
      .where(and(...baseClauses, sql`${connectionEvents.linkId} IS NOT NULL`))
      .groupBy(connectionEvents.linkId, smartLinks.slug)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(connectionEvents)
      .where(and(...baseClauses, eq(connectionEvents.eventType, "click"))),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(connectionEvents)
      .where(and(...baseClauses, eq(connectionEvents.eventType, "scan"))),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(eventRegistrations)
      .where(
        and(
          eq(eventRegistrations.workspaceId, workspaceId),
          from ? sql`${eventRegistrations.registeredAt} >= ${from}` : undefined,
          to ? sql`${eventRegistrations.registeredAt} <= ${to}` : undefined
        )
      ),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(eventRegistrations)
      .where(
        and(
          eq(eventRegistrations.workspaceId, workspaceId),
          eq(eventRegistrations.status, "checked_in"),
          from ? sql`${eventRegistrations.checkedInAt} >= ${from}` : undefined,
          to ? sql`${eventRegistrations.checkedInAt} <= ${to}` : undefined
        )
      ),
  ]);
  return {
    geography,
    devices,
    browsers,
    topLinks,
    funnel: {
      clicks: Number(clicks[0]?.count ?? 0),
      scans: Number(scans[0]?.count ?? 0),
      registrations: Number(registrations[0]?.count ?? 0),
      checkins: Number(checkins[0]?.count ?? 0),
    },
  };
}

export async function listWorkspaceQrCodes(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(qrCodes)
    .where(eq(qrCodes.workspaceId, workspaceId))
    .orderBy(desc(qrCodes.createdAt))
    .limit(20);
}

export async function deleteQrCode(workspaceId: number, qrId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db
    .delete(qrCodes)
    .where(and(eq(qrCodes.id, qrId), eq(qrCodes.workspaceId, workspaceId)));
  return Number(result[0]?.affectedRows ?? 0) > 0;
}

export async function createQrCode(input: typeof qrCodes.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(qrCodes).values(input);
  const rows = await db
    .select()
    .from(qrCodes)
    .where(eq(qrCodes.id, Number(result[0].insertId)))
    .limit(1);
  return rows[0];
}

export async function recordConnectionEvent(
  input: typeof connectionEvents.$inferInsert
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(connectionEvents).values(input);
  if (input.eventType === "click") {
    const [clicks] = await db
      .select({ count: sql<number>`count(*)` })
      .from(connectionEvents)
      .where(
        and(
          eq(connectionEvents.workspaceId, input.workspaceId),
          eq(connectionEvents.eventType, "click")
        )
      );
    const totalClicks = Number(clicks?.count ?? 0);
    if (totalClicks > 0 && totalClicks % 100 === 0) {
      void notifyWorkspaceOwner({
        workspaceId: input.workspaceId,
        type: "click_milestone",
        title: `${totalClicks.toLocaleString()} clicks captured`,
        body: "Your connection layer reached a new click milestone.",
      });
    }
  }
}
