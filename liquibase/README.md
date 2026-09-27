# Liquibase Database Migrations for DocArch AI

This directory manages all relational database schema migrations for PostgreSQL (including Supabase, AWS RDS, GCP Cloud SQL, or local PostgreSQL instances) using [Liquibase](https://www.liquibase.com/).

## Directory Structure

```text
liquibase/
├── changelog.master.xml                    # Master changelog orchestrating changesets 000 through 007
├── liquibase.properties                    # Database connection properties (dev schema + Supabase credentials)
├── README.md                               # Usage and migration instructions
└── changesets/
    ├── 000-create-dev-schema.sql           # Schema 'dev' creation and role grants (anon, authenticated, service_role)
    ├── 001-create-app-users.sql            # Core users with PBKDF2 hashes & roles
    ├── 002-create-user-ai-configs.sql      # AES-256-GCM encrypted AI keys with auto-expiry
    ├── 003-create-user-sessions.sql        # Active user session tracking & revocation
    ├── 004-add-designation-and-lockout.sql # Designation, 3-attempt 2-min lockout, reset tokens
    ├── 005-create-audit-logs.sql           # Security audit logs for Admin portal
    ├── 006-create-purge-procedure.sql      # Stored procedure to auto-purge expired keys
    └── 007-enable-rls-and-seed.sql         # Row Level Security policies + initial enterprise seed accounts
```

## Running Migrations

### 1. Direct Execution via Supabase SQL Editor (Instant & Zero Setup)
The consolidated script `supabase/schema.sql` contains all changesets (000-007) and also automatically initializes the Liquibase tracking tables (`dev.databasechangelog` and `dev.databasechangeloglock`).
1. Copy [supabase/schema.sql](../supabase/schema.sql)
2. Paste into [Supabase SQL Editor](https://supabase.com/dashboard/project/ahyzrleofpdtfzrfsnbz/sql/new) and click **Run**.
3. All tables and the Liquibase changelog will be created in schema `dev`!

### 2. Using GitHub Actions (Automated CI/CD)
A dedicated workflow is provided at `.github/workflows/liquibase-migration.yml`:
1. Go to your GitHub repository -> **Actions** tab.
2. Select **Liquibase Database Migrations**.
3. Click **Run workflow** -> **update**.

### 3. Using Liquibase CLI
Install Liquibase CLI (`brew install liquibase` or `choco install liquibase`):

```bash
# Preview pending changes against the 'dev' schema
liquibase --defaultsFile=liquibase/liquibase.properties status

# Apply all changesets to the 'dev' schema
liquibase --defaultsFile=liquibase/liquibase.properties update

# Rollback one changeset if needed
liquibase --defaultsFile=liquibase/liquibase.properties rollbackCount 1
```

### 4. Using Docker (Zero Installation)
```bash
docker run --rm \
  -v "$(pwd)/liquibase:/liquibase/changelog" \
  liquibase/liquibase \
  --defaultsFile=/liquibase/changelog/liquibase.properties \
  --changelog-file=changelog.master.xml \
  --defaultSchemaName=dev \
  --liquibaseSchemaName=dev \
  update
```
