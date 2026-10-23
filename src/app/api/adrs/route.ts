import { NextRequest, NextResponse } from "next/server";
import { dbGetAdrs, dbSaveAdr, dbDeleteAdr, dbGetAdr } from "@/lib/supabase";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const adrId = searchParams.get("id");

    if (adrId) {
      const adr = await dbGetAdr(adrId);
      if (!adr) return NextResponse.json({ success: false, error: "ADR not found" }, { status: 404 });
      return NextResponse.json({ success: true, adr });
    }

    if (!projectId) {
      return NextResponse.json({ success: false, error: "projectId parameter required" }, { status: 400 });
    }

    const adrs = await dbGetAdrs(projectId);
    return NextResponse.json({ success: true, adrs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.projectId && !body.project_id) {
      return NextResponse.json({ success: false, error: "projectId required" }, { status: 400 });
    }

    const id = body.id || `adr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const saved = await dbSaveAdr({
      ...body,
      id,
    });

    // If this ADR supersedes another, update the target ADR
    if (body.supersedesId) {
      await dbSaveAdr({
        id: body.supersedesId,
        project_id: body.projectId || body.project_id,
        status: "superseded",
        superseded_by: saved.stable_id || saved.id,
      });
    }

    return NextResponse.json({ success: true, adr: saved });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "id parameter required" }, { status: 400 });
    }
    const deleted = await dbDeleteAdr(id);
    return NextResponse.json({ success: true, deleted });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

