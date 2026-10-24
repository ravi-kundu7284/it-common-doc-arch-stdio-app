import { NextRequest, NextResponse } from "next/server";
import { dbGetAdrs, dbSaveAdr, dbDeleteAdr, dbGetAdr, dbFindUserById } from "@/lib/supabase";
import { getAuthenticatedUser, isUserEmailVerified } from "@/lib/api-auth";
import { NotificationService } from "@/lib/notifications";

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

    // Asynchronously dispatch ADR notifications (non-blocking)
    (async () => {
      try {
        const authUser = await getAuthenticatedUser(req);
        if (authUser?.userId && authUser.userId !== "00000000-0000-0000-0000-000000000001") {
          const user = await dbFindUserById(authUser.userId);
          if (user) {
            const adrTitle = saved.title || "Architecture Decision";
            const adrStatus = saved.status || "proposed";
            const adrIdStr = saved.stable_id || saved.id;

            // 1. Email notification
            NotificationService.sendEmail(
              {
                to: user.email,
                template: "adr-alert",
                priority: "notification",
                userId: user.id,
                data: {
                  name: user.full_name || user.username,
                  adrTitle,
                  adrId: adrIdStr,
                  status: adrStatus.toUpperCase(),
                  reason: body.supersedesId
                    ? `Superseded prior architectural decision (${body.supersedesId})`
                    : `ADR lifecycle status updated to ${adrStatus}`,
                  adrUrl: `${process.env.APP_BASE_URL || "http://localhost:3000"}`,
                },
              },
              true
            ).catch(() => {});

            // 2. SMS notification (if opted in and phone verified)
            if (user.phone && user.phone_verified_at) {
              NotificationService.sendSms(
                user.phone,
                `DocArch AI: ADR '${adrTitle}' status is now ${adrStatus.toUpperCase()}.`,
                "adr-alert",
                undefined,
                user.id,
                true
              ).catch(() => {});
            }
          }
        }
      } catch (notifErr) {
        console.error("[ADR] Notification dispatch error:", notifErr);
      }
    })();

    return NextResponse.json({ success: true, adr: saved });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (authUser?.userId && authUser.userId !== "00000000-0000-0000-0000-000000000001") {
      const isVerified = await isUserEmailVerified(authUser.userId);
      if (!isVerified) {
        return NextResponse.json(
          {
            success: false,
            error: "Email verification required. Please verify your email before deleting architectural governance records.",
            requiresVerification: true,
          },
          { status: 403 }
        );
      }
    }

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

