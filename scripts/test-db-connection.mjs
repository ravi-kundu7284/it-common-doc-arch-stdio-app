import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Load .env.local or .env
function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const fullPath = path.join(rootDir, file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim();
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
      console.log(`[Config] Loaded environment variables from ${file}`);
      return;
    }
  }
  console.log("[Config] No .env.local file found. Using existing process.env variables.");
}

loadEnv();

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "";

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const schema =
  process.env.NEXT_PUBLIC_SUPABASE_SCHEMA ||
  process.env.SUPABASE_SCHEMA ||
  process.env.DB_SCHEMA ||
  "dev";

const databaseUrl = process.env.DATABASE_URL || "";

console.log("\n=======================================================");
console.log(" DocArch AI - Local PostgreSQL Connection Tester");
console.log("=======================================================");
console.log(`Supabase URL : ${supabaseUrl || "(not set in .env.local)"}`);
console.log(`Target Schema: ${schema}`);
console.log(`Key Configured: ${supabaseKey ? "YES (" + (supabaseKey.length > 50 ? "service_role / jwt" : "short") + ")" : "NO"}`);
console.log(`DATABASE_URL  : ${databaseUrl ? databaseUrl.replace(/:[^:@]+@/, ":****@") : "(not set)"}`);
console.log("-------------------------------------------------------\n");

if (!supabaseUrl || !supabaseKey) {
  console.log("❌ Connection Test FAILED: Missing credentials in .env.local");
  console.log("\n👉 Next Steps:");
  console.log("1. Open .env.local in the project root.");
  console.log("2. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  console.log("   (Or uncomment Option 2 if using local Docker PostgreSQL).");
  console.log("3. Re-run: npm run db:test\n");
  process.exit(1);
}

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWebSocket {};
}

const client = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema },
});

async function runTests() {
  console.log(`Testing database tables in '${schema}' schema...\n`);

  const tables = [
    { name: "databasechangelog", description: "Liquibase migration history & changelog tracking" },
    { name: "databasechangeloglock", description: "Liquibase concurrent migration lock" },
    { name: "app_users", description: "User accounts, passwords & designations" },
    { name: "user_sessions", description: "Active session tokens & tracking" },
    { name: "user_ai_configurations", description: "Encrypted AI provider configurations" },
    { name: "security_audit_logs", description: "Security audit event logs" },
  ];

  let allOk = true;

  for (const t of tables) {
    try {
      const { data, count, error } = await client
        .from(t.name)
        .select("id", { count: "exact" })
        .limit(1);

      if (error) {
        allOk = false;
        console.log(`❌ [FAIL] Table '${t.name}': ${error.message} (Code: ${error.code || 'unknown'})`);
      } else {
        console.log(`✓ [PASS] Table '${t.name}' exists (${count ?? 0} row(s)) - ${t.description}`);
      }
    } catch (err) {
      allOk = false;
      console.log(`❌ [FAIL] Table '${t.name}': ${err.message}`);
    }
  }

  console.log("\n-------------------------------------------------------");

  if (!allOk) {
    console.log(`⚠️ Database verification failed for schema '${schema}'!`);
    console.log("\n👉 Resolution:");
    console.log("1. Open your Supabase Dashboard > SQL Editor: https://supabase.com/dashboard/project/ahyzrleofpdtfzrfsnbz/sql/new");
    console.log("2. Copy all SQL from: supabase/schema.sql and click 'Run'.");
    console.log("   (This will create the schema 'dev' and grant all required table permissions).");
    if (schema !== "public") {
      console.log(`3. ⚠️ IMPORTANT FOR '${schema}' SCHEMA:`);
      console.log(`   Go to Supabase Dashboard -> Project Settings -> API -> Data API Settings -> 'Exposed schemas'.`);
      console.log(`   Add '${schema}' to the list of exposed schemas (e.g. 'public, dev') and save.`);
    }
    console.log("4. Re-run: npm run db:test\n");
    process.exit(1);
  }

  // Check demo users
  try {
    const { data: users, error } = await client
      .from("app_users")
      .select("username, email, role, designation")
      .limit(5);

    if (users && users.length > 0) {
      console.log("✓ [PASS] User Accounts verified:");
      for (const u of users) {
        console.log(`   - @${u.username} (${u.email}) [Role: ${u.role}, Designation: ${u.designation || 'N/A'}]`);
      }
    } else {
      console.log("ℹ️ No users in 'app_users' yet. Launching the app will automatically seed demo accounts.");
    }
  } catch (err) {
    console.log("User query note:", err.message);
  }

  console.log("\n🎉 SUCCESS: PostgreSQL database connection and tables are 100% verified!");
  console.log("You can now start your local development studio with: npm run dev\n");
}

runTests().catch((err) => {
  console.error("Unexpected test failure:", err);
  process.exit(1);
});
