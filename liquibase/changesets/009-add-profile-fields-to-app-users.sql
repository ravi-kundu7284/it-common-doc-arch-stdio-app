-- liquibase formatted sql
-- changeset ravi.kundu:009-add-profile-fields-to-app-users
-- comment: Add first_name, last_name, phone, phone_country_code, avatar_url, company, timezone, and bio to app_users

ALTER TABLE app_users 
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS phone VARCHAR(30),
ADD COLUMN IF NOT EXISTS phone_country_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS company VARCHAR(150),
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50),
ADD COLUMN IF NOT EXISTS bio TEXT;
