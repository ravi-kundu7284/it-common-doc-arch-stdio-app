-- liquibase formatted sql
-- changeset ravi.kundu:000-create-dev-schema
-- comment: Create dev schema and grant permissions to Supabase API roles

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE SCHEMA IF NOT EXISTS dev;

GRANT USAGE ON SCHEMA dev TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA dev TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA dev TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA dev TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA dev GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA dev GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA dev GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;
