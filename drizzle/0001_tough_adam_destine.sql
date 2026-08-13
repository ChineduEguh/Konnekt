CREATE TABLE `connectionEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`linkId` int,
	`eventType` enum('click','scan','registration','checkin','conversion') NOT NULL DEFAULT 'click',
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	`ipAddress` varchar(64),
	`country` varchar(80),
	`deviceType` varchar(40),
	`browser` varchar(80),
	`referrer` text,
	`utmSource` varchar(120),
	`utmMedium` varchar(120),
	`utmCampaign` varchar(120),
	`metadata` json,
	CONSTRAINT `connectionEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`name` varchar(180),
	`email` varchar(320),
	`phone` varchar(40),
	`whatsappOptIn` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`createdBy` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`venue` varchar(240),
	`startsAt` timestamp NOT NULL,
	`capacity` int,
	`status` enum('draft','published','ended') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `smartLinks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`createdBy` int NOT NULL,
	`slug` varchar(120) NOT NULL,
	`destinationUrl` text NOT NULL,
	`utmSource` varchar(120),
	`utmMedium` varchar(120),
	`utmCampaign` varchar(120),
	`expiresAt` timestamp,
	`passwordHash` varchar(255),
	`routingRules` json,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `smartLinks_id` PRIMARY KEY(`id`),
	CONSTRAINT `smart_link_workspace_slug_unique` UNIQUE(`workspaceId`,`slug`)
);
--> statement-breakpoint
CREATE TABLE `ticketTiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`priceMinor` int NOT NULL DEFAULT 0,
	`currency` varchar(3) NOT NULL DEFAULT 'NGN',
	`capacity` int,
	CONSTRAINT `ticketTiers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workspaceMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','member') NOT NULL DEFAULT 'member',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workspaceMembers_id` PRIMARY KEY(`id`),
	CONSTRAINT `workspace_member_unique` UNIQUE(`workspaceId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`ownerId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workspaces_id` PRIMARY KEY(`id`),
	CONSTRAINT `workspaces_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE INDEX `connection_workspace_time_idx` ON `connectionEvents` (`workspaceId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `connection_link_time_idx` ON `connectionEvents` (`linkId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `smart_link_slug_idx` ON `smartLinks` (`slug`);--> statement-breakpoint
CREATE INDEX `workspace_member_workspace_idx` ON `workspaceMembers` (`workspaceId`);