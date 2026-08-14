CREATE TABLE `whatsappConversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`contactId` int NOT NULL,
	`providerConversationId` varchar(160),
	`status` enum('open','closed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsappConversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsappMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`providerMessageId` varchar(160),
	`direction` enum('inbound','outbound') NOT NULL,
	`body` text NOT NULL,
	`deliveryStatus` enum('received','queued','sent','failed','deferred') NOT NULL DEFAULT 'deferred',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `whatsappMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `whatsapp_conversation_workspace_contact_idx` ON `whatsappConversations` (`workspaceId`,`contactId`);--> statement-breakpoint
CREATE INDEX `whatsapp_message_conversation_time_idx` ON `whatsappMessages` (`conversationId`,`createdAt`);