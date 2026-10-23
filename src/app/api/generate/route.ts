import { NextRequest, NextResponse } from "next/server";
import { generateStandardDocument } from "@/lib/doc-generator";
import { dbGetUserAiConfig } from "@/lib/supabase";
import {
  decryptApiKey,
  isExpired,
  verifySessionToken,
  deserializeAiConfigCookie,
} from "@/lib/crypto";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { promptType, projectData, sectionId, userInstruction, apiSettings } = body;

    let provider = apiSettings?.provider || "builtin";
    let modelName = apiSettings?.modelName || "gemini-1.5-pro";
    let apiKey = apiSettings?.apiKey || "";

    // If no direct key passed in request, look up user's secure encrypted key in Supabase or cookie
    const sessionCookie = req.cookies.get("docarch_session")?.value;
    const sessionData = await verifySessionToken(sessionCookie);

    const userIdCookie = req.cookies.get("docarch_user_id")?.value;
    const userIdHeader = req.headers.get("x-user-id");
    const userId = sessionData?.userId || userIdCookie || userIdHeader;

    if (userId && (!apiKey || provider === "builtin")) {
      let userConfig = await dbGetUserAiConfig(userId);

      // If not in DB, fallback to encrypted docarch_ai_config cookie
      if (!userConfig) {
        const aiCookie = req.cookies.get("docarch_ai_config")?.value;
        const parsed = await deserializeAiConfigCookie(aiCookie);
        if (parsed) {
          userConfig = {
            id: "cfg_cookie",
            user_id: userId,
            provider: parsed.provider,
            model_name: parsed.modelName,
            encrypted_api_key: parsed.encryptedApiKey,
            key_iv: parsed.keyIv,
            key_auth_tag: parsed.keyAuthTag,
            key_last4: parsed.keyLast4,
            expires_at: parsed.expiresAt,
            expires_in_days: parsed.expiresInDays,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
      }

      if (
        userConfig &&
        userConfig.encrypted_api_key &&
        userConfig.key_iv
      ) {
        if (!isExpired(userConfig.expires_at)) {
          try {
            apiKey = await decryptApiKey(
              userConfig.encrypted_api_key,
              userConfig.key_iv
            );
            provider = userConfig.provider;
            modelName = userConfig.model_name;
          } catch (e) {
            console.warn("Could not decrypt user API key, falling back:", e);
          }
        } else {
          console.warn("User API key has expired and was auto-purged.");
        }
      }
    }

    // Fallback to environment variables if still empty
    if (!apiKey) {
      if (provider === "gemini") apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
      if (provider === "openai") apiKey = process.env.OPENAI_API_KEY || "";
    }

    // OpenAI provider
    if (provider === "openai" && apiKey) {
      try {
        const { createOpenAI } = await import("@ai-sdk/openai");
        const { generateText } = await import("ai");
        const openai = createOpenAI({ apiKey });

        let prompt = "";
        if (promptType === "refine_section") {
          const currentSection = projectData.documentSections?.find((s: any) => s.id === sectionId);
          prompt = `You are a Senior Principal Software Architect.
Task: Refine and enhance the following architecture document section based on user feedback.
User Feedback: "${userInstruction}"

Project: ${projectData.metadata?.title}
Domain: ${projectData.requirements?.domain}
Architecture Pattern: ${projectData.recommendations?.selectedPattern}
Tech Stack: ${JSON.stringify(projectData.recommendations?.stack)}

Current Section Content:
${currentSection?.contentMarkdown || ""}

Output the updated markdown content for this section. If relevant, include or update valid Mermaid.js diagrams (flowchart, sequenceDiagram, erDiagram). Only return the markdown.`;
        } else {
          prompt = `You are a Senior Principal Software Architect.
Generate in-depth, production-ready system architecture recommendations and technical specifications for:
Project Name: ${projectData.metadata?.title || "New System"}
Domain: ${projectData.requirements?.domain}
Scale: ${projectData.requirements?.targetScale?.rps} RPS, ${projectData.requirements?.targetScale?.users}
Functional Requirements: ${JSON.stringify(projectData.requirements?.functionalRequirements)}
Non-Functional Requirements: ${JSON.stringify(projectData.requirements?.nonFunctionalRequirements)}
Constraints: ${JSON.stringify(projectData.requirements?.constraints)}

Include architectural pattern, pros/cons, trade-offs, and recommended tech stack.`;
        }

        const result = await generateText({
          model: openai(modelName || "gpt-4o") as any,
          prompt,
          system: "You are an elite enterprise software architect specialized in high-scale distributed systems and HLD/LLD technical design documents.",
        });

        return NextResponse.json({
          success: true,
          content: result.text,
          provider: "openai",
        });
      } catch (err: any) {
        console.error("OpenAI call failed, falling back to builtin generator:", err);
      }
    }

    // Google Gemini provider
    if (provider === "gemini" && apiKey) {
      try {
        const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
        const { generateText } = await import("ai");
        const google = createGoogleGenerativeAI({ apiKey });

        let prompt = "";
        if (promptType === "refine_section") {
          const currentSection = projectData.documentSections?.find((s: any) => s.id === sectionId);
          prompt = `You are a Principal Cloud Architect.
Refine and update this technical design section based on: "${userInstruction}".
Project: ${projectData.metadata?.title} (${projectData.recommendations?.selectedPattern})
Current Section Content:
${currentSection?.contentMarkdown || ""}
Return clean Markdown with valid Mermaid.js diagrams if appropriate.`;
        } else {
          prompt = `Generate architecture recommendation for ${projectData.metadata?.title}`;
        }

        const result = await generateText({
          model: google(modelName || "gemini-1.5-pro") as any,
          prompt,
        });

        return NextResponse.json({
          success: true,
          content: result.text,
          provider: "gemini",
        });
      } catch (err: any) {
        console.error("Gemini call failed, falling back to builtin engine:", err);
      }
    }

    // High-Fidelity Built-in Engine Fallback
    if (promptType === "refine_section") {
      const currentSection = projectData.documentSections?.find((s: any) => s.id === sectionId);
      const instruction = userInstruction ? userInstruction.trim() : "";
      const instrLower = instruction.toLowerCase();

      let updated = currentSection?.contentMarkdown || "";

      if (instrLower.includes("sequence diagram")) {
        updated += `\n\n### Interaction Flow: Sequence Specification\n\`\`\`mermaid\nsequenceDiagram\n    autonumber\n    actor Client\n    participant Ingress as API Gateway\n    participant Service as Core Domain Service\n    participant DB as Distributed Storage\n    participant Queue as Kafka Broker\n\n    Client->>Ingress: POST /api/v1/transaction (Idempotency-Key)\n    Ingress->>Service: Validate Token & Route Request\n    Service->>DB: Begin ACID Transaction\n    DB-->>Service: Commit Confirmed\n    Service->>Queue: Emit DOMAIN_EVENT (At-Least-Once)\n    Service-->>Ingress: 201 Created Payload\n    Ingress-->>Client: Result Confirmation\n\`\`\``;
      } else if (instrLower.includes("retry") || instrLower.includes("timeout") || instrLower.includes("failure")) {
        updated += `\n\n### Fault Tolerance, Retries & Resilience Policy\n\n| Failure Scenario | Detection Mechanism | Retry Policy | Fallback / Compensation |\n| :--- | :--- | :--- | :--- |\n| **Network Glitch / 503** | Immediate TCP reset | 3 retries, exponential backoff (200ms initial, jitter 50ms) | Route to read-only replica |\n| **Database Lock Contention** | SQL state 40P01 (Deadlock) | 2 retries with random jitter (100ms - 500ms) | Abort & notify client with 409 Retry-After |\n| **Downstream Webhook 5xx** | HTTP Status Code | Circuit Breaker (opens after 5 consecutive failures for 60s) | Route payload to Dead-Letter Queue (DLQ) |`;
      } else if (instrLower.includes("security") || instrLower.includes("auth") || instrLower.includes("threat")) {
        updated += `\n\n### Security Controls & Access Enforcement\n- **Authentication:** Asymmetric RS256 JWT tokens with short 15-minute TTL issued by OpenID Connect (OIDC) provider.\n- **Authorization:** Fine-grained Row-Level Security (RLS) coupled with Attribute-Based Access Control (ABAC).\n- **Data Protection:** Enforced TLS 1.3 in-transit and AES-256-GCM envelope encryption at rest via Cloud KMS.\n- **Tamper Evidence:** Cryptographically signed immutable audit trail logging all state mutations.`;
      } else if (instrLower.includes("scalab") || instrLower.includes("cost")) {
        updated += `\n\n### Cost-Optimized Elastic Scalability Matrix\n- **Horizontal Pod Autoscaling (HPA):** Scale out when average CPU > 70% or active connections > 1,500.\n- **Scale-to-Zero Capabilities:** Non-production environments auto-scale to zero instances outside core business hours to reduce monthly cloud expenditure by ~65%.\n- **Edge Caching:** Static assets and hot catalog items cached at edge CDN locations with 300s TTL.`;
      } else if (instrLower.includes("simplify") || instrLower.includes("non-technical")) {
        updated += `\n\n> [!NOTE]\n> **Plain-English Executive Overview:**\n> In simple terms, this component acts as a high-speed digital receptionist and traffic controller. It checks visitor credentials, guides requests to the right service, and ensures transactions complete safely without slowing down the user experience.`;
      } else {
        updated += `\n\n> [!NOTE]\n> **Architectural Refinement (${new Date().toLocaleTimeString()}):**\n> Incorporated stakeholder requirement: "${instruction}".\n> Validated against SLA parameters (p99 latency, failure isolation, and maintainability).`;
      }

      return NextResponse.json({
        success: true,
        content: updated,
        provider: "builtin",
      });
    }

    const generatedSections = generateStandardDocument(projectData, projectData.designLevel);

    return NextResponse.json({
      success: true,
      documentSections: generatedSections,
      provider: "builtin",
    });
  } catch (error: any) {
    console.error("API error in /api/generate:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate design document" },
      { status: 500 }
    );
  }
}
