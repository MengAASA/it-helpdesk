-- AlterTable
ALTER TABLE `user_permissions` ADD COLUMN `manage_categories` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `manage_email_settings` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `manage_sla` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `manage_templates` BOOLEAN NOT NULL DEFAULT true;
