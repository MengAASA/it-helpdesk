-- CreateTable
CREATE TABLE `active_sessions` (
    `staff_no` VARCHAR(64) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `last_seen` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`staff_no`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attachments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ticket_id` INTEGER NOT NULL,
    `filename` VARCHAR(255) NOT NULL,
    `size` INTEGER NOT NULL,
    `mime_type` VARCHAR(255) NOT NULL,
    `stored_path` VARCHAR(500) NOT NULL,

    INDEX `ticket_id`(`ticket_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `team` VARCHAR(32) NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_settings` (
    `id` TINYINT NOT NULL DEFAULT 1,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `smtp_host` VARCHAR(255) NULL,
    `smtp_port` INTEGER NULL,
    `smtp_secure` BOOLEAN NOT NULL DEFAULT false,
    `smtp_username` VARCHAR(255) NULL,
    `smtp_password` VARCHAR(255) NULL,
    `from_name` VARCHAR(255) NULL,
    `from_email` VARCHAR(255) NULL,
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(255) NULL,
    `notify_assigned` BOOLEAN NOT NULL DEFAULT true,
    `notify_status_changed` BOOLEAN NOT NULL DEFAULT true,
    `notify_new_reply` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sla_settings` (
    `id` TINYINT NOT NULL DEFAULT 1,
    `low_hours` INTEGER NOT NULL DEFAULT 120,
    `normal_hours` INTEGER NOT NULL DEFAULT 72,
    `high_hours` INTEGER NOT NULL DEFAULT 24,
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(255) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `team_round_robin` (
    `team` VARCHAR(32) NOT NULL,
    `last_assigned_staff_no` VARCHAR(64) NULL,
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`team`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ticket_id` INTEGER NOT NULL,
    `event_type` VARCHAR(32) NOT NULL,
    `from_value` VARCHAR(255) NULL,
    `to_value` VARCHAR(255) NULL,
    `actor_name` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `ticket_id`(`ticket_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_notes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ticket_id` INTEGER NOT NULL,
    `author_name` VARCHAR(255) NOT NULL,
    `author_email` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_public` BOOLEAN NOT NULL DEFAULT false,

    INDEX `ticket_id`(`ticket_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tickets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ticket_number` VARCHAR(64) NOT NULL,
    `category` VARCHAR(255) NOT NULL,
    `team` VARCHAR(255) NOT NULL,
    `priority` VARCHAR(32) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'Open',
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `staff_no` VARCHAR(64) NOT NULL,
    `phone` VARCHAR(64) NOT NULL,
    `location` VARCHAR(255) NOT NULL,
    `department` VARCHAR(255) NOT NULL,
    `user_request_types` TEXT NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `assigned_to` VARCHAR(255) NULL,
    `feedback` VARCHAR(10) NULL,
    `feedback_at` DATETIME(0) NULL,

    UNIQUE INDEX `ticket_number`(`ticket_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_permissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `staff_no` VARCHAR(64) NOT NULL,
    `manage_tickets` BOOLEAN NOT NULL DEFAULT true,
    `view_reports` BOOLEAN NOT NULL DEFAULT true,
    `manage_users` BOOLEAN NOT NULL DEFAULT true,
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(255) NULL,
    `team` VARCHAR(32) NULL,
    `name` VARCHAR(255) NULL,
    `email` VARCHAR(255) NULL,

    UNIQUE INDEX `staff_no`(`staff_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `canned_responses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `body` TEXT NOT NULL,
    `is_public` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ticket_events` ADD CONSTRAINT `ticket_events_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ticket_notes` ADD CONSTRAINT `ticket_notes_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

