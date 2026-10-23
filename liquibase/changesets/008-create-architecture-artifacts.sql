--liquibase formatted sql
--changeset ravi.kundu:008-create-architecture-artifacts

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS dev.projects (
    id VARCHAR(64) PRIMARY KEY,
    user_id UUID REFERENCES dev.app_users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    domain VARCHAR(100) NOT NULL,
    design_level VARCHAR(20) DEFAULT 'hld', -- 'hld' | 'lld' | 'full'
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
    recommendations JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON dev.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated ON dev.projects(updated_at DESC);

-- 2. Document Sections Table
CREATE TABLE IF NOT EXISTS dev.document_sections (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES dev.projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content_markdown TEXT NOT NULL,
    level VARCHAR(20) DEFAULT 'common',
    phase VARCHAR(100),
    position INT DEFAULT 0,
    is_locked BOOLEAN DEFAULT FALSE,
    last_modified_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sections_project ON dev.document_sections(project_id, position);

-- 3. Document Revisions Table (Version History & Restoration)
CREATE TABLE IF NOT EXISTS dev.document_revisions (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES dev.projects(id) ON DELETE CASCADE,
    revision_number INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    snapshot JSONB NOT NULL,
    author VARCHAR(100) DEFAULT 'Architect',
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revisions_project ON dev.document_revisions(project_id, revision_number DESC);

-- 4. Interactive Diagrams Table
CREATE TABLE IF NOT EXISTS dev.diagrams (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES dev.projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    diagram_type VARCHAR(50) NOT NULL,
    mermaid_code TEXT NOT NULL,
    visual_model JSONB NOT NULL DEFAULT '{}'::jsonb,
    version INT DEFAULT 1,
    is_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diagrams_project ON dev.diagrams(project_id);
CREATE INDEX IF NOT EXISTS idx_diagrams_type ON dev.diagrams(diagram_type);

-- 5. Architecture Workflows Table
CREATE TABLE IF NOT EXISTS dev.workflows (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES dev.projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'draft', -- 'draft' | 'published' | 'archived'
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    edges JSONB NOT NULL DEFAULT '[]'::jsonb,
    version INT DEFAULT 1,
    validation JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflows_project ON dev.workflows(project_id);

-- 6. Requirements Registry Table
CREATE TABLE IF NOT EXISTS dev.requirements (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES dev.projects(id) ON DELETE CASCADE,
    stable_id VARCHAR(50) NOT NULL, -- e.g. BR-001, FR-001, NFR-001
    title VARCHAR(255) NOT NULL,
    category VARCHAR(30) NOT NULL, -- 'business' | 'functional' | 'non_functional'
    priority VARCHAR(20) DEFAULT 'medium', -- 'critical' | 'high' | 'medium' | 'low'
    status VARCHAR(30) DEFAULT 'draft', -- 'draft' | 'approved' | 'implemented' | 'verified' | 'deprecated'
    description TEXT NOT NULL,
    acceptance_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requirements_project ON dev.requirements(project_id, stable_id);

-- 7. Requirement Traceability Links Table
CREATE TABLE IF NOT EXISTS dev.requirement_trace_links (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES dev.projects(id) ON DELETE CASCADE,
    requirement_id VARCHAR(64) NOT NULL REFERENCES dev.requirements(id) ON DELETE CASCADE,
    target_type VARCHAR(30) NOT NULL, -- 'component' | 'api' | 'data_model' | 'diagram' | 'test_case' | 'section'
    target_id VARCHAR(64) NOT NULL,
    target_title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trace_req ON dev.requirement_trace_links(requirement_id);
CREATE INDEX IF NOT EXISTS idx_trace_target ON dev.requirement_trace_links(target_type, target_id);

-- 8. Architecture Decision Records (ADRs) Table
CREATE TABLE IF NOT EXISTS dev.adrs (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES dev.projects(id) ON DELETE CASCADE,
    stable_id VARCHAR(50) NOT NULL, -- e.g. ADR-001
    title VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'proposed', -- 'proposed' | 'accepted' | 'rejected' | 'deprecated' | 'superseded'
    context TEXT NOT NULL,
    decision_drivers JSONB NOT NULL DEFAULT '[]'::jsonb,
    options_considered JSONB NOT NULL DEFAULT '[]'::jsonb,
    decision TEXT NOT NULL,
    consequences JSONB NOT NULL DEFAULT '{}'::jsonb,
    risks JSONB NOT NULL DEFAULT '[]'::jsonb,
    author VARCHAR(100) NOT NULL,
    reviewers JSONB NOT NULL DEFAULT '[]'::jsonb,
    superseded_by VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adrs_project ON dev.adrs(project_id, stable_id);

-- 9. Architecture Quality Audits Table
CREATE TABLE IF NOT EXISTS dev.architecture_reviews (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES dev.projects(id) ON DELETE CASCADE,
    overall_score INT NOT NULL,
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    findings JSONB NOT NULL DEFAULT '[]'::jsonb,
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_project ON dev.architecture_reviews(project_id, evaluated_at DESC);

-- Enable RLS for all new tables
ALTER TABLE dev.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev.document_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev.document_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev.diagrams ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev.requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev.requirement_trace_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev.adrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev.architecture_reviews ENABLE ROW LEVEL SECURITY;

-- Permissive policies for application access
CREATE POLICY "App access projects" ON dev.projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "App access sections" ON dev.document_sections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "App access revisions" ON dev.document_revisions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "App access diagrams" ON dev.diagrams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "App access workflows" ON dev.workflows FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "App access requirements" ON dev.requirements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "App access trace_links" ON dev.requirement_trace_links FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "App access adrs" ON dev.adrs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "App access reviews" ON dev.architecture_reviews FOR ALL USING (true) WITH CHECK (true);

