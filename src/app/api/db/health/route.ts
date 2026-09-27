import { NextResponse } from "next/server";
import { dbCheckHealth, getSupabaseClient, dbEnsureSeedUsers } from "@/lib/supabase";

export const runtime = "edge";

export async function GET() {
  const client = getSupabaseClient();
  if (client) {
    await dbEnsureSeedUsers(client);
  }
  const health = await dbCheckHealth();
  return NextResponse.json(health);
}
