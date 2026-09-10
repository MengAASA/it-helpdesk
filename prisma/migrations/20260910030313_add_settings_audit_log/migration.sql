-- CreateTable
CREATE TABLE `settings_audit_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `category` VARCHAR(32) NOT NULL,
    `target` VARCHAR(64) NULL,
    `summary` VARCHAR(500) NOT NULL,
    `actor_name` VARCHAR(255) NOT NULL,
    `actor_email` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `category`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
