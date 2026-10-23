import test from "node:test";
import assert from "node:assert";
import {
  analyzeRequirementText,
  SAMPLE_USER_PROMPTS,
  ALL_CORE_DOCUMENT_TYPES,
} from "../src/lib/ai-analyzer.ts";
import {
  generateFullDocumentSet,
  generateDocumentByType,
  getDocumentTitle,
} from "../src/lib/doc-generator.ts";
import {
  buildProjectDocumentationPackage,
} from "../src/lib/export-engine.ts";

test("AI Analyzer: accurately parses natural language residential society prompt", () => {
  const societyPrompt = SAMPLE_USER_PROMPTS[0].prompt;
  const analysis = analyzeRequirementText(societyPrompt);

  assert.strictEqual(analysis.projectName, "SocietyNest Community Marketplace");
  assert.strictEqual(analysis.domain, "Community E-Commerce & Residential Services");
  assert.ok(analysis.functionalRequirements.length >= 5);

  const frTitles = analysis.functionalRequirements.map((f) => f.title);
  assert.ok(frTitles.some((t) => t.includes("Member Verification")));
  assert.ok(frTitles.some((t) => t.includes("Product Catalog")));
  assert.ok(frTitles.some((t) => t.includes("Payments")));

  assert.ok(analysis.clarifyingQuestions.length >= 2);
  assert.ok(analysis.selectedDocumentTypes.length >= 10);
});

test("Doc Generator: generates coordinated multi-document set", () => {
  const sampleProject = {
    id: "proj_suite_test",
    metadata: {
      title: "SocietyNest Marketplace",
      version: "1.0.0",
      authors: ["Principal Solutions Architect"],
      status: "Draft",
      lastUpdated: "2026-10-23",
    },
    requirements: {
      domain: "Residential E-Commerce",
      targetScale: { rps: 500, users: "10,000 Residents", dataRetention: "2 Years" },
      functionalRequirements: [
        "Member verification against society records",
        "Product catalog and listings",
        "Order checkout and payment gateway",
      ],
      nonFunctionalRequirements: {
        latency: "p95 < 120ms",
        availability: "99.9%",
        compliance: ["GDPR", "SOC2 Type II"],
      },
      constraints: ["Operating costs under $100/mo"],
    },
    recommendations: {
      selectedPattern: "Modular Monolith",
      patternAlternatives: [],
      stack: {
        frontend: "Next.js 14",
        backend: "Node.js (NestJS)",
        database: "PostgreSQL 16",
        caching: "Redis",
        messaging: "Redis Pub/Sub",
        devops: "Docker, Cloud Run",
      },
    },
  };

  const documentTypes = ["overview", "brd", "srs", "hld", "lld", "sad", "database", "api", "security", "deployment", "runbook", "raid", "roadmap"];
  const docs = generateFullDocumentSet(sampleProject, documentTypes);

  assert.strictEqual(docs.length, documentTypes.length);

  // Validate HLD
  const hld = docs.find((d) => d.type === "hld");
  assert.ok(hld);
  assert.strictEqual(hld.status, "draft");
  assert.ok(hld.sections.length > 0);
  assert.ok(hld.sections.some((s) => s.contentMarkdown.includes("mermaid")));

  // Validate Database Design
  const dbDoc = docs.find((d) => d.type === "database");
  assert.ok(dbDoc);
  assert.ok(dbDoc.sections.some((s) => s.contentMarkdown.includes("erDiagram")));

  // Validate Security Architecture
  const secDoc = docs.find((d) => d.type === "security");
  assert.ok(secDoc);
  assert.ok(secDoc.sections.some((s) => s.contentMarkdown.includes("STRIDE")));
});

test("Export Engine: builds complete multi-file project documentation package", () => {
  const sampleProject = {
    id: "proj_package_test",
    designLevel: "hld",
    metadata: {
      title: "ApexPay Settlement Engine",
      version: "1.0.0",
      authors: ["Lead Architect"],
      status: "Approved",
      lastUpdated: "2026-10-23",
    },
    requirements: {
      domain: "FinTech Payments",
      targetScale: { rps: 10000, users: "5,000,000 Users", dataRetention: "7 Years" },
      functionalRequirements: ["Payment Ingestion", "Double Entry Ledger"],
      nonFunctionalRequirements: {
        latency: "p99 < 50ms",
        availability: "99.999%",
        compliance: ["PCI-DSS Level 1"],
      },
      constraints: ["RPO = 0"],
    },
    recommendations: {
      selectedPattern: "Event-Driven Microservices",
      patternAlternatives: [],
      stack: {
        frontend: "Next.js",
        backend: "Go",
        database: "PostgreSQL",
        caching: "Redis",
        messaging: "Apache Kafka",
        devops: "Kubernetes",
      },
    },
    documentSections: [
      {
        id: "s1",
        title: "Executive Summary",
        contentMarkdown: "Financial ledger with double-entry accounting.",
      },
    ],
    documents: [
      {
        id: "doc_1",
        projectId: "proj_package_test",
        type: "hld",
        title: "High-Level Design",
        status: "approved",
        version: "1.0.0",
        sections: [{ id: "sec_hld_1", title: "HLD Overview", contentMarkdown: "Macro topology." }],
        reviewComments: [],
        createdAt: "2026-10-23",
        updatedAt: "2026-10-23",
      },
      {
        id: "doc_2",
        projectId: "proj_package_test",
        type: "database",
        title: "Database Design Document",
        status: "draft",
        version: "1.0.0",
        sections: [{ id: "sec_db_1", title: "DB DDL", contentMarkdown: "CREATE TABLE ledger;" }],
        reviewComments: [],
        createdAt: "2026-10-23",
        updatedAt: "2026-10-23",
      },
    ],
  };

  const packageFiles = buildProjectDocumentationPackage(sampleProject);
  assert.ok(packageFiles.length >= 6);

  const fileNames = packageFiles.map((f) => f.filename);
  assert.ok(fileNames.includes("README.md"));
  assert.ok(fileNames.includes("architecture.json"));
  assert.ok(fileNames.includes("architecture.yaml"));
  assert.ok(fileNames.some((n) => n.endsWith(".doc")));
  assert.ok(fileNames.some((n) => n.includes("documents/")));

  const readme = packageFiles.find((f) => f.filename === "README.md");
  assert.ok(readme.content.includes("Document Package Manifest"));
  assert.ok(readme.content.includes("ApexPay Settlement Engine"));
});

