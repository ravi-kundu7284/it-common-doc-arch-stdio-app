import { NextRequest, NextResponse } from "next/server";
import { generateStandardDocument } from "@/lib/doc-generator";
import { analyzeRequirementText } from "@/lib/ai-analyzer";
import { auditProjectArchitecture } from "@/lib/architecture-audit";
import { dbGetUserAiConfig } from "@/lib/supabase";
import {
  decryptApiKey,
  isExpired,
  verifySessionToken,
  deserializeAiConfigCookie,
} from "@/lib/crypto";
import {
  generateRequirementAnalysisWithOpenAi,
  refineSectionWithOpenAi,
  generateDocumentContentWithOpenAi,
  auditArchitectureWithOpenAi,
} from "@/lib/openai-service";
import { parseOpenAiError, resolveServerOpenAiKey } from "@/lib/openai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      promptType = "refine_section",
      prompt,
      projectData,
      sectionId,
      sectionTitle,
      documentType,
      userInstruction,
      apiSettings,
      allowOfflineFallback = false,
    } = body;

    let provider = apiSettings?.provider || process.env.AI_PROVIDER || "openai";
    let modelName = apiSettings?.modelName || process.env.OPENAI_MODEL || "gpt-4o";
    let apiKey = apiSettings?.apiKey || "";

    // 1. Look up user's encrypted key in DB or session cookie if not passed directly
    if (!apiKey) {
      const sessionCookie = req.cookies.get("docarch_session")?.value;
      const sessionData = await verifySessionToken(sessionCookie);
      const userIdCookie = req.cookies.get("docarch_user_id")?.value;
      const userIdHeader = req.headers.get("x-user-id");
      const userId = sessionData?.userId || userIdCookie || userIdHeader;

      if (userId) {
        let userConfig = await dbGetUserAiConfig(userId);

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

        if (userConfig?.encrypted_api_key && userConfig?.key_iv) {
          if (!isExpired(userConfig.expires_at)) {
            try {
              apiKey = await decryptApiKey(
                userConfig.encrypted_api_key,
                userConfig.key_iv
              );
              provider = userConfig.provider || provider;
              modelName = userConfig.model_name || modelName;
            } catch (e) {
              console.warn("Could not decrypt user API key:", e);
            }
          }
        }
      }
    }

    // 2. Check environment variable fallback
    if (!apiKey) {
      if (provider === "openai" || provider === "builtin") {
        apiKey = resolveServerOpenAiKey();
      } else if (provider === "gemini") {
        apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
      }
    }

    console.log(
      `[/api/generate] promptType="${promptType}", provider="${provider}", model="${modelName}", hasClientKey=${Boolean(
        apiSettings?.apiKey
      )}, resolvedKeyEndsIn="...${apiKey ? apiKey.slice(-4) : "NONE"}"`
    );

    // 3. Handle explicit offline requests
    if (allowOfflineFallback && !apiKey) {
      if (promptType === "analyze_requirements") {
        const offlineAnalysis = analyzeRequirementText(prompt || "");
        return NextResponse.json({
          success: true,
          analysis: offlineAnalysis,
          provider: "offline_heuristics",
          isOfflineSimulation: true,
        });
      }
      if (promptType === "audit_architecture") {
        const offlineAudit = auditProjectArchitecture(projectData);
        return NextResponse.json({
          success: true,
          audit: offlineAudit,
          provider: "offline_heuristics",
          isOfflineSimulation: true,
        });
      }
      if (promptType === "generate_document") {
        const sections = generateStandardDocument(projectData, projectData?.designLevel || "hld");
        return NextResponse.json({
          success: true,
          documentSections: sections,
          provider: "offline_heuristics",
          isOfflineSimulation: true,
        });
      }
    }

    // 4. Missing API key validation (Strict mode - NEVER silently return fake AI)
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          code: "MISSING_API_KEY",
          error:
            "OpenAI API key is missing or unconfigured. Please configure OPENAI_API_KEY in .env.local or enter your OpenAI key via the Settings modal to use real-time AI generation.",
          provider,
        },
        { status: 400 }
      );
    }

    // 5. OpenAI Route Handlers
    if (provider === "openai" || provider === "builtin") {
      try {
        const aiConfig = { apiKey, modelName };
        console.log(`[/api/generate] 🚀 Calling OpenAI API (promptType="${promptType}", Model: ${modelName}, Key: ...${apiKey.slice(-4)})`);

        // Action A: Analyze Requirements with OpenAI
        if (promptType === "analyze_requirements") {
          const analysis = await generateRequirementAnalysisWithOpenAi(prompt || "", aiConfig);
          console.log(`[/api/generate] ✅ OpenAI generated requirements analysis for: "${analysis.projectName}"`);
          return NextResponse.json({
            success: true,
            analysis,
            provider: "openai",
            model: modelName,
          });
        }

        // Action B: Refine Section with OpenAI
        if (promptType === "refine_section") {
          const currentSection = projectData?.documentSections?.find((s: any) => s.id === sectionId);
          const currentMarkdown = currentSection?.contentMarkdown || "";
          const targetTitle = sectionTitle || currentSection?.title || "Section";

          const refinedMarkdown = await refineSectionWithOpenAi(
            currentMarkdown,
            userInstruction || "",
            projectData || {},
            targetTitle,
            aiConfig
          );
          console.log(`[/api/generate] ✅ OpenAI refined section: "${targetTitle}"`);

          return NextResponse.json({
            success: true,
            content: refinedMarkdown,
            provider: "openai",
            model: modelName,
          });
        }

        // Action C: Generate Dynamic Document / Section Content with OpenAI
        if (promptType === "generate_document" || promptType === "generate_section") {
          const content = await generateDocumentContentWithOpenAi(
            projectData,
            documentType || "hld",
            sectionTitle,
            aiConfig
          );
          console.log(`[/api/generate] ✅ OpenAI generated content for doc: "${documentType}"`);

          return NextResponse.json({
            success: true,
            content,
            provider: "openai",
            model: modelName,
          });
        }

        // Action D: Architecture Quality & Threat Audit with OpenAI
        if (promptType === "audit_architecture") {
          const aiFindings = await auditArchitectureWithOpenAi(projectData, aiConfig);
          console.log(`[/api/generate] ✅ OpenAI audited architecture, returned ${aiFindings.length} findings`);
          return NextResponse.json({
            success: true,
            findings: aiFindings,
            provider: "openai",
            model: modelName,
          });
        }

        return NextResponse.json(
          { success: false, error: `Unsupported promptType: ${promptType}` },
          { status: 400 }
        );
      } catch (err: any) {
        console.error("OpenAI execution error in /api/generate:", err);
        const parsedError = parseOpenAiError(err);
        return NextResponse.json(
          {
            success: false,
            code: parsedError.code,
            error: parsedError.message,
            provider: "openai",
          },
          { status: parsedError.statusCode }
        );
      }
    }

    // 6. Gemini Provider fallback (if explicitly selected by user)
    if (provider === "gemini") {
      try {
        const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
        const { generateText } = await import("ai");
        const google = createGoogleGenerativeAI({ apiKey });

        const result = await generateText({
          model: google(modelName || "gemini-1.5-pro") as any,
          prompt: `${userInstruction || "Generate architecture recommendations"}\nProject: ${JSON.stringify(projectData)}`,
        });

        return NextResponse.json({
          success: true,
          content: result.text,
          provider: "gemini",
          model: modelName,
        });
      } catch (err: any) {
        return NextResponse.json(
          {
            success: false,
            code: "GEMINI_ERROR",
            error: err?.message || "Google Gemini generation failed",
            provider: "gemini",
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: `Unsupported provider: ${provider}` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Unhandled error in /api/generate:", error);
    return NextResponse.json(
      {
        success: false,
        code: "SERVER_ERROR",
        error: error?.message || "An unexpected error occurred processing your request.",
      },
      { status: 500 }
    );
  }
}
