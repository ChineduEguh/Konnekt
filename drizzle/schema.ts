import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  json,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const workspaces = mysqlTable("workspaces", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  ownerId: int("ownerId").notNull(),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const workspaceMembers = mysqlTable(
  "workspaceMembers",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull(),
    userId: int("userId").notNull(),
    role: mysqlEnum("role", ["owner", "admin", "member"])
      .default("member")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    memberUnique: uniqueIndex("workspace_member_unique").on(
      table.workspaceId,
      table.userId
    ),
    workspaceIdx: index("workspace_member_workspace_idx").on(table.workspaceId),
  })
);

export const smartLinks = mysqlTable(
  "smartLinks",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull(),
    createdBy: int("createdBy").notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    customDomain: varchar("customDomain", { length: 255 }),
    destinationUrl: text("destinationUrl").notNull(),
    utmSource: varchar("utmSource", { length: 120 }),
    utmMedium: varchar("utmMedium", { length: 120 }),
    utmCampaign: varchar("utmCampaign", { length: 120 }),
    expiresAt: timestamp("expiresAt"),
    passwordHash: varchar("passwordHash", { length: 255 }),
    routingRules: json("routingRules"),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    workspaceSlugUnique: uniqueIndex("smart_link_workspace_slug_unique").on(
      table.workspaceId,
      table.slug
    ),
    slugIdx: index("smart_link_slug_idx").on(table.slug),
  })
);

export const connectionEvents = mysqlTable(
  "connectionEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull(),
    linkId: int("linkId"),
    eventType: mysqlEnum("eventType", [
      "click",
      "scan",
      "registration",
      "checkin",
      "conversion",
    ])
      .default("click")
      .notNull(),
    occurredAt: timestamp("occurredAt").defaultNow().notNull(),
    ipAddress: varchar("ipAddress", { length: 64 }),
    country: varchar("country", { length: 80 }),
    deviceType: varchar("deviceType", { length: 40 }),
    browser: varchar("browser", { length: 80 }),
    referrer: text("referrer"),
    utmSource: varchar("utmSource", { length: 120 }),
    utmMedium: varchar("utmMedium", { length: 120 }),
    utmCampaign: varchar("utmCampaign", { length: 120 }),
    metadata: json("metadata"),
  },
  table => ({
    workspaceTimeIdx: index("connection_workspace_time_idx").on(
      table.workspaceId,
      table.occurredAt
    ),
    linkTimeIdx: index("connection_link_time_idx").on(
      table.linkId,
      table.occurredAt
    ),
  })
);

export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  createdBy: int("createdBy").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  venue: varchar("venue", { length: 240 }),
  startsAt: timestamp("startsAt").notNull(),
  capacity: int("capacity"),
  status: mysqlEnum("status", ["draft", "published", "ended"])
    .default("draft")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const ticketTiers = mysqlTable("ticketTiers", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  priceMinor: int("priceMinor").default(0).notNull(),
  currency: varchar("currency", { length: 3 }).default("NGN").notNull(),
  capacity: int("capacity"),
});

export const eventRegistrations = mysqlTable(
  "eventRegistrations",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull(),
    ticketTierId: int("ticketTierId"),
    workspaceId: int("workspaceId").notNull(),
    attendeeName: varchar("attendeeName", { length: 180 }).notNull(),
    attendeeEmail: varchar("attendeeEmail", { length: 320 }).notNull(),
    attendeePhone: varchar("attendeePhone", { length: 40 }),
    ticketCode: varchar("ticketCode", { length: 80 }).notNull().unique(),
    status: mysqlEnum("status", ["registered", "cancelled", "checked_in"])
      .default("registered")
      .notNull(),
    registeredAt: timestamp("registeredAt").defaultNow().notNull(),
    checkedInAt: timestamp("checkedInAt"),
  },
  table => ({
    eventEmailIdx: uniqueIndex("event_registration_email_unique").on(
      table.eventId,
      table.attendeeEmail
    ),
    ticketCodeIdx: index("event_registration_ticket_code_idx").on(
      table.ticketCode
    ),
  })
);

export const qrCodes = mysqlTable("qrCodes", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  smartLinkId: int("smartLinkId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  foregroundColor: varchar("foregroundColor", { length: 16 })
    .default("#003D32")
    .notNull(),
  backgroundColor: varchar("backgroundColor", { length: 16 })
    .default("#DDF8EC")
    .notNull(),
  shape: mysqlEnum("shape", ["square", "dots", "rounded"])
    .default("rounded")
    .notNull(),
  frameLabel: varchar("frameLabel", { length: 80 }),
  logoUrl: text("logoUrl"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  name: varchar("name", { length: 180 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 40 }),
  whatsappOptIn: boolean("whatsappOptIn").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export const whatsappConversations = mysqlTable(
  "whatsappConversations",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull(),
    contactId: int("contactId").notNull(),
    providerConversationId: varchar("providerConversationId", { length: 160 }),
    status: mysqlEnum("status", ["open", "closed"]).default("open").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    workspaceContactIdx: index(
      "whatsapp_conversation_workspace_contact_idx"
    ).on(table.workspaceId, table.contactId),
  })
);
export const payments = mysqlTable(
  "payments",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull(),
    provider: varchar("provider", { length: 80 }).notNull(),
    providerReference: varchar("providerReference", { length: 180 }),
    idempotencyKey: varchar("idempotencyKey", { length: 180 }).notNull(),
    amountMinor: int("amountMinor").notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    status: mysqlEnum("status", ["pending", "succeeded", "failed", "refunded"])
      .default("pending")
      .notNull(),
    metadata: json("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    idempotencyUnique: uniqueIndex("payment_workspace_idempotency_unique").on(
      table.workspaceId,
      table.idempotencyKey
    ),
    providerReferenceIdx: index("payment_provider_reference_idx").on(
      table.provider,
      table.providerReference
    ),
  })
);
export const paymentWebhookEvents = mysqlTable(
  "paymentWebhookEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    provider: varchar("provider", { length: 80 }).notNull(),
    providerEventId: varchar("providerEventId", { length: 180 }).notNull(),
    payloadHash: varchar("payloadHash", { length: 128 }).notNull(),
    processedAt: timestamp("processedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    providerEventUnique: uniqueIndex(
      "payment_webhook_provider_event_unique"
    ).on(table.provider, table.providerEventId),
  })
);
export const whatsappMessages = mysqlTable(
  "whatsappMessages",
  {
    id: int("id").autoincrement().primaryKey(),
    conversationId: int("conversationId").notNull(),
    providerMessageId: varchar("providerMessageId", { length: 160 }),
    direction: mysqlEnum("direction", ["inbound", "outbound"]).notNull(),
    body: text("body").notNull(),
    deliveryStatus: mysqlEnum("deliveryStatus", [
      "received",
      "queued",
      "sent",
      "failed",
      "deferred",
    ])
      .default("deferred")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    conversationTimeIdx: index("whatsapp_message_conversation_time_idx").on(
      table.conversationId,
      table.createdAt
    ),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type SmartLink = typeof smartLinks.$inferSelect;
export type EventRegistration = typeof eventRegistrations.$inferSelect;
export type QrCode = typeof qrCodes.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
