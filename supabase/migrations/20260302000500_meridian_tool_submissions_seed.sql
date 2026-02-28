-- Seed tool_submissions for Meridian Properties (Galaxy tenant / demo data)
-- These provide demo data for the tool history views.

DO $$
DECLARE
  v_tenant_id uuid;
  v_user_id uuid;
BEGIN
  -- Get Meridian tenant ID (A&A's tenant)
  SELECT id INTO v_tenant_id FROM alf_tenants WHERE company_name ILIKE '%A&A%' OR company_name ILIKE '%Meridian%' LIMIT 1;

  -- Get a user from that tenant for created_by
  SELECT id INTO v_user_id FROM profiles WHERE tenant_id = v_tenant_id LIMIT 1;

  -- Skip if no tenant found
  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'No matching tenant found — skipping seed data';
    RETURN;
  END IF;

  -- QBU / Quarterly Reviews
  INSERT INTO tool_submissions (tenant_id, tool_key, title, form_data, agent_output, status, created_by, created_at)
  VALUES
    (v_tenant_id, 'qbu', 'Meridian Tower — Q3 2025 Review',
     '{"cover":{"clientName":"Meridian Tower","quarter":"Q3 2025","jobName":"Meridian Tower Complex"}}'::jsonb,
     'Quarterly Business Update — Meridian Tower Q3 2025\n\nKey Achievements:\n1. Achieved 97.2% completion rate across all service areas\n2. Zero recordable safety incidents for the quarter\n3. Completed lobby renovation support ahead of schedule\n\nChallenges:\n1. Third-shift staffing gaps during August vacation period\n2. Equipment delivery delays for floor care machinery\n\nNext Quarter Focus:\n- Holiday season preparation and event support scheduling\n- New equipment deployment and training\n- Annual deep clean planning',
     'complete', v_user_id, '2025-10-15T14:30:00Z'),

    (v_tenant_id, 'qbu', 'Meridian Tower — Q4 2025 Review',
     '{"cover":{"clientName":"Meridian Tower","quarter":"Q4 2025","jobName":"Meridian Tower Complex"}}'::jsonb,
     'Quarterly Business Update — Meridian Tower Q4 2025\n\nKey Achievements:\n1. Successfully supported 12 holiday events with zero client complaints\n2. Completed annual deep clean 3 days ahead of schedule\n3. Reduced work ticket volume by 8.3% YoY through proactive maintenance\n\nChallenges:\n1. Snow removal costs exceeded budget by 12% due to above-average snowfall\n2. Two supervisor transitions during the quarter\n\nNext Quarter Focus:\n- Q1 budget reconciliation and variance analysis\n- Spring grounds preparation\n- New supervisor onboarding completion',
     'complete', v_user_id, '2026-01-20T10:00:00Z');

  -- Proposals / Sales Decks
  INSERT INTO tool_submissions (tenant_id, tool_key, title, form_data, agent_output, status, created_by, created_at)
  VALUES
    (v_tenant_id, 'salesDeck', 'Westbridge University — Main Campus',
     '{"companyName":"Westbridge University","vertical":"Education — Higher Ed","facilityType":"Multi-Building Campus"}'::jsonb,
     'SALES PRESENTATION — Westbridge University\nIndustry: Education — Higher Ed\n\nSLIDE 1: COVER\nThe Performance-Focused Choice\nPrepared for: Westbridge University — Main Campus\n\nSLIDE 2: WHY PERFORMANCE MATTERS\n• Strong client retention through consistent service delivery\n• SLA compliance across all managed accounts\n• Long-term client relationships built on trust\n• Cost efficiency below industry benchmarks',
     'complete', v_user_id, '2026-01-05T09:15:00Z'),

    (v_tenant_id, 'salesDeck', 'Metro General Health System — Regional Campus',
     '{"companyName":"Metro General Health System","vertical":"Healthcare — Hospital / Health System","facilityType":"Multi-Building Campus"}'::jsonb,
     'SALES PRESENTATION — Metro General Health System\nIndustry: Healthcare\n\nSLIDE 1: COVER\nThe Performance-Focused Choice\nPrepared for: Metro General Health System — Regional Campus\n\nSLIDE 2: WHY PERFORMANCE MATTERS\n• Healthcare-specific compliance expertise\n• Infection control protocols and training\n• 24/7 coverage with rapid response capabilities\n• Joint Commission readiness support',
     'complete', v_user_id, '2026-02-01T11:30:00Z');

  -- Transition Plan
  INSERT INTO tool_submissions (tenant_id, tool_key, title, form_data, agent_output, status, created_by, created_at)
  VALUES
    (v_tenant_id, 'transitionPlan', 'Meridian Tower — Service Expansion',
     '{"clientName":"Meridian Tower","transitionType":"Service Expansion","servicesInScope":["Grounds Maintenance","Snow & Ice"]}'::jsonb,
     'TRANSITION PLAN — Meridian Tower Service Expansion\n\nPhase 1 (Days 1-15): Planning & Procurement\n- Finalize grounds equipment procurement\n- Recruit and onboard 4 grounds crew members\n- Establish snow removal subcontractor agreements\n\nPhase 2 (Days 16-45): Mobilization\n- Equipment delivery and testing\n- Staff training on site-specific protocols\n- Client walk-through and expectations alignment\n\nPhase 3 (Days 46-90): Steady State\n- Daily operations commence\n- Weekly quality audits\n- 30/60/90 day review schedule with client',
     'complete', v_user_id, '2026-02-10T16:00:00Z');

  -- Incident Report
  INSERT INTO tool_submissions (tenant_id, tool_key, title, form_data, agent_output, status, created_by, created_at)
  VALUES
    (v_tenant_id, 'incidentReport', 'Meridian Tower — Slip/Fall Near Miss',
     '{"siteName":"Meridian Tower, Lobby Level","category":"Slip/Trip/Fall","severity":"Minor — First Aid Only","incidentDate":"2026-02-05"}'::jsonb,
     'INCIDENT REPORT\n\nSite: Meridian Tower, Lobby Level\nDate: February 5, 2026\nCategory: Slip/Trip/Fall — Near Miss\nSeverity: Minor\n\nDescription:\nA visitor reported a near-slip on the lobby marble floor during morning hours. The area had been recently mopped and wet floor signage was in place but partially obscured by a planter.\n\nImmediate Actions:\n1. Additional wet floor signs placed at all entry points\n2. Planter relocated away from signage area\n3. Supervisor notified and area monitored until dry\n\nPreventive Measures:\n1. Review signage placement protocol for lobby area\n2. Adjust morning cleaning schedule to complete before lobby opens\n3. Add non-slip treatment to high-traffic marble sections',
     'complete', v_user_id, '2026-02-05T10:45:00Z');

  RAISE NOTICE 'Seeded % tool submissions for tenant %', 6, v_tenant_id;
END $$;
