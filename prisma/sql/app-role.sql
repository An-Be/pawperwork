-- Least-privilege runtime role for this tool. Run ONCE in the Neon SQL editor
-- as the owner role (neondb_owner), after the first migration is applied.
--
-- The app connects as this role (DATABASE_URL and DIRECT_URL). It can read and
-- write rows in the app's tables and nothing else: no DDL, no other tables, not
-- a member of neon_superuser. Schema changes are applied by the owner, never by
-- the app (see AGENTS.md, "Database").
--
-- Replace APP_ROLE with e.g. pawperwork_app and set a long random password.
-- Creating the role in SQL (not the Neon console) keeps it out of neon_superuser.

CREATE ROLE APP_ROLE WITH LOGIN PASSWORD 'REPLACE_WITH_A_LONG_RANDOM_PASSWORD';

GRANT CONNECT ON DATABASE neondb TO APP_ROLE;
GRANT USAGE ON SCHEMA public TO APP_ROLE;

-- One line per app table. Extend this every time a migration adds a table.
-- The build-time drift check (scripts/db-check.mjs) only sees tables this role
-- has privileges on, so a missing grant shows up as drift and fails the build.
GRANT SELECT, INSERT, UPDATE, DELETE ON "Business", "Client", "Pet", "Vaccination", "Waiver", "WaiverSignature", "ReminderLog", "AuditLog", "RateLimitHit" TO APP_ROLE;
