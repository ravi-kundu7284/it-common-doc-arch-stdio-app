import { NextRequest, NextResponse } from "next/server";
import { dbGetProject, dbDeleteProject, dbSaveProject } from "@/lib/supabase";
import { getAuthenticatedUser, isUserEmailVerified } from "@/lib/api-auth";

export const runtime = "edge";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const project = await dbGetProject(params.id);
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, project });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const updated = await dbSaveProject({ ...body, id: params.id });
    return NextResponse.json({ success: true, project: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (authUser?.userId && authUser.userId !== "00000000-0000-0000-0000-000000000001") {
      const isVerified = await isUserEmailVerified(authUser.userId);
      if (!isVerified) {
        return NextResponse.json(
          {
            success: false,
            error: "Email verification required. Please verify your email before deleting architectural projects.",
            requiresVerification: true,
          },
          { status: 403 }
        );
      }
    }

    const deleted = await dbDeleteProject(params.id);
    return NextResponse.json({ success: true, deleted });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

