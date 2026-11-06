-- CreateTable
CREATE TABLE `form_options` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `list_key` VARCHAR(32) NOT NULL,
    `label` VARCHAR(150) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `list_label`(`list_key`, `label`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Start every list with the values the ticket form had built in, so nothing changes on deploy.
INSERT INTO `form_options` (`list_key`, `label`, `sort_order`) VALUES
    ('location', 'PHN Shah Alam', 0),
    ('location', 'PHN Shah Alam 2', 1),
    ('location', 'PHN Bukit Beruntung', 2),
    ('location', 'PHN Pegoh', 3),
    ('location', 'PHN Pekan', 4),
    ('location', 'PHN Rasa', 5),
    ('location', 'PHN Fif', 6),
    ('location', 'DHMSB', 7),
    ('location', 'OSI Shah Alam', 8),
    ('location', 'OSI Tanjung Malim', 9);

INSERT INTO `form_options` (`list_key`, `label`, `sort_order`) VALUES
    ('department', '-', 0),
    ('department', 'BUSINESS DEVELOPMENT', 1),
    ('department', 'CEO OFFICE', 2),
    ('department', 'COSTING AND COMMERCIAL', 3),
    ('department', 'CULTURE AND TALENT MANAGEMENT', 4),
    ('department', 'ENERGY MGMT AUTHORITY LIASON', 5),
    ('department', 'ENERGY SOLUTION', 6),
    ('department', 'ENGINEERING MANAGEMENT I', 7),
    ('department', 'ENGINEERING MANAGEMENT II', 8),
    ('department', 'EQUIPMENT MAINT I - SA 1, SA 2, DHMSB, PEGOH', 9),
    ('department', 'EQUIPMENT MAINT II - BB, RASA, TM1, TM2', 10),
    ('department', 'ESG HEALTH AND SAFETY', 11),
    ('department', 'FACILITY AND ENERGY MANAGEMENT', 12),
    ('department', 'FINANCE', 13),
    ('department', 'INVENTORY MGMT AND PLANNING', 14),
    ('department', 'IT AND DIGITALISATION', 15),
    ('department', 'MANUFACTURING AND SCM - BB/RASA', 16),
    ('department', 'MANUFACTURING AND SCM - PEGOH', 17),
    ('department', 'MANUFACTURING AND SCM - PEKAN', 18),
    ('department', 'MANUFACTURING AND SCM - SA1', 19),
    ('department', 'MANUFACTURING AND SCM - SA 2', 20),
    ('department', 'MANUFACTURING AND SCM - TM 1', 21),
    ('department', 'MANUFACTURING AND SCM - TM 2', 22),
    ('department', 'OPERATION I AND IMP', 23),
    ('department', 'OPERATION II', 24),
    ('department', 'OPERATION III', 25),
    ('department', 'OPERATION IV', 26),
    ('department', 'OPERATIONS', 27),
    ('department', 'PROCESS ENGINEERING', 28),
    ('department', 'PROCUREMENT & VENDOR DEV', 29),
    ('department', 'PROGRAM MANAGEMENT', 30),
    ('department', 'PROGRAM MANAGEMENT I', 31),
    ('department', 'PROGRAM MANAGEMENT II', 32),
    ('department', 'PROGRAM MANAGEMENT III', 33),
    ('department', 'QMS & SQ', 34),
    ('department', 'QUALITY ASSURANCE & CONTROL - BB, RASA, TM 1 AND TM 2', 35),
    ('department', 'QUALITY ASSURANCE & CONTROL SA 1', 36),
    ('department', 'QUALITY ASSURANCE & CONTROL SA 2', 37),
    ('department', 'QUALITY ASSURANCE & CONTROL-DEV - MLK PKN', 38),
    ('department', 'QUALITY DEVELOPMENT', 39),
    ('department', 'QUALITY MANAGEMENT', 40),
    ('department', 'QUALITY OPERATIONS', 41),
    ('department', 'RESEARCH AND DEVELOPMENT', 42),
    ('department', 'REWARDS AND ADMIN', 43),
    ('department', 'STRATEGIC BUSINESS PERFORMANCE', 44),
    ('department', 'TOOLING DESIGN AND DEVELOPMENT', 45);

INSERT INTO `form_options` (`list_key`, `label`, `sort_order`) VALUES
    ('request_type', 'Email - Active Directory', 0),
    ('request_type', 'BAAN Account', 1);
