ALTER TABLE `qrCodes` ADD `foregroundEndColor` varchar(16);--> statement-breakpoint
ALTER TABLE `qrCodes` ADD `frameStyle` enum('minimal','pill','bold') DEFAULT 'minimal' NOT NULL;