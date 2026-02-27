-- Self-Service Automation Pipeline
-- Adds initiated_by_type audit column to 4 tables so Alf can distinguish
-- tenant-initiated pipeline runs from platform-initiated ones.

ALTER TABLE sop_analyses ADD COLUMN initiated_by_type TEXT DEFAULT 'platform'
    CHECK (initiated_by_type IN ('platform', 'tenant'));

ALTER TABLE dept_automation_roadmaps ADD COLUMN initiated_by_type TEXT DEFAULT 'platform'
    CHECK (initiated_by_type IN ('platform', 'tenant'));

ALTER TABLE automation_actions ADD COLUMN initiated_by_type TEXT DEFAULT 'platform'
    CHECK (initiated_by_type IN ('platform', 'tenant'));

ALTER TABLE alf_usage_logs ADD COLUMN initiated_by_type TEXT DEFAULT 'platform'
    CHECK (initiated_by_type IN ('platform', 'tenant'));
