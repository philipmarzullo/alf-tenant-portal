-- Module Capability Registry: Add module_config JSONB to alf_tenants
-- Run this in Supabase SQL Editor

-- Step 1: Add the column
ALTER TABLE alf_tenants ADD COLUMN IF NOT EXISTS module_config JSONB;

-- Step 2: Seed A&A's config with everything currently built
UPDATE alf_tenants
SET module_config = '{
  "hr": {
    "pages": ["overview", "benefits", "pay-rates", "leave", "unemployment", "union-calendar"],
    "actions": ["draftReminder", "generateWinTeamUpdate", "checkUnionCompliance", "notifyOperations", "checkEligibility", "sendReminder", "runEnrollmentAudit", "generateRateChangeBatch", "askAgent"]
  },
  "finance": {
    "pages": ["overview"],
    "actions": ["draftCollectionEmail", "summarizeAccount"]
  },
  "purchasing": {
    "pages": ["overview"],
    "actions": ["reorderAnalysis"]
  },
  "sales": {
    "pages": ["overview", "contracts", "apc", "tbi"],
    "actions": ["renewalBrief", "apcVarianceAnalysis", "tbiSummary", "pipelineSummary", "askAgent"]
  },
  "ops": {
    "pages": ["overview"],
    "actions": ["vpPerformanceSummary", "inspectionAnalysis", "askAgent"]
  },
  "qbu": {
    "pages": ["builder"],
    "actions": ["generateQBU"]
  },
  "salesDeck": {
    "pages": ["builder"],
    "actions": ["generateDeck"]
  }
}'::jsonb
WHERE slug = 'aa';

-- Verify
SELECT id, slug, company_name, module_config FROM alf_tenants WHERE slug = 'aa';
