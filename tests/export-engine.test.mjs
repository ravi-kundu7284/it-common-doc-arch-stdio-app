import test from "node:test";
import assert from "node:assert";
import {
  generateStandaloneHtml,
  generateRawMarkdown,
  generateStructuredJson,
  generateStructuredYaml,
  generateDocxDocument,
} from "../src/lib/export-engine.ts";

const sampleProject = {
  id: "proj_export_sample",
  designLevel: "hld",
  metadata: {
    title: "Enterprise Fleet Telematics Engine",
    version: "2.1.0",
    authors: ["Senior IoT Architect"],
    status: "Approved",
    lastUpdated: "2026-10-23",
  },
  requirements: {
    domain: "Connected Vehicles",
    targetScale: { rps: 25000, users: "1,500,000 Vehicles", dataRetention: "3 Years" },
    functionalRequirements: ["GPS Ingestion", "Geofence Alarms"],
    nonFunctionalRequirements: {
      latency: "p99 < 80ms",
      availability: "99.99%",
      compliance: ["SOC2", "ISO 27001"],
    },
    constraints: [],
  },
  recommendations: {
    selectedPattern: "Event-Driven Microservices",
    patternAlternatives: [],
    stack: {
      frontend: "Next.js Dashboard",
      backend: "Go Ingress + Rust Processing",
      database: "TimescaleDB + PostgreSQL",
      caching: "Redis Cluster",
      messaging: "Apache Kafka",
      devops: "Kubernetes (EKS)",
    },
  },
  documentSections: [
    {
      id: "sec_1",
      title: "1.0 Executive Summary & Scale",
      contentMarkdown: "High throughput telemetry pipeline with multi-AZ clustering.",
    },
    {
      id: "sec_2",
      title: "2.0 Architecture Topology",
      contentMarkdown: "```mermaid\nflowchart TD\nVehicle --> Ingress\n```",
    },
  ],
};

test("Export Engine: generates valid Standalone HTML bundle", () => {
  const html = generateStandaloneHtml(sampleProject);
  assert.ok(html.includes("<!DOCTYPE html>"));
  assert.ok(html.includes("Enterprise Fleet Telematics Engine"));
  assert.ok(html.includes("https://cdn.jsdelivr.net/npm/mermaid"));
  assert.ok(html.includes("Executive Summary"));
});

test("Export Engine: generates valid Markdown with frontmatter", () => {
  const md = generateRawMarkdown(sampleProject);
  assert.ok(md.startsWith("---"));
  assert.ok(md.includes('title: "Enterprise Fleet Telematics Engine"'));
  assert.ok(md.includes("# Enterprise Fleet Telematics Engine"));
  assert.ok(md.includes("flowchart TD"));
});

test("Export Engine: generates valid Structured JSON", () => {
  const jsonStr = generateStructuredJson(sampleProject);
  const parsed = JSON.parse(jsonStr);
  assert.strictEqual(parsed.id, "proj_export_sample");
  assert.strictEqual(parsed.exportVersion, "1.0.0");
  assert.strictEqual(parsed.metadata.status, "Approved");
});

test("Export Engine: generates valid Structured YAML", () => {
  const yaml = generateStructuredYaml(sampleProject);
  assert.ok(yaml.includes('id: "proj_export_sample"'));
  assert.ok(yaml.includes('selectedPattern: "Event-Driven Microservices"'));
});

test("Export Engine: generates valid DOCX Word HTML document", () => {
  const docx = generateDocxDocument(sampleProject);
  assert.ok(docx.includes("urn:schemas-microsoft-com:office:word"));
  assert.ok(docx.includes("Enterprise Fleet Telematics Engine"));
  assert.ok(docx.includes("WordSection1"));
});

