# IT Architecture Studio — REST API Specification

## 1. Overview & Authentication Model

All REST API endpoints in the Architecture Studio are served under `/api/*`.

### 1.1 Authentication Schemes
1. **Session Cookie / JWT:** Standard web client authentication via HTTP-only cookie.
2. **API Key Header (`X-API-Key`):** Machine-to-machine CI/CD automation token validated by `src/lib/api-auth.ts`.
3. **Bearer Token (`Authorization: Bearer <token>`):** OAuth2 / Supabase JWT.
4. **Local Sandbox Mode:** When remote authentication is unconfigured, requests automatically operate in the zero-config local sandbox environment.

### 1.2 Common HTTP Status Codes
| Status | Meaning |
| :--- | :--- |
| `200 OK` | Request succeeded; returns data payload. |
| `201 Created` | Resource created successfully. |
| `400 Bad Request` | Missing required fields or schema validation failure. |
| `401 Unauthorized` | Missing or invalid authentication token/API key. |
| `404 Not Found` | Requested entity does not exist. |
| `500 Server Error` | Unhandled error; returns structured error envelope. |

---

## 2. Projects API

### 2.1 `GET /api/projects`
Retrieves all architecture projects accessible by the authenticated user or stored in the local sandbox.

**Response `200 OK`:**
```json
{
  "success": true,
  "projects": [
    {
      "id": "proj_12345678-abcd-4def-9012-3456789abcde",
      "name": "Global Omnichannel Commerce Platform",
      "slug": "global-omnichannel-commerce",
      "description": "High-throughput cloud architecture",
      "design_level": "hld",
      "created_at": "2026-10-23T12:00:00Z",
      "updated_at": "2026-10-23T12:30:00Z"
    }
  ]
}
```

### 2.2 `POST /api/projects`
Creates a new architecture project or updates an existing draft.

**Request Payload:**
```json
{
  "name": "Payment Gateway Microservice Platform",
  "slug": "payment-gateway-platform",
  "description": "PCI-compliant payment transaction engine",
  "design_level": "lld",
  "settings": {
    "cloud": "AWS",
    "primaryLanguage": "TypeScript"
  }
}
```

---

## 3. Document Revisions API (`/api/documents/revisions`)

### 3.1 `GET /api/documents/revisions?projectId={id}`
Returns all historical revision snapshots for a given project.

### 3.2 `POST /api/documents/revisions`
Creates a named milestone snapshot or restores an existing revision.

**Request Payload (Create Snapshot):**
```json
{
  "action": "create",
  "projectId": "proj_12345678-abcd-4def-9012-3456789abcde",
  "title": "Pre-CAB Approved Architecture Baseline",
  "comment": "Final sign-off by Enterprise Architecture Board",
  "snapshot": { ... }
}
```

---

## 4. Diagram Management API (`/api/diagrams`)

### 4.1 `GET /api/diagrams?projectId={id}`
Lists all diagrams associated with a project.

### 4.2 `POST /api/diagrams`
Saves or updates a diagram (supporting all 13 diagram types).

**Request Payload:**
```json
{
  "projectId": "proj_12345678-abcd-4def-9012-3456789abcde",
  "title": "Payment Authorization Sequence",
  "diagramType": "sequence",
  "mermaidCode": "sequenceDiagram\n  Client->>Gateway: POST /charge\n  Gateway->>Bank: Authorize",
  "visualLayout": {
    "zoom": 1.0,
    "nodes": [
      { "id": "1", "name": "Client", "x": 100, "y": 150 }
    ]
  }
}
```

---

## 5. Workflow Modeling & Validation API (`/api/workflows`)

### 5.1 `POST /api/workflows`
Saves workflow definitions (steps, connections, retry policies).

### 5.2 `POST /api/workflows/validate`
Validates workflow graph topology and generates simulation traces.

**Request Payload:**
```json
{
  "workflow": {
    "title": "Disaster Recovery Failover Workflow",
    "steps": [
      {
        "id": "step-1",
        "title": "Detect Primary Region Health Degradation",
        "type": "trigger",
        "nextSteps": ["step-2"]
      },
      {
        "id": "step-2",
        "title": "Promote Secondary Aurora Replica",
        "type": "task",
        "nextSteps": ["step-3"],
        "retryPolicy": { "maxAttempts": 3, "backoffMs": 1000 }
      },
      {
        "id": "step-3",
        "title": "Update Route53 DNS Health Check",
        "type": "end",
        "nextSteps": []
      }
    ]
  }
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "isValid": true,
  "warnings": [],
  "simulation": {
    "totalDurationMs": 2400,
    "completedSteps": 3,
    "trace": [
      { "stepId": "step-1", "status": "COMPLETED", "durationMs": 100 },
      { "stepId": "step-2", "status": "COMPLETED", "durationMs": 1500 },
      { "stepId": "step-3", "status": "COMPLETED", "durationMs": 800 }
    ]
  }
}
```

---

## 6. Requirements & Impact Analysis API (`/api/requirements`)

### 6.1 `POST /api/requirements/impact`
Evaluates change-impact when a requirement or target scale changes.

**Request Payload:**
```json
{
  "changedRequirement": {
    "id": "req-scalability",
    "title": "Target Ingestion Scalability",
    "category": "NFR",
    "priority": "MUST",
    "specification": "Must sustain 50,000 RPS peak load."
  },
  "projectData": { ... }
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "impactAnalysis": {
    "affectedSectionsCount": 2,
    "affectedDiagramsCount": 1,
    "findings": [
      {
        "sectionId": "sec-infra",
        "sectionTitle": "Infrastructure & Deployment Topology",
        "impactSeverity": "HIGH",
        "reason": "Single AZ configuration insufficient for 50,000 RPS peak load",
        "proposedMarkdownPatch": "### Auto-Scaling Multi-AZ Deployment Topology\n..."
      }
    ]
  }
}
```

---

## 7. Architecture Quality Review API (`/api/quality-audit`)

### 7.1 `POST /api/quality-audit`
Executes deterministic static analysis against the project specification.

**Request Payload:**
```json
{
  "projectData": { ... }
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "overallScore": 92,
  "summary": "Architecture demonstrates robust resilience with 1 minor warning.",
  "findings": [
    {
      "id": "AUDIT-IDEM-01",
      "category": "resilience",
      "severity": "medium",
      "title": "Financial Transaction Idempotency Missing",
      "description": "Payment domain endpoints lack unique idempotency key specification.",
      "remediationText": "Add Idempotency-Key header constraint and Redis lock verification."
    }
  ]
}
```

---

## 8. Multi-Format Export API (`/api/export`)

### 8.1 `POST /api/export`
Generates formatted documents for download.

**Request Payload:**
```json
{
  "format": "docx" | "html" | "markdown" | "yaml" | "json",
  "projectData": { ... }
}
```

