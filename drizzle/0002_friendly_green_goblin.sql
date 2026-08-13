CREATE TABLE `eventRegistrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`ticketTierId` int,
	`workspaceId` int NOT NULL,
	`attendeeName` varchar(180) NOT NULL,
	`attendeeEmail` varchar(320) NOT NULL,
	`attendeePhone` varchar(40),
	`ticketCode` varchar(80) NOT NULL,
	`status` enum('registered','cancelled','checked_in') NOT NULL DEFAULT 'registered',
	`registeredAt` timestamp NOT NULL DEFAULT (now()),
	`checkedInAt` timestamp,
	CONSTRAINT `eventRegistrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `eventRegistrations_ticketCode_unique` UNIQUE(`ticketCode`),
	CONSTRAINT `event_registration_email_unique` UNIQUE(`eventId`,`attendeeEmail`)
);
--> statement-breakpoint
CREATE TABLE `qrCodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`smartLinkId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`foregroundColor` varchar(16) NOT NULL DEFAULT '#003D32',
	`backgroundColor` varchar(16) NOT NULL DEFAULT '#DDF8EC',
	`shape` enum('square','dots','rounded') NOT NULL DEFAULT 'rounded',
	`frameLabel` varchar(80),
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `qrCodes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `event_registration_ticket_code_idx` ON `eventRegistrations` (`ticketCode`);