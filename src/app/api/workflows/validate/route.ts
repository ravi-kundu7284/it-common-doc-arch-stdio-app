import { NextRequest, NextResponse } from "next/server";
import { validateWorkflow, simulateWorkflowExecution } from "@/lib/workflow-engine";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workflow, simulate } = body;

    if (!workflow) {
      return NextResponse.json({ success: false, error: "workflow definition required" }, { status: 400 });
    }

    const validation = validateWorkflow(workflow);
    let simulation = null;

    if (simulate) {
      simulation = simulateWorkflowExecution(workflow);
    }

    return NextResponse.json({
      success: true,
      validation,
      simulation,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

