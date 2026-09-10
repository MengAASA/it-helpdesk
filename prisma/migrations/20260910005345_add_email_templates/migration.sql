-- CreateTable
CREATE TABLE `email_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `template_key` VARCHAR(64) NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `body_html` TEXT NOT NULL,
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_by` VARCHAR(255) NULL,

    UNIQUE INDEX `template_key`(`template_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
