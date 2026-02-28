-- Tier Module Restructure
-- Adds new modules (analytics, tools, actionPlans, knowledge) to existing tenants
-- based on their tier level. This aligns DB state with the new tier definitions.

-- Galaxy tenants (A&A / Meridian): get all new modules
UPDATE alf_tenants
SET module_config = module_config
  || jsonb_build_object('analytics', '{"pages":["chat"],"actions":["askAnalytics"]}'::jsonb)
  || jsonb_build_object('tools', '{"pages":["quarterly-review","proposal","transition-plan","budget","incident-report","training-plan"],"actions":["generateQBU","generateDeck","generateTransitionPlan","generateBudget","generateIncidentReport","generateTrainingPlan"]}'::jsonb)
  || jsonb_build_object('actionPlans', '{"pages":["action-plans"],"actions":["generateActionPlan"]}'::jsonb)
  || jsonb_build_object('knowledge', '{"pages":["library"],"actions":[]}'::jsonb)
WHERE plan = 'galaxy'
  AND NOT (module_config ? 'tools');

-- Orbit tenants (Summit): get analytics, tools, actionPlans, knowledge
UPDATE alf_tenants
SET module_config = module_config
  || jsonb_build_object('analytics', '{"pages":["chat"],"actions":["askAnalytics"]}'::jsonb)
  || jsonb_build_object('tools', '{"pages":["quarterly-review","proposal","transition-plan","budget","incident-report","training-plan"],"actions":["generateQBU","generateDeck","generateTransitionPlan","generateBudget","generateIncidentReport","generateTrainingPlan"]}'::jsonb)
  || jsonb_build_object('actionPlans', '{"pages":["action-plans"],"actions":["generateActionPlan"]}'::jsonb)
  || jsonb_build_object('knowledge', '{"pages":["library"],"actions":[]}'::jsonb)
WHERE plan = 'orbit'
  AND NOT (module_config ? 'tools');

-- Melmac tenants (Greenfield): get dashboards + analytics only
-- First ensure they have dashboards
UPDATE alf_tenants
SET module_config = module_config
  || jsonb_build_object('dashboards', '{"pages":["operations","labor","quality","timekeeping","safety"],"actions":[]}'::jsonb)
  || jsonb_build_object('analytics', '{"pages":["chat"],"actions":["askAnalytics"]}'::jsonb)
WHERE plan = 'melmac'
  AND NOT (module_config ? 'analytics');
