import { NextRequest, NextResponse } from "next/server";
import { dbGetProjects, dbSaveProject } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/api-auth";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    const projects = await dbGetProjects(auth?.userId);
    return NextResponse.json({ success: true, projects });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    const body = await req.json();
    const project = {
      ...body,
      user_id: auth?.userId || body.user_id,
    };
    const saved = await dbSaveProject(project);
    return NextResponse.json({ success: true, project: saved });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

