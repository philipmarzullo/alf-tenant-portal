-- Meridian Facility Services: Full demo population
-- Adds workspace data missing from initial seed: benefits_enrollments, contracts,
-- ar_aging, vp_performance, additional tool_submissions, dashboard action plans,
-- additional usage logs, and tenant_agent_overrides for activated skill.

-- ═══════════════════════════════════════════════════════════════════════════════
-- BENEFITS ENROLLMENTS
-- 85 employees across 3 Meridian sites. Mix of custodial, grounds, MEP roles.
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO benefits_enrollments (tenant_id, employee_name, hire_date, eligible_date, status, site_name, notes, created_at)
SELECT t.id, e.employee_name, e.hire_date::date, e.eligible_date::date, e.status, e.site_name, e.notes, now()
FROM alf_tenants t,
(VALUES
  -- ── Meridian Tower (Manhattan) — 40 employees ──
  -- Supervisors / Managers
  ('Carlos Rivera',       '2019-03-15', '2019-06-15', 'completed', 'Meridian Tower', 'Site Director. Medical, dental, vision enrolled.'),
  ('Sarah Chen',          '2020-01-10', '2020-04-10', 'completed', 'Meridian Tower', 'Night shift supervisor. Full benefits.'),
  ('Marcus Thompson',     '2021-06-01', '2021-09-01', 'completed', 'Meridian Tower', 'Day shift supervisor. Full benefits.'),
  ('Elena Rodriguez',     '2022-08-15', '2022-11-15', 'completed', 'Meridian Tower', 'MEP coordinator. Medical and dental.'),
  -- Custodial technicians
  ('James Williams',      '2020-05-20', '2020-08-20', 'completed', 'Meridian Tower', 'Day shift custodial. Full benefits.'),
  ('Fatima Hassan',       '2020-09-12', '2020-12-12', 'completed', 'Meridian Tower', 'Day shift custodial. Medical only.'),
  ('Roberto Diaz',        '2021-01-08', '2021-04-08', 'completed', 'Meridian Tower', 'Night shift custodial. Full benefits.'),
  ('Maria Santos',        '2021-03-22', '2021-06-22', 'completed', 'Meridian Tower', 'Day shift custodial. Medical and dental.'),
  ('David Park',          '2021-07-15', '2021-10-15', 'completed', 'Meridian Tower', 'Night shift custodial. Full benefits.'),
  ('Aisha Johnson',       '2021-11-01', '2022-02-01', 'completed', 'Meridian Tower', 'Day shift custodial. Medical only.'),
  ('Pierre Baptiste',     '2022-02-14', '2022-05-14', 'completed', 'Meridian Tower', 'Night shift custodial. Full benefits.'),
  ('Kenji Yamamoto',      '2022-05-30', '2022-08-30', 'completed', 'Meridian Tower', 'Day shift custodial. Dental waived.'),
  ('Rosa Gutierrez',      '2022-09-10', '2022-12-10', 'completed', 'Meridian Tower', 'Night shift custodial. Full benefits.'),
  ('Thomas O''Brien',     '2022-12-01', '2023-03-01', 'completed', 'Meridian Tower', 'Day shift custodial. Full benefits.'),
  ('Yusuf Ahmed',         '2023-02-20', '2023-05-20', 'completed', 'Meridian Tower', 'Night shift custodial. Medical and dental.'),
  ('Linda Nakamura',      '2023-04-15', '2023-07-15', 'completed', 'Meridian Tower', 'Day shift custodial. Full benefits.'),
  ('Victor Popov',        '2023-06-01', '2023-09-01', 'completed', 'Meridian Tower', 'Night shift custodial. Medical only.'),
  ('Diana Morales',       '2023-08-12', '2023-11-12', 'completed', 'Meridian Tower', 'Day shift custodial. Full benefits.'),
  ('Hassan Ali',          '2023-10-05', '2024-01-05', 'completed', 'Meridian Tower', 'Night shift custodial. Full benefits.'),
  ('Jennifer Walsh',      '2023-12-15', '2024-03-15', 'completed', 'Meridian Tower', 'Day shift custodial. Medical and vision.'),
  ('Andrei Petrov',       '2024-02-01', '2024-05-01', 'completed', 'Meridian Tower', 'Night shift custodial. Full benefits.'),
  ('Sophie Laurent',      '2024-04-10', '2024-07-10', 'completed', 'Meridian Tower', 'Day shift custodial. Full benefits.'),
  ('Michael Brown',       '2024-06-20', '2024-09-20', 'completed', 'Meridian Tower', 'Night shift custodial. Vision waived.'),
  ('Priya Sharma',        '2024-08-15', '2024-11-15', 'completed', 'Meridian Tower', 'Day shift custodial. Full benefits.'),
  ('Joseph Okafor',       '2024-10-01', '2025-01-01', 'completed', 'Meridian Tower', 'Night shift custodial. Full benefits.'),
  ('Luz Fernandez',       '2024-11-15', '2025-02-15', 'completed', 'Meridian Tower', 'Day shift custodial. Medical and dental.'),
  ('Brian Kim',           '2025-01-08', '2025-04-08', 'completed', 'Meridian Tower', 'Night shift custodial. Full benefits.'),
  -- MEP technicians
  ('Daniel Wright',       '2020-07-01', '2020-10-01', 'completed', 'Meridian Tower', 'Lead HVAC technician. Full benefits.'),
  ('Oleg Volkov',         '2021-09-15', '2021-12-15', 'completed', 'Meridian Tower', 'Electrician. Medical and dental.'),
  ('Antonio Reyes',       '2022-03-20', '2022-06-20', 'completed', 'Meridian Tower', 'General maintenance. Full benefits.'),
  ('Samuel Green',        '2023-01-10', '2023-04-10', 'completed', 'Meridian Tower', 'Plumber. Full benefits.'),
  -- Grounds
  ('Rafael Torres',       '2021-04-01', '2021-07-01', 'completed', 'Meridian Tower', 'Grounds lead. Full benefits.'),
  ('Kevin Murphy',        '2022-10-15', '2023-01-15', 'completed', 'Meridian Tower', 'Groundskeeper. Medical only.'),
  -- Recent hires (in waiting/pending)
  ('Amira Osman',         '2025-11-01', '2026-02-01', 'submitted', 'Meridian Tower', 'New hire — custodial day shift. Benefits enrollment submitted.'),
  ('Tyler Jackson',       '2025-12-10', '2026-03-10', 'pending',   'Meridian Tower', 'New hire — night shift custodial. Waiting for enrollment docs.'),
  ('Nadia Kowalczyk',     '2026-01-15', '2026-04-15', 'waiting_period', 'Meridian Tower', 'New hire — MEP apprentice. In 90-day waiting period.'),
  ('Emmanuel Adeyemi',    '2026-02-01', '2026-05-01', 'waiting_period', 'Meridian Tower', 'New hire — custodial. In 90-day waiting period.'),
  ('Catalina Vega',       '2026-02-15', '2026-05-15', 'waiting_period', 'Meridian Tower', 'New hire — grounds crew. In 90-day waiting period.'),

  -- ── Meridian Commons (White Plains) — 25 employees ──
  -- Supervisors
  ('Patricia Reeves',     '2019-06-01', '2019-09-01', 'completed', 'Meridian Commons', 'Site manager. Full benefits.'),
  ('Derek Foster',        '2021-02-15', '2021-05-15', 'completed', 'Meridian Commons', 'Shift supervisor. Full benefits.'),
  -- Custodial
  ('Guadalupe Mendoza',   '2020-04-10', '2020-07-10', 'completed', 'Meridian Commons', 'Day shift lead. Full benefits.'),
  ('Tariq Washington',    '2021-05-20', '2021-08-20', 'completed', 'Meridian Commons', 'Night shift custodial. Medical and dental.'),
  ('Irina Sokolova',      '2021-08-01', '2021-11-01', 'completed', 'Meridian Commons', 'Day shift custodial. Full benefits.'),
  ('Charles Lee',         '2022-01-15', '2022-04-15', 'completed', 'Meridian Commons', 'Night shift custodial. Full benefits.'),
  ('Mariam Diallo',       '2022-04-20', '2022-07-20', 'completed', 'Meridian Commons', 'Day shift custodial. Vision waived.'),
  ('Robert Taylor',       '2022-07-01', '2022-10-01', 'completed', 'Meridian Commons', 'Night shift custodial. Full benefits.'),
  ('Yuki Tanaka',         '2022-11-10', '2023-02-10', 'completed', 'Meridian Commons', 'Day shift custodial. Medical only.'),
  ('Oscar Herrera',       '2023-03-15', '2023-06-15', 'completed', 'Meridian Commons', 'Night shift custodial. Full benefits.'),
  ('Grace Nwosu',         '2023-07-01', '2023-10-01', 'completed', 'Meridian Commons', 'Day shift custodial. Full benefits.'),
  ('Ivan Kozlov',         '2023-09-20', '2023-12-20', 'completed', 'Meridian Commons', 'Night shift custodial. Dental waived.'),
  ('Angela Rossi',        '2024-01-05', '2024-04-05', 'completed', 'Meridian Commons', 'Day shift custodial. Full benefits.'),
  ('Dwayne Carter',       '2024-03-18', '2024-06-18', 'completed', 'Meridian Commons', 'Night shift custodial. Medical and dental.'),
  ('Mei Lin Zhang',       '2024-06-01', '2024-09-01', 'completed', 'Meridian Commons', 'Day shift custodial. Full benefits.'),
  -- MEP
  ('Frank Kowalski',      '2020-11-01', '2021-02-01', 'completed', 'Meridian Commons', 'General maintenance tech. Full benefits.'),
  ('Nathan Price',        '2022-08-15', '2022-11-15', 'completed', 'Meridian Commons', 'HVAC tech. Full benefits.'),
  -- Grounds
  ('Jorge Castillo',      '2021-03-01', '2021-06-01', 'completed', 'Meridian Commons', 'Grounds lead. Full benefits.'),
  ('Tyrone Davis',        '2023-05-10', '2023-08-10', 'completed', 'Meridian Commons', 'Groundskeeper. Medical only.'),
  -- Recent hires
  ('Sana Hussain',        '2025-10-15', '2026-01-15', 'submitted', 'Meridian Commons', 'New hire — custodial. Benefits enrollment submitted.'),
  ('Brandon Mitchell',    '2026-01-20', '2026-04-20', 'waiting_period', 'Meridian Commons', 'New hire — night shift. In 90-day waiting period.'),
  ('Anna Petrova',        '2026-02-10', '2026-05-10', 'waiting_period', 'Meridian Commons', 'New hire — custodial. In 90-day waiting period.'),

  -- ── Meridian Park Campus (Stamford) — 20 employees ──
  -- Supervisors
  ('William Hart',        '2020-02-01', '2020-05-01', 'completed', 'Meridian Park Campus', 'Site manager. Full benefits.'),
  ('Lisa Chang',          '2022-06-15', '2022-09-15', 'completed', 'Meridian Park Campus', 'Shift supervisor. Full benefits.'),
  -- Custodial
  ('Francisco Alvarez',   '2020-10-01', '2021-01-01', 'completed', 'Meridian Park Campus', 'Day shift lead. Full benefits.'),
  ('Blessing Obi',        '2021-07-20', '2021-10-20', 'completed', 'Meridian Park Campus', 'Night shift custodial. Medical and dental.'),
  ('Paul Newman',         '2022-01-10', '2022-04-10', 'completed', 'Meridian Park Campus', 'Day shift custodial. Full benefits.'),
  ('Juliana Pereira',     '2022-05-15', '2022-08-15', 'completed', 'Meridian Park Campus', 'Night shift custodial. Full benefits.'),
  ('Kwame Asante',        '2022-09-01', '2022-12-01', 'completed', 'Meridian Park Campus', 'Day shift custodial. Vision waived.'),
  ('Olga Ivanova',        '2023-02-10', '2023-05-10', 'completed', 'Meridian Park Campus', 'Night shift custodial. Full benefits.'),
  ('Raymond Chen',        '2023-06-15', '2023-09-15', 'completed', 'Meridian Park Campus', 'Day shift custodial. Full benefits.'),
  ('Fatou Diop',          '2023-11-01', '2024-02-01', 'completed', 'Meridian Park Campus', 'Night shift custodial. Medical only.'),
  ('Martin O''Connell',   '2024-03-20', '2024-06-20', 'completed', 'Meridian Park Campus', 'Day shift custodial. Full benefits.'),
  ('Anh Nguyen',          '2024-07-15', '2024-10-15', 'completed', 'Meridian Park Campus', 'Night shift custodial. Full benefits.'),
  -- MEP
  ('George Papadopoulos', '2021-01-15', '2021-04-15', 'completed', 'Meridian Park Campus', 'General maintenance. Full benefits.'),
  ('Chris Walker',        '2023-04-01', '2023-07-01', 'completed', 'Meridian Park Campus', 'Electrician. Full benefits.'),
  -- Grounds
  ('Miguel Sandoval',     '2021-09-01', '2021-12-01', 'completed', 'Meridian Park Campus', 'Grounds lead. Full benefits.'),
  ('Ethan Brooks',        '2024-05-10', '2024-08-10', 'completed', 'Meridian Park Campus', 'Groundskeeper. Medical and dental.'),
  -- Recent hires
  ('Destiny Howard',      '2025-12-01', '2026-03-01', 'pending', 'Meridian Park Campus', 'New hire — custodial. Enrollment pending.'),
  ('Pavel Novak',         '2026-02-03', '2026-05-03', 'waiting_period', 'Meridian Park Campus', 'New hire — grounds crew. In 90-day waiting period.')
) AS e(employee_name, hire_date, eligible_date, status, site_name, notes)
WHERE t.slug = 'meridian'
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- CONTRACTS
-- 8 contracts: 3 active, 2 expiring within 90 days, 1 renewed, 1 negotiation, 1 expired
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO contracts (tenant_id, client_name, contract_number, contract_value, start_date, end_date, status, renewal_status, region, assigned_vp, created_at)
SELECT t.id, c.client_name, c.contract_number, c.contract_value, c.start_date::date, c.end_date::date, c.status, c.renewal_status, c.region, c.assigned_vp, now()
FROM alf_tenants t,
(VALUES
  ('Greystone Properties — Meridian Tower',  'MFS-C-2024-001', 1850000, '2024-01-01', '2026-12-31', 'active', 'current',      'NYC Metro',   'Michael Torres'),
  ('Westmark Realty — Meridian Commons',      'MFS-C-2024-002',  920000, '2024-03-01', '2026-02-28', 'active', 'renewal_sent',  'Westchester', 'Michael Torres'),
  ('Harbor Point Dev — Meridian Park Campus', 'MFS-C-2023-003',  680000, '2023-07-01', '2026-06-30', 'active', 'current',      'CT South',    'Karen Liu'),
  ('Brookfield Towers',                       'MFS-C-2025-004', 1200000, '2025-06-01', '2026-05-15', 'active', 'expiring_soon', 'NYC Metro',   'Michael Torres'),
  ('Pinnacle Office Park',                    'MFS-C-2025-005',  540000, '2025-01-01', '2026-04-30', 'active', 'expiring_soon', 'Westchester', 'Karen Liu'),
  ('Riverside Corporate Center',              'MFS-C-2024-006',  780000, '2024-06-01', '2025-05-31', 'renewed', 'renewed',      'CT South',    'Karen Liu'),
  ('MetroCenter Plaza',                       'MFS-C-2026-007', 1100000, '2026-04-01', '2029-03-31', 'negotiation', 'in_negotiation', 'NYC Metro', 'Michael Torres'),
  ('Lakeview Business Park',                  'MFS-C-2023-008',  460000, '2023-01-01', '2025-12-31', 'expired', 'lost',          'Westchester', 'Karen Liu')
) AS c(client_name, contract_number, contract_value, start_date, end_date, status, renewal_status, region, assigned_vp)
WHERE t.slug = 'meridian'
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- AR AGING
-- AR records across 3 sites. Total outstanding ~$180K.
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO ar_aging (tenant_id, client_name, total_outstanding, current_amount, days_30, days_60, days_90, days_91_plus, last_payment_date, as_of_date, created_at)
SELECT t.id, a.client_name, a.total_outstanding, a.current_amt, a.d30, a.d60, a.d90, a.d91, a.last_pay::date, '2026-02-28'::date, now()
FROM alf_tenants t,
(VALUES
  ('Greystone Properties — Meridian Tower',  72500,  42000, 18500, 8000, 4000, 0,    '2026-02-15'),
  ('Westmark Realty — Meridian Commons',      48200,  22000, 12200, 8000, 4000, 2000, '2026-02-01'),
  ('Harbor Point Dev — Meridian Park Campus', 28800,  18800, 6000,  2500, 1500, 0,    '2026-02-10'),
  ('Brookfield Towers',                       18500,  12500, 4000,  2000, 0,    0,    '2026-02-20'),
  ('Pinnacle Office Park',                    12400,  8400,  2500,  1500, 0,    0,    '2026-02-05')
) AS a(client_name, total_outstanding, current_amt, d30, d60, d90, d91, last_pay)
WHERE t.slug = 'meridian'
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- VP PERFORMANCE
-- 2 regional VPs covering the 3 Meridian sites
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO vp_performance (tenant_id, vp_name, region, job_count, safety_inspection_rate, commercial_inspection_rate, deficiencies, incidents, avg_closure_days, period, created_at)
SELECT t.id, v.vp_name, v.region, v.job_count, v.safety_rate, v.commercial_rate, v.deficiencies, v.incidents, v.avg_closure, v.period, now()
FROM alf_tenants t,
(VALUES
  ('Michael Torres', 'NYC Metro / Westchester', 2, 96.4, 91.2, 8,  1, 2.3, 'Q4 2025'),
  ('Michael Torres', 'NYC Metro / Westchester', 2, 94.8, 89.5, 11, 2, 2.8, 'Q3 2025'),
  ('Karen Liu',      'CT South',                1, 98.1, 94.7, 4,  0, 1.5, 'Q4 2025'),
  ('Karen Liu',      'CT South',                1, 97.2, 93.1, 5,  1, 1.8, 'Q3 2025')
) AS v(vp_name, region, job_count, safety_rate, commercial_rate, deficiencies, incidents, avg_closure, period)
WHERE t.slug = 'meridian'
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- ADDITIONAL TOOL SUBMISSIONS
-- Budget builder, training plan (missing from prior seed)
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_tenant_id uuid;
  v_user_id uuid;
BEGIN
  SELECT id INTO v_tenant_id FROM alf_tenants WHERE slug = 'meridian';
  IF v_tenant_id IS NULL THEN RETURN; END IF;
  SELECT id INTO v_user_id FROM profiles WHERE tenant_id = v_tenant_id LIMIT 1;

  -- Budget Builder: Meridian Tower expansion staffing model
  INSERT INTO tool_submissions (tenant_id, tool_key, title, form_data, agent_output, status, created_by, created_at)
  VALUES (v_tenant_id, 'budget', 'Meridian Tower — Expansion Staffing Model',
    '{"siteName":"Meridian Tower","projectType":"Service Expansion","newSquareFootage":"45,000","serviceScope":["Janitorial","MEP"],"targetStartDate":"2026-04-01"}'::jsonb,
    E'STAFFING & BUDGET MODEL — Meridian Tower Expansion\n\nScope: Additional 45,000 sq ft (floors 26-30)\nServices: Janitorial + MEP\nTarget Start: April 1, 2026\n\n1. STAFFING REQUIREMENTS\n\nJanitorial:\n- Day shift: 4 custodial technicians (1 per 11,250 sq ft)\n- Night shift: 3 custodial technicians\n- Supervisor coverage: Existing day supervisor can absorb, add 1 night lead\n- Total new headcount: 8\n\nMEP:\n- General maintenance: 1 additional technician\n- Shared HVAC coverage from existing team (with OT budget)\n- Total new headcount: 1\n\n2. ANNUAL COST PROJECTION\n\n| Category | Monthly | Annual |\n|----------|---------|--------|\n| Labor — Janitorial (8 FTE) | $28,800 | $345,600 |\n| Labor — MEP (1 FTE) | $5,200 | $62,400 |\n| Benefits (30% load) | $10,200 | $122,400 |\n| Supplies & Chemicals | $2,400 | $28,800 |\n| Equipment Lease | $1,800 | $21,600 |\n| Subtotal | $48,400 | $580,800 |\n| Management fee (8%) | $3,872 | $46,464 |\n| **Total** | **$52,272** | **$627,264** |\n\n3. MOBILIZATION TIMELINE\n- Weeks 1-2: Recruit and screen candidates\n- Weeks 3-4: Onboard, train, equipment procurement\n- Week 5: Soft launch with existing supervisor oversight\n- Week 6: Full service commencement\n\n4. ASSUMPTIONS\n- Blended custodial rate: $18.50/hr + benefits\n- MEP technician rate: $32.50/hr + benefits\n- Equipment amortized over 36-month lease\n- Supplies based on $0.64/sq ft/year industry benchmark',
    'complete', v_user_id, '2026-02-12T14:00:00Z');

  -- Training Plan: Stamford new hire onboarding
  INSERT INTO tool_submissions (tenant_id, tool_key, title, form_data, agent_output, status, created_by, created_at)
  VALUES (v_tenant_id, 'trainingPlan', 'Stamford — New Hire Onboarding Program',
    '{"siteName":"Meridian Park Campus","programType":"New Hire Onboarding","targetAudience":"Custodial Technicians","durationWeeks":2}'::jsonb,
    E'TRAINING PLAN — New Hire Onboarding\nMeridian Park Campus — Custodial Technicians\nDuration: 2 Weeks\n\nWEEK 1: FUNDAMENTALS\n\nDay 1 — Orientation\n- Company overview and values\n- Site tour: Meridian Park Campus building layout\n- Meet the team: supervisor introduction, buddy assignment\n- Safety orientation: PPE, chemical safety, emergency procedures\n- WinTeam mobile app setup and clock-in training\n- Lighthouse task app walkthrough\n\nDay 2-3 — Core Skills\n- Restroom cleaning protocol (hands-on with buddy)\n- Chemical dilution and SDS review\n- Proper mopping and floor care techniques\n- Waste management and recycling procedures\n- High-touch surface disinfection methods\n\nDay 4-5 — Building-Specific Training\n- Floor plan review: cleaning zones and assignment areas\n- Equipment operation: vacuum, auto-scrubber, burnisher (observation only)\n- Client expectations and building rules\n- Elevator and stairwell cleaning procedures\n- End-of-shift reporting and cart restocking\n\nWEEK 2: SUPERVISED PRACTICE\n\nDay 6-8 — Buddy Shifts\n- Work alongside assigned buddy on full shift\n- Practice all core tasks with real-time coaching\n- Begin logging tasks independently in Lighthouse\n- Supervisor check-in at mid-shift and end-of-shift\n\nDay 9-10 — Independent Assessment\n- Complete assigned zone independently\n- Supervisor quality inspection and feedback\n- Written knowledge check: safety, chemicals, procedures\n- Sign-off on competency checklist\n\nCOMPLETION CRITERIA\n- All safety modules completed in training portal\n- Quality score >= 85% on independent assessment\n- Buddy and supervisor sign-off on competency form\n- WinTeam and Lighthouse proficiency confirmed',
    'complete', v_user_id, '2026-02-18T10:30:00Z');

  -- Proposal: Ridgefield Corporate Park
  INSERT INTO tool_submissions (tenant_id, tool_key, title, form_data, agent_output, status, created_by, created_at)
  VALUES (v_tenant_id, 'salesDeck', 'Ridgefield Corporate Park — Campus Services',
    '{"companyName":"Ridgefield Corporate Park","vertical":"Commercial Office — Corporate Campus","facilityType":"Multi-Building Campus","squareFootage":"320,000"}'::jsonb,
    E'SALES PRESENTATION — Ridgefield Corporate Park\nIndustry: Commercial Office — Corporate Campus\n\nSLIDE 1: COVER\nThe Performance-Focused Choice\nPrepared for: Ridgefield Corporate Park\n\nSLIDE 2: WHY PERFORMANCE MATTERS\n- 98%+ client retention across managed portfolio\n- 99%+ SLA compliance track record\n- Average client relationship exceeds 7 years\n- Cost efficiency consistently below industry benchmarks\n\nSLIDE 3: UNDERSTANDING YOUR NEEDS\n- 320,000 sq ft campus environment requiring coordinated service delivery\n- Multiple buildings demand consistent standards and central oversight\n- Grounds maintenance critical for campus image and tenant satisfaction\n- Need for responsive maintenance and proactive issue identification\n\nSLIDE 4: OUR APPROACH\n- Dedicated site team with campus-trained specialists\n- SYNC service model: 5 specialist roles for accountability\n- Technology-driven oversight via Lighthouse and AA360\n- Quarterly business reviews with transparent performance data',
    'complete', v_user_id, '2026-01-28T15:00:00Z');

  -- Transition Plan: Ridgefield Corporate Park onboarding
  INSERT INTO tool_submissions (tenant_id, tool_key, title, form_data, agent_output, status, created_by, created_at)
  VALUES (v_tenant_id, 'transitionPlan', 'Ridgefield Corporate Park — New Account Onboarding',
    '{"clientName":"Ridgefield Corporate Park","transitionType":"New Account Onboarding","servicesInScope":["Janitorial","Grounds Maintenance","Snow & Ice"],"squareFootage":"320,000"}'::jsonb,
    E'TRANSITION PLAN — Ridgefield Corporate Park\nNew Account Onboarding | 320,000 sq ft Campus\nServices: Janitorial, Grounds, Snow & Ice\n\nPHASE 1: DISCOVERY & PLANNING (Days 1-15)\n- Site assessment walk-through with client facilities team\n- Review existing vendor scope, staffing model, and pain points\n- Develop detailed staffing plan: 18 FTE janitorial, 4 grounds, 2 MEP support\n- Procure site-specific equipment and chemical inventory\n- Establish supply chain and vendor relationships\n- Set up WinTeam job codes and Lighthouse site configuration\n\nPHASE 2: MOBILIZATION (Days 16-45)\n- Recruit and hire 24 team members (leverage existing talent pipeline)\n- 2-week training program: site-specific protocols, equipment, safety\n- Equipment delivery, installation, and testing\n- Supervisor training on client expectations and reporting cadence\n- Client IT coordination for building access and badge setup\n- Soft launch weekend with full supervisor oversight\n\nPHASE 3: STABILIZATION (Days 46-90)\n- Full service operations commence\n- Daily quality audits by site supervisor (first 30 days)\n- Weekly client check-ins with operations manager\n- 30-day review meeting with client: KPIs, feedback, adjustments\n- 60-day review: performance trending and staffing optimization\n- 90-day formal review: transition complete, move to BAU reporting\n\nKEY MILESTONES\n- Day 1: Kickoff meeting with client\n- Day 15: Staffing plan approved, equipment ordered\n- Day 30: Team hired and in training\n- Day 45: Soft launch\n- Day 46: Full service go-live\n- Day 90: Transition closeout and QBU baseline established',
    'complete', v_user_id, '2026-02-03T09:00:00Z');

  -- Incident Report: White Plains slip-and-fall
  INSERT INTO tool_submissions (tenant_id, tool_key, title, form_data, agent_output, status, created_by, created_at)
  VALUES (v_tenant_id, 'incidentReport', 'Meridian Commons — Slip-and-Fall at Loading Dock',
    '{"siteName":"Meridian Commons, Loading Dock B","category":"Slip/Trip/Fall","severity":"Recordable — Medical Treatment","incidentDate":"2026-02-10","employeeName":"Robert Taylor","shift":"Night"}'::jsonb,
    E'INCIDENT REPORT\n\nSite: Meridian Commons — Loading Dock B\nDate: February 10, 2026 — 22:45\nEmployee: Robert Taylor, Night Shift Custodial Technician\nCategory: Slip/Trip/Fall\nSeverity: Recordable — Medical Treatment Required\n\nDESCRIPTION:\nRobert Taylor slipped on an ice patch at Loading Dock B while transporting waste bins to the dumpster enclosure. The dock area had been pre-treated at 18:00, but temperatures dropped below forecast and black ice formed on the concrete ramp surface between 21:00-22:00.\n\nINJURY:\nLeft wrist sprain. Employee was transported to White Plains Urgent Care by supervisor Derek Foster. X-ray negative for fracture. Wrist splint applied, prescribed 3 days light duty, cleared to return full duty 2/14.\n\nROOT CAUSE ANALYSIS:\n1. Pre-treatment application at 18:00 was insufficient for the overnight temperature drop\n2. Re-treatment protocol calls for re-application when temps drop below 28°F — this was not performed\n3. Loading dock lighting adequate but dock ramp has no anti-slip surface treatment\n\nCORRECTIVE ACTIONS:\n1. IMMEDIATE: Re-treat all loading docks and exterior walkways (completed 23:15)\n2. Install temperature-activated alert system for grounds crew (target: 2/28)\n3. Apply anti-slip coating to loading dock ramps at all 3 sites (target: 3/15)\n4. Retrain grounds team on re-treatment trigger protocols (completed 2/12)\n5. Add dock ramp check to night shift supervisor rounds checklist (completed 2/11)\n\nOSHA RECORDABLE: Yes — TRIR impact calculated and reported to Safety Manager.',
    'complete', v_user_id, '2026-02-10T23:30:00Z');

END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- ADDITIONAL DASHBOARD ACTION PLANS (3 batches per spec)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO automation_actions (tenant_id, department, phase, title, description, assignee_type, status, source, priority, site_name, initiated_by_type, created_at, updated_at)
SELECT t.id, a.department, 'quick-win', a.title, a.description, 'human', a.status, 'dashboard_action_plan', a.priority, a.site_name, 'tenant', a.created_at::timestamptz, a.updated_at::timestamptz
FROM alf_tenants t,
(VALUES
  -- Batch 1: 3 weeks ago — all completed/dismissed
  ('operations', 'Audit coverage gap at Meridian Park Campus', 'Commercial inspection rate at 87% for January, below 90% target. Schedule additional supervisor walk-throughs for common areas and restrooms. Review audit checklist for completeness.', 'completed', 'high', 'Meridian Park Campus - Stamford', '2026-02-07 09:00:00', '2026-02-14 16:00:00'),
  ('labor', 'Review overtime trend at Meridian Tower', 'OT hours up 15% month-over-month. Appears concentrated on night shift. Review scheduling and evaluate if weekend coverage model needs adjustment.', 'completed', 'medium', 'Meridian Tower - Manhattan', '2026-02-07 09:10:00', '2026-02-12 10:00:00'),
  ('quality', 'Address tenant complaint pattern — floors 10-12', 'Three complaints in January related to restroom cleanliness on floors 10-12. Check staffing assignment, review cleaning logs, meet with assigned technician.', 'completed', 'high', 'Meridian Tower - Manhattan', '2026-02-07 09:20:00', '2026-02-10 14:00:00'),
  ('timekeeping', 'Resolve missing clock-ins for January', '6 employees at Meridian Commons had 3+ missing clock-ins in January. Follow up with individuals and verify WinTeam mobile app is functioning correctly.', 'dismissed', 'medium', 'Meridian Commons - White Plains', '2026-02-07 09:30:00', '2026-02-09 11:00:00'),
  ('safety', 'Close out Q4 corrective actions', '2 corrective actions from Q4 safety review still open: loading dock lighting upgrade and chemical storage reorganization. Both past deadline.', 'completed', 'critical', 'Meridian Commons - White Plains', '2026-02-07 09:40:00', '2026-02-15 15:00:00'),

  -- Batch 2: last week — mix in-progress and open
  ('operations', 'Staffing plan for spring grounds ramp-up', 'Grounds season starting mid-March. Need to hire 2 seasonal groundskeepers for Meridian Tower and 1 for Meridian Park Campus. Post positions and schedule interviews.', 'in_progress', 'high', NULL, '2026-02-21 09:00:00', '2026-02-24 10:00:00'),
  ('labor', 'Benchmark labor rates against market', 'Annual labor rate review due. Pull regional wage data for custodial and MEP roles. Identify any positions below market that could affect retention.', 'open', 'medium', NULL, '2026-02-21 09:10:00', '2026-02-21 09:10:00'),
  ('quality', 'Implement monthly deep-clean rotation at all sites', 'Audit data shows quality scores dip in weeks without scheduled deep cleans. Propose monthly rotation schedule for conference rooms, lobbies, and break rooms.', 'in_progress', 'medium', NULL, '2026-02-21 09:20:00', '2026-02-23 14:00:00'),
  ('timekeeping', 'Configure WinTeam geofence for Stamford campus', 'Meridian Park Campus has the highest exception rate. Configure geofence to auto-validate clock-ins within campus boundary.', 'open', 'medium', 'Meridian Park Campus - Stamford', '2026-02-21 09:30:00', '2026-02-21 09:30:00'),
  ('safety', 'Schedule annual fire extinguisher inspections', 'Annual inspections due March 15 for all 3 sites. Coordinate with vendor, schedule after-hours access, notify building management.', 'in_progress', 'high', NULL, '2026-02-21 09:40:00', '2026-02-22 11:00:00'),
  ('operations', 'Review equipment maintenance backlog', 'TMA shows 4 overdue PM work orders for auto-scrubbers and burnishers. Prioritize based on equipment condition and schedule maintenance windows.', 'open', 'medium', NULL, '2026-02-21 09:50:00', '2026-02-21 09:50:00'),

  -- Batch 3: 2 days ago — all open
  ('operations', 'Prepare Q1 2026 QBU materials for Meridian Tower', 'Quarter ends March 31. Start collecting metrics, testimonials, and project photos. Schedule client pre-meeting for mid-March.', 'open', 'high', 'Meridian Tower - Manhattan', '2026-02-26 09:00:00', '2026-02-26 09:00:00'),
  ('labor', 'Investigate turnover spike at Meridian Commons', '3 resignations in February at Meridian Commons — higher than normal. Conduct exit interview analysis and review supervisor feedback.', 'open', 'critical', 'Meridian Commons - White Plains', '2026-02-26 09:10:00', '2026-02-26 09:10:00'),
  ('quality', 'Calibrate audit scoring across all sites', 'Meridian Tower averaging 94% audit scores while Park Campus averages 88%. May indicate scoring inconsistency rather than performance gap. Cross-audit with standardized checklist.', 'open', 'medium', NULL, '2026-02-26 09:20:00', '2026-02-26 09:20:00'),
  ('safety', 'Post-incident review: loading dock slip-and-fall', 'Feb 10 recordable incident at Meridian Commons loading dock. Review corrective action implementation status and verify all 5 items on track.', 'open', 'critical', 'Meridian Commons - White Plains', '2026-02-26 09:30:00', '2026-02-26 09:30:00'),
  ('timekeeping', 'Audit February timecard exceptions across all sites', 'Monthly exception review due. Pull WinTeam exception report, categorize by type (missed punch, early/late, unauthorized OT), and route to supervisors.', 'open', 'medium', NULL, '2026-02-26 09:40:00', '2026-02-26 09:40:00')
) AS a(department, title, description, status, priority, site_name, created_at, updated_at)
WHERE t.slug = 'meridian'
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- ADDITIONAL USAGE LOGS (bring total to ~80)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO alf_usage_logs (tenant_id, action, agent_key, tokens_input, tokens_output, model, initiated_by_type, created_at)
SELECT t.id, l.action, l.agent_key, l.tokens_in, l.tokens_out, 'claude-sonnet-4-20250514', 'tenant',
  (CURRENT_DATE - (l.days_ago || ' days')::interval + (l.hour || ' hours')::interval)::timestamptz
FROM alf_tenants t,
(VALUES
  -- Analytics agent calls
  ('agent_call', 'analytics', 1800, 2600, 0, 10),
  ('agent_call', 'analytics', 2100, 3200, 1, 14),
  ('agent_call', 'analytics', 1900, 2800, 3, 11),
  ('agent_call', 'analytics', 2000, 3000, 5, 9),
  ('agent_call', 'analytics', 1700, 2500, 8, 15),
  ('agent_call', 'analytics', 2200, 3300, 12, 10),
  ('agent_call', 'analytics', 1800, 2700, 16, 14),
  ('agent_call', 'analytics', 2100, 3100, 20, 11),
  -- Transition plan generation
  ('agent_call', 'transitionPlan', 3200, 4800, 6, 10),
  ('agent_call', 'transitionPlan', 3500, 5100, 13, 14),
  -- Budget builder
  ('agent_call', 'budget', 2800, 4200, 9, 11),
  -- Training plan
  ('agent_call', 'trainingPlan', 2500, 3800, 11, 15),
  -- Incident report
  ('agent_call', 'incidentReport', 2200, 3400, 4, 10),
  -- Sales deck generation
  ('deck_download', 'salesDeck', 3600, 5400, 7, 14),
  ('deck_download', 'salesDeck', 3400, 5100, 19, 11),
  -- Additional ops calls
  ('agent_call', 'ops', 2000, 2900, 0, 16),
  ('agent_call', 'ops', 2300, 3200, 2, 11),
  ('agent_call', 'ops', 2100, 3100, 4, 16),
  ('agent_call', 'ops', 2400, 3400, 7, 9),
  ('agent_call', 'ops', 2200, 3100, 9, 16),
  -- Additional HR calls
  ('agent_call', 'hr', 1300, 1900, 0, 14),
  ('agent_call', 'hr', 1100, 1600, 3, 16),
  ('agent_call', 'hr', 1400, 2000, 5, 10),
  ('agent_call', 'hr', 1200, 1700, 9, 16),
  -- Additional finance calls
  ('agent_call', 'finance', 1900, 2700, 2, 10),
  ('agent_call', 'finance', 1700, 2400, 6, 16)
) AS l(action, agent_key, tokens_in, tokens_out, days_ago, hour)
WHERE t.slug = 'meridian';


-- ═══════════════════════════════════════════════════════════════════════════════
-- TENANT AGENT OVERRIDE: Activated skill from SOP automation
-- Links to the "Auto-generate shift completion summaries" action (d0000001-...-001)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO tenant_agent_overrides (tenant_id, agent_key, custom_prompt_additions, is_enabled)
SELECT t.id,
  'ops',
  E'## Activated Skill: Shift Completion Summary Generator\nWhen asked to generate a shift completion summary, compile end-of-shift data from Lighthouse task logs. Include:\n- Overall task completion rate for the shift\n- Completed vs. open items by zone/floor\n- Any flagged maintenance issues\n- Staffing notes (absences, late arrivals)\n- Priority items for next shift\nFormat as a concise summary suitable for email to site supervisor.',
  true
FROM alf_tenants t
WHERE t.slug = 'meridian'
ON CONFLICT (tenant_id, agent_key) DO UPDATE
  SET custom_prompt_additions = EXCLUDED.custom_prompt_additions;
