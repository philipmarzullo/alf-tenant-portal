-- Fix: Move Meridian tool_submissions from A&A tenant to Meridian tenant.
-- Migration 20260302000500 accidentally matched A&A's tenant instead of Meridian's.

DO $$
DECLARE
  v_aa_id uuid;
  v_meridian_id uuid;
BEGIN
  SELECT id INTO v_aa_id FROM alf_tenants WHERE slug = 'aaefs';
  SELECT id INTO v_meridian_id FROM alf_tenants WHERE slug = 'meridian';

  IF v_aa_id IS NULL OR v_meridian_id IS NULL THEN
    RAISE NOTICE 'Skipping — need both aaefs and meridian tenants';
    RETURN;
  END IF;

  -- Delete the misplaced seed entries from A&A (titles contain "Meridian")
  DELETE FROM tool_submissions
  WHERE tenant_id = v_aa_id
    AND title ILIKE '%Meridian%';

  -- Re-insert into Meridian tenant
  -- Get a Meridian user for created_by
  DECLARE v_user_id uuid;
  BEGIN
    SELECT id INTO v_user_id FROM profiles WHERE tenant_id = v_meridian_id LIMIT 1;

    INSERT INTO tool_submissions (tenant_id, tool_key, title, form_data, agent_output, status, created_by, created_at)
    VALUES
      (v_meridian_id, 'qbu', 'Meridian Tower — Q3 2025 Review',
       '{"cover":{"clientName":"Meridian Tower","quarter":"Q3 2025","jobName":"Meridian Tower Complex"}}'::jsonb,
       'Quarterly Business Update — Meridian Tower Q3 2025

Key Achievements:
1. Achieved 97.2% completion rate across all service areas
2. Zero recordable safety incidents for the quarter
3. Completed lobby renovation support ahead of schedule

Challenges:
1. Third-shift staffing gaps during August vacation period
2. Equipment delivery delays for floor care machinery

Next Quarter Focus:
- Holiday season preparation and event support scheduling
- New equipment deployment and training
- Annual deep clean planning',
       'complete', v_user_id, '2025-10-15T14:30:00Z'),

      (v_meridian_id, 'qbu', 'Meridian Tower — Q4 2025 Review',
       '{"cover":{"clientName":"Meridian Tower","quarter":"Q4 2025","jobName":"Meridian Tower Complex"}}'::jsonb,
       'Quarterly Business Update — Meridian Tower Q4 2025

Key Achievements:
1. Successfully supported 12 holiday events with zero client complaints
2. Completed annual deep clean 3 days ahead of schedule
3. Reduced work ticket volume by 8.3% YoY through proactive maintenance

Challenges:
1. Snow removal costs exceeded budget by 12% due to above-average snowfall
2. Two supervisor transitions during the quarter

Next Quarter Focus:
- Q1 budget reconciliation and variance analysis
- Spring grounds preparation
- New supervisor onboarding completion',
       'complete', v_user_id, '2026-01-20T10:00:00Z'),

      (v_meridian_id, 'salesDeck', 'Westbridge University — Main Campus',
       '{"companyName":"Westbridge University","vertical":"Education — Higher Ed","facilityType":"Multi-Building Campus"}'::jsonb,
       'SALES PRESENTATION — Westbridge University
Industry: Education — Higher Ed

SLIDE 1: COVER
The Performance-Focused Choice
Prepared for: Westbridge University — Main Campus

SLIDE 2: WHY PERFORMANCE MATTERS
Strong client retention through consistent service delivery
SLA compliance across all managed accounts
Long-term client relationships built on trust
Cost efficiency below industry benchmarks',
       'complete', v_user_id, '2026-01-05T09:15:00Z'),

      (v_meridian_id, 'salesDeck', 'Metro General Health System — Regional Campus',
       '{"companyName":"Metro General Health System","vertical":"Healthcare — Hospital / Health System","facilityType":"Multi-Building Campus"}'::jsonb,
       'SALES PRESENTATION — Metro General Health System
Industry: Healthcare

SLIDE 1: COVER
The Performance-Focused Choice
Prepared for: Metro General Health System — Regional Campus

SLIDE 2: WHY PERFORMANCE MATTERS
Healthcare-specific compliance expertise
Infection control protocols and training
24/7 coverage with rapid response capabilities
Joint Commission readiness support',
       'complete', v_user_id, '2026-02-01T11:30:00Z'),

      (v_meridian_id, 'transitionPlan', 'Meridian Tower — Service Expansion',
       '{"clientName":"Meridian Tower","transitionType":"Service Expansion","servicesInScope":["Grounds Maintenance","Snow & Ice"]}'::jsonb,
       'TRANSITION PLAN — Meridian Tower Service Expansion

Phase 1 (Days 1-15): Planning & Procurement
- Finalize grounds equipment procurement
- Recruit and onboard 4 grounds crew members
- Establish snow removal subcontractor agreements

Phase 2 (Days 16-45): Mobilization
- Equipment delivery and testing
- Staff training on site-specific protocols
- Client walk-through and expectations alignment

Phase 3 (Days 46-90): Steady State
- Daily operations commence
- Weekly quality audits
- 30/60/90 day review schedule with client',
       'complete', v_user_id, '2026-02-10T16:00:00Z'),

      (v_meridian_id, 'incidentReport', 'Meridian Tower — Slip/Fall Near Miss',
       '{"siteName":"Meridian Tower, Lobby Level","category":"Slip/Trip/Fall","severity":"Minor — First Aid Only","incidentDate":"2026-02-05"}'::jsonb,
       'INCIDENT REPORT

Site: Meridian Tower, Lobby Level
Date: February 5, 2026
Category: Slip/Trip/Fall — Near Miss
Severity: Minor

Description:
A visitor reported a near-slip on the lobby marble floor during morning hours. The area had been recently mopped and wet floor signage was in place but partially obscured by a planter.

Immediate Actions:
1. Additional wet floor signs placed at all entry points
2. Planter relocated away from signage area
3. Supervisor notified and area monitored until dry

Preventive Measures:
1. Review signage placement protocol for lobby area
2. Adjust morning cleaning schedule to complete before lobby opens
3. Add non-slip treatment to high-traffic marble sections',
       'complete', v_user_id, '2026-02-05T10:45:00Z');

    RAISE NOTICE 'Moved 6 tool_submissions from A&A to Meridian tenant';
  END;
END $$;
