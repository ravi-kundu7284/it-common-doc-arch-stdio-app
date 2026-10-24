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
Generates formatted documents for download and dispatches background export alerts (email and SMS).

**Request Payload:**
```json
{
  "format": "docx" | "html" | "markdown" | "yaml" | "json",
  "projectData": { ... }
}
```

---

## 9. Authentication & Verification API

### 9.1 `POST /api/auth/register`
Creates a new user with PBKDF2 password hashing (SHA-512, 100,000 iterations), generates a cryptographically secure 32-byte verification token, stores its SHA-256 hash in `auth_tokens` with 24-hour expiration, and dispatches an email verification link.

**Request Payload:**
```json
{
  "username": "sarah_architect",
  "email": "sarah@enterprise.com",
  "password": "SecurePassword123!",
  "fullName": "Sarah Architect",
  "designation": "Staff Infrastructure Architect"
}
```

**Response `201 Created`:**
```json
{
  "success": true,
  "user": {
    "id": "usr_948f92...",
    "username": "sarah_architect",
    "email": "sarah@enterprise.com",
    "email_verified_at": null,
    "role": "architect"
  },
  "message": "Account created. Please check your inbox to verify your email."
}
```

### 9.2 `GET /api/auth/verify-email?token={rawToken}` & `POST /api/auth/verify-email`
Validates the token's SHA-256 hash against `auth_tokens`, verifies that it is unexpired (`expires_at > now`) and unused (`used_at IS NULL`), stamps `email_verified_at` on the user, marks the token as used, and redirects to `/verify-email?status=success` or returns JSON.

**POST Request Payload:**
```json
{
  "token": "4a7f29b4c09d... (64 hex characters)"
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Email verified successfully."
}
```

### 9.3 `POST /api/auth/resend-verification`
Enforces a 60-second cooldown per email, invalidates any outstanding previous unused `email_verify` tokens, generates a new 32-byte token, and re-dispatches the verification email.

**Request Payload:**
```json
{
  "email": "sarah@enterprise.com"
}
```

### 9.4 `POST /api/auth/forgot-password`
Timing-equalized (minimum 120ms response time) and non-enumerating endpoint. Always returns identical success envelopes regardless of whether the email exists. If the account exists, creates a single-use token valid for 30 minutes and dispatches the password reset link.

**Request Payload:**
```json
{
  "email": "sarah@enterprise.com"
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "If an account exists with that email address, a password reset link has been sent."
}
```

### 9.5 `POST /api/auth/reset-password`
Validates the token's SHA-256 hash, enforces the 8+ character password policy, hashes the new password with PBKDF2 (SHA-512 with 100,000 iterations), marks the token used, invalidates all other reset tokens, revokes all existing active user sessions across devices (`dbRevokeUserSessions`), and sends a "Your password was changed" security confirmation email.

**Request Payload:**
```json
{
  "token": "4a7f29b4c09d...",
  "newPassword": "NewSecurePassword456!"
}
```

---

## 10. Phone & SMS Verification API (Optional)

Phone verification is strictly optional and only required to enable SMS alerts or SMS-based notifications.

### 10.1 `POST /api/auth/phone/send`
Requires an authenticated user with a verified email. Normalizes the incoming phone number to E.164 using `libphonenumber-js` (default country India `+91`), enforces an optional Cloudflare Turnstile CAPTCHA hook, a 60-second resend cooldown, and daily SMS cost guards. Dispatches OTP via Message Central (VerifyNow) or the local console fallback.

**Request Payload:**
```json
{
  "phone": "+91 98765 43210",
  "countryCode": "+91",
  "turnstileToken": "0.cf-turnstile-token..."
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "verificationId": "mc_verif_91823...",
  "normalizedPhone": "+919876543210",
  "expiresAt": "2026-10-25T12:10:00Z"
}
```

### 10.2 `POST /api/auth/phone/verify`
Validates the OTP code against the verification ID. Enforces a hard limit of **5 attempts** per verification and a 10-minute expiry window. On success, sets `phone` and `phone_verified_at` on the user account.

**Request Payload:**
```json
{
  "verificationId": "mc_verif_91823...",
  "code": "482019",
  "phone": "+919876543210"
}
```

---

## 11. User Notification Preferences API

### 11.1 `GET /api/user/notifications`
Retrieves the authenticated user's notification preferences and verification status.

**Response `200 OK`:**
```json
{
  "success": true,
  "emailVerified": true,
  "phoneVerified": true,
  "phone": "+919876543210",
  "preferences": {
    "email": {
      "security": true,
      "export": true,
      "audit": true,
      "adr": true
    },
    "sms": {
      "export": false,
      "audit": false,
      "adr": false
    }
  }
}
```

### 11.2 `PUT /api/user/notifications`
Updates notification preferences. Enforces that SMS toggles cannot be enabled unless `phone_verified_at` is set.

**Request Payload:**
```json
{
  "preferences": {
    "email": { "export": true, "audit": true, "adr": false },
    "sms": { "export": false, "audit": true, "adr": false }
  }
}
```

