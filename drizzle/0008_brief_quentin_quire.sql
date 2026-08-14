ALTER TABLE `qrCodes` MODIFY COLUMN `smartLinkId` int;--> statement-breakpoint
ALTER TABLE `qrCodes` ADD `destinationUrl` text;