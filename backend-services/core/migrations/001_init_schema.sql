-- ========================================
-- SuperApp Database Schema
-- ========================================
-- Version: 2.0
-- Created: 2025-12-05
-- Description: Complete database schema for SuperApp with proper constraints,
--              foreign keys, indexes, and cascade rules
-- ========================================

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS `superapp-database` 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_0900_ai_ci;

USE `superapp-database`;


-- ========================================
-- DROP TABLES (in correct order due to foreign keys)
-- ========================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `micro_app_config`;
DROP TABLE IF EXISTS `micro_app_role`;
DROP TABLE IF EXISTS `micro_app_version`;
DROP TABLE IF EXISTS `micro_app`;

DROP TABLE IF EXISTS `device_tokens`;
DROP TABLE IF EXISTS `notification_logs`;

DROP TABLE IF EXISTS `o_auth2_clients`;

DROP TABLE IF EXISTS `user_config`;
DROP TABLE IF EXISTS `users`;

DROP TABLE IF EXISTS `micro_apps_storage`;

SET FOREIGN_KEY_CHECKS = 1;

-- ========================================
-- TABLE: micro_app
-- Description: Stores micro application metadata
-- ========================================

CREATE TABLE `micro_app` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT 'Internal auto-increment ID',
  `micro_app_id` VARCHAR(255) NOT NULL COMMENT 'Unique micro app identifier',
  `name` VARCHAR(1024) NOT NULL COMMENT 'Micro app display name',
  `description` TEXT COMMENT 'Detailed description of the micro app',
  `promo_text` VARCHAR(1024) DEFAULT NULL COMMENT 'Promotional/marketing text',
  `icon_url` VARCHAR(2083) DEFAULT NULL COMMENT 'URL to micro app icon',
  `banner_image_url` VARCHAR(2083) DEFAULT NULL COMMENT 'URL to banner image',
  `created_by` VARCHAR(319) NOT NULL COMMENT 'Email of creator',
  `updated_by` VARCHAR(319) DEFAULT NULL COMMENT 'Email of last updater',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation timestamp',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
  `active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Active status (1=active, 0=soft deleted)',
  `mandatory` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Mandatory installation flag (1=mandatory, 0=optional)',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_micro_app_app_id` (`micro_app_id`),
  
  INDEX `idx_micro_app_active` (`active`),
  INDEX `idx_micro_app_mandatory` (`mandatory`),
  INDEX `idx_micro_app_created_at` (`created_at`),
  INDEX `idx_micro_app_name` (`name`(255))
) ENGINE=InnoDB 
  AUTO_INCREMENT=1 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Micro application metadata';

-- ========================================
-- TABLE: micro_app_version
-- Description: Stores versions and builds for each micro app
-- ========================================

CREATE TABLE `micro_app_version` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT 'Internal auto-increment ID',
  `micro_app_id` VARCHAR(255) NOT NULL COMMENT 'Reference to micro_app.micro_app_id',
  `version` VARCHAR(32) NOT NULL COMMENT 'Version number (e.g., 1.0.0)',
  `build` INT NOT NULL COMMENT 'Build number (unique per micro_app)',
  `release_notes` TEXT COMMENT 'Release notes for this version',
  `icon_url` VARCHAR(2083) DEFAULT NULL COMMENT 'URL to version-specific icon',
  `download_url` VARCHAR(2083) NOT NULL COMMENT 'URL to download the micro app package',
  `created_by` VARCHAR(319) NOT NULL COMMENT 'Email of creator',
  `updated_by` VARCHAR(319) DEFAULT NULL COMMENT 'Email of last updater',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation timestamp',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
  `active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Active status (1=active, 0=soft deleted)',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_mav_app_build` (`micro_app_id`, `build`),
  UNIQUE KEY `uq_mav_app_version_build` (`micro_app_id`, `version`, `build`),
  
  INDEX `idx_mav_app` (`micro_app_id`),
  INDEX `idx_mav_version` (`version`),
  INDEX `idx_mav_build` (`build`),
  INDEX `idx_mav_active` (`active`),
  
  CONSTRAINT `fk_mav_micro_app` 
    FOREIGN KEY (`micro_app_id`) 
    REFERENCES `micro_app` (`micro_app_id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB 
  AUTO_INCREMENT=1 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Micro application versions and builds';

-- ========================================
-- TABLE: micro_app_role
-- Description: Maps micro apps to user roles for access control
-- ========================================

CREATE TABLE `micro_app_role` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT 'Internal auto-increment ID',
  `micro_app_id` VARCHAR(255) NOT NULL COMMENT 'Reference to micro_app.micro_app_id',
  `role` VARCHAR(255) NOT NULL COMMENT 'User role/group name',
  `active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Active status (1=active, 0=soft deleted)',
  `created_by` VARCHAR(319) NOT NULL COMMENT 'Email of creator',
  `updated_by` VARCHAR(319) DEFAULT NULL COMMENT 'Email of last updater',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation timestamp',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_mar_app_role` (`micro_app_id`, `role`),
  
  INDEX `idx_mar_app` (`micro_app_id`),
  INDEX `idx_mar_role` (`role`),
  INDEX `idx_mar_active` (`active`),
  
  CONSTRAINT `fk_mar_micro_app` 
    FOREIGN KEY (`micro_app_id`) 
    REFERENCES `micro_app` (`micro_app_id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB 
  AUTO_INCREMENT=1 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Micro application role mappings for access control';

-- ========================================
-- TABLE: micro_app_config
-- Description: Stores configuration settings for each micro application
-- ========================================

CREATE TABLE `micro_app_config` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Internal auto-increment ID',
  `micro_app_id` VARCHAR(255) NOT NULL COMMENT 'Reference to micro_app.micro_app_id',
  `config_key` VARCHAR(191) NOT NULL COMMENT 'Configuration key name',
  `config_value` JSON NOT NULL COMMENT 'Configuration value (JSON format)',
  `active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Active status (1=active, 0=inactive)',
  `created_by` VARCHAR(319) NOT NULL COMMENT 'Email of creator',
  `updated_by` VARCHAR(319) DEFAULT NULL COMMENT 'Email of last updater',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation timestamp',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_micro_app_config` (`micro_app_id`, `config_key`),

  INDEX `idx_mac_app` (`micro_app_id`),
  INDEX `idx_mac_key` (`config_key`),
  INDEX `idx_mac_active` (`active`),

  CONSTRAINT `fk_mac_micro_app`
    FOREIGN KEY (`micro_app_id`)
    REFERENCES `micro_app` (`micro_app_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB
  AUTO_INCREMENT=1
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Per-micro-app configuration (JSON)';

-- Tables for Notification Service 

-- ========================================
-- TABLE: device_tokens
-- Description: Stores device tokens for push notifications
-- ========================================

CREATE TABLE `device_tokens` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Internal auto-increment ID',
  `user_email` VARCHAR(255) NOT NULL COMMENT 'User email address',
  `device_token` TEXT NOT NULL COMMENT 'FCM/APNS device token',
  `platform` ENUM('ios', 'android') NOT NULL COMMENT 'Device platform',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation timestamp',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Active status (1=active, 0=inactive)',
  
  PRIMARY KEY (`id`),
  
  INDEX `idx_device_tokens_user_email` (`user_email`),
  INDEX `idx_device_tokens_is_active` (`is_active`),
  INDEX `idx_device_tokens_platform` (`platform`)
) ENGINE=InnoDB 
  AUTO_INCREMENT=1 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Device tokens for push notifications';

-- ========================================
-- TABLE: notification_logs
-- Description: Logs all sent push notifications
-- ========================================

CREATE TABLE `notification_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Internal auto-increment ID',
  `user_email` VARCHAR(255) NOT NULL COMMENT 'User email address',
  `title` VARCHAR(255) DEFAULT NULL COMMENT 'Notification title',
  `body` TEXT DEFAULT NULL COMMENT 'Notification body',
  `data` JSON DEFAULT NULL COMMENT 'Additional notification data (JSON)',
  `sent_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Sent timestamp',
  `status` VARCHAR(50) DEFAULT NULL COMMENT 'Delivery status',
  `microapp_id` VARCHAR(100) DEFAULT NULL COMMENT 'Associated micro app ID',
  
  PRIMARY KEY (`id`),
  
  INDEX `idx_notification_logs_user_email` (`user_email`),
  INDEX `idx_notification_logs_microapp_id` (`microapp_id`),
  INDEX `idx_notification_logs_sent_at` (`sent_at`),
  INDEX `idx_notification_logs_status` (`status`)
) ENGINE=InnoDB 
  AUTO_INCREMENT=1 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Push notification logs';

-- Tables for Internal Token Issuer Service 

-- ========================================
-- TABLE: o_auth2_clients
-- Description: OAuth2 client credentials for service-to-service authentication
-- ========================================

CREATE TABLE `o_auth2_clients` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Internal auto-increment ID',
  `client_id` VARCHAR(255) NOT NULL COMMENT 'OAuth2 client ID',
  `client_secret` TEXT NOT NULL COMMENT 'OAuth2 client secret (bcrypt hashed, ~60 chars)',
  `name` VARCHAR(255) NOT NULL COMMENT 'Client name/description',
  `scopes` VARCHAR(1024) DEFAULT NULL COMMENT 'Allowed scopes (comma-separated)',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Active status (1=active, 0=inactive)',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation timestamp',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
  `deleted_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'Soft delete timestamp',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_oauth2_client_id` (`client_id`),
  
  INDEX `idx_oauth2_clients_is_active` (`is_active`),
  INDEX `idx_oauth2_clients_deleted_at` (`deleted_at`)
) ENGINE=InnoDB 
  AUTO_INCREMENT=1 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_0900_ai_ci
  COMMENT='OAuth2 client credentials for service authentication';

-- Tables for DB User Service 

-- ========================================
-- TABLE: users
-- Description: Stores user profile information
-- ========================================

CREATE TABLE `users` (
  `email` VARCHAR(100) NOT NULL COMMENT 'User email address (Primary Key)',
  `firstName` VARCHAR(50) DEFAULT NULL COMMENT 'User first name',
  `lastName` VARCHAR(50) DEFAULT NULL COMMENT 'User last name',
  `userThumbnail` VARCHAR(255) DEFAULT NULL COMMENT 'URL to user profile picture',
  `location` VARCHAR(100) DEFAULT NULL COMMENT 'User location/city',
  
  PRIMARY KEY (`email`),
  
  INDEX `idx_users_name` (`firstName`, `lastName`),
  INDEX `idx_users_location` (`location`)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_0900_ai_ci
  COMMENT='User profile information';

-- ========================================
-- TABLE: user_config
-- Description: Stores user-specific configuration settings
-- ========================================

CREATE TABLE `user_config` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Internal auto-increment ID',
  `email` VARCHAR(191) NOT NULL COMMENT 'User email address',
  `config_key` VARCHAR(191) NOT NULL COMMENT 'Configuration key name',
  `config_value` JSON NOT NULL COMMENT 'Configuration value (JSON format)',
  `active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Active status (1=active, 0=inactive)',
  `created_by` VARCHAR(191) NOT NULL COMMENT 'Email of creator',
  `updated_by` VARCHAR(191) NOT NULL COMMENT 'Email of last updater',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation timestamp',
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_config_email_key` (`email`, `config_key`),
  
  INDEX `idx_user_config_email` (`email`),
  INDEX `idx_user_config_key` (`config_key`),
  INDEX `idx_user_config_active` (`active`),
  
  CONSTRAINT `fk_user_config_user`
    FOREIGN KEY (`email`)
    REFERENCES `users` (`email`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB 
  AUTO_INCREMENT=1 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_0900_ai_ci
  COMMENT='User-specific configuration settings';

-- Tables for DB File Service 

-- ========================================
-- TABLE: micro_apps_storage
-- Description: Stores micro app files as BLOBs in the database
-- ========================================

CREATE TABLE `micro_apps_storage` (
  `file_name` VARCHAR(255) NOT NULL COMMENT 'Unique file name (Primary Key)',
  `blob_content` MEDIUMBLOB NOT NULL COMMENT 'Binary content of the file',
  
  PRIMARY KEY (`file_name`)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_0900_ai_ci
  COMMENT='File storage for micro app assets';

-- ========================================
-- ADDITIONAL CONSTRAINTS & NOTES
-- ========================================

/*
CASCADE RULES EXPLAINED:
========================

1. micro_app_version.micro_app_id -> micro_app.micro_app_id
   - ON DELETE CASCADE: When a micro_app is deleted, all its versions are automatically deleted
   - ON UPDATE CASCADE: When micro_app_id changes, it updates in all related versions

2. micro_app_role.micro_app_id -> micro_app.micro_app_id
   - ON DELETE CASCADE: When a micro_app is deleted, all its role mappings are automatically deleted
   - ON UPDATE CASCADE: When micro_app_id changes, it updates in all related role mappings

3. micro_app_config.micro_app_id -> micro_app.micro_app_id
   - ON DELETE CASCADE: When a micro_app is deleted, all its configurations are automatically deleted
   - ON UPDATE CASCADE: When micro_app_id changes, it updates in all related configurations

4. user_config.email -> users.email
   - ON DELETE CASCADE: When a user is deleted, all their configurations are automatically deleted
   - ON UPDATE CASCADE: When user email changes, it updates in all related configurations

SOFT DELETE PATTERN:
===================
- Tables with 'active' column use soft delete pattern
- Instead of DELETE, set active=0 to mark as deleted
- Queries should include WHERE active=1 to exclude soft-deleted records
- o_auth2_clients uses 'deleted_at' timestamp for soft deletes

INDEXING STRATEGY:
==================
- Primary keys for unique identification
- Foreign key columns are indexed for JOIN performance
- Frequently queried columns (active, version, role, platform, status) are indexed
- Composite indexes on unique constraints for data integrity
- Email columns are indexed for user lookups

DATA TYPES:
===========
- VARCHAR(100-319): Email addresses and names
- VARCHAR(2083): URLs (max IE URL length)
- TEXT: Large text fields without length limit
- MEDIUMBLOB: Binary file storage (up to 16MB)
- JSON: Structured configuration data
- DATETIME/TIMESTAMP: Timestamps with date and time
- TINYINT(1): Boolean flags (0/1)
- ENUM: Predefined value sets (platform types)

CHARACTER SET:
==============
- utf8mb4: Full Unicode support including emojis
- utf8mb4_0900_ai_ci: Accent-insensitive, case-insensitive collation

TABLE RELATIONSHIPS:
===================
- users (independent)
  └── user_config (FK: email)

- micro_app (independent)
  ├── micro_app_version (FK: micro_app_id)
  ├── micro_app_role (FK: micro_app_id)
  └── micro_app_config (FK: micro_app_id)

- device_tokens (references users.email, no FK for flexibility)
- notification_logs (references users.email and micro_app.micro_app_id, no FK for flexibility)
- micro_apps_storage (independent file storage)
- o_auth2_clients (independent OAuth2 credentials)
*/

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Verify all tables are created
SELECT 
    TABLE_NAME,
    TABLE_TYPE,
    ENGINE,
    TABLE_ROWS,
    CREATE_TIME
FROM 
    INFORMATION_SCHEMA.TABLES
WHERE 
    TABLE_SCHEMA = DATABASE()
ORDER BY 
    TABLE_NAME;

-- Verify foreign key constraints
SELECT 
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM 
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE 
    TABLE_SCHEMA = DATABASE()
    AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY 
    TABLE_NAME, CONSTRAINT_NAME;

-- Verify indexes
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    SEQ_IN_INDEX,
    INDEX_TYPE,
    NON_UNIQUE
FROM 
    INFORMATION_SCHEMA.STATISTICS
WHERE 
    TABLE_SCHEMA = DATABASE()
ORDER BY 
    TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

-- ========================================
-- END OF SCHEMA
-- ========================================