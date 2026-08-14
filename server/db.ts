import { and, desc, eq, sql } from "drizzle-orm";
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
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { isWorkspaceRoleAllowed } from "./security";

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
    .select({ capacity: events.capacity })
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
}
