# Liquibase Database Migrations for DocArch AI

This directory manages all relational database schema migrations for PostgreSQL (including Supabase, AWS RDS, GCP Cloud SQL, or local PostgreSQL instances) using [Liquibase](https://www.liquibase.com/).

## Directory Structure

```text
liquibase/
├── changelog.master.xml                    # Master changelog orchestrating all changesets
├── liquibase.properties                    # Database connection properties
├── README.md                               # Usage and migration instructions
└── changesets/
    ├── 001-create-app-users.sql            # Core users with PBKDF2 hashes & roles
    ├── 002-create-user-ai-configs.sql      # AES-256-GCM encrypted AI keys with auto-expiry
    ├── 003-create-user-sessions.sql        # Active user session tracking & revocation
    ├── 004-add-designation-and-lockout.sql # Designation, 3-attempt 2-min lockout, reset tokens
    ├── 005-create-audit-logs.sql           # Security audit logs for Admin portal
    └── 006-create-purge-procedure.sql      # Stored procedure to auto-purge expired keys
```

## Running Migrations

### 1. Using Liquibase CLI
Install Liquibase CLI (`brew install liquibase` or `choco install liquibase`):

```bash
# Preview pending changes
liquibase --defaultsFile=liquibase/liquibase.properties status

# Apply all changesets to database
liquibase --defaultsFile=liquibase/liquibase.properties update

# Rollback one changeset if needed
liquibase --defaultsFile=liquibase/liquibase.properties rollbackCount 1
```

### 2. Using Docker (Zero Installation)
```bash
docker run --rm \
  -v "$(pwd)/liquibase:/liquibase/changelog" \
  liquibase/liquibase \
  --changelog-file=changelog.master.xml \
  --url="jdbc:postgresql://<host>:5432/<database>?sslmode=require" \
  --username="<user>" \
  --password="<password>" \
  update
```

### 3. Connection to Supabase PostgreSQL
In your Supabase dashboard under **Settings > Database**, copy the **Transaction Connection Pooler** or **Direct Connection URI** and pass it to Liquibase:
```bash
export DB_URL="jdbc:postgresql://db.<supabase-ref>.supabase.co:5432/postgres?sslmode=require"
export DB_USER="postgres"
export DB_PASSWORD="<your-supabase-db-password>"
liquibase --defaultsFile=liquibase/liquibase.properties update
```
