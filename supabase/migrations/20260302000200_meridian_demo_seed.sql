-- Meridian Facility Services: Full demo seed data
-- Populates tenant_sites, client_contacts, tenant_documents, sop_analyses,
-- dept_automation_roadmaps, automation_actions, qbu_submissions, qbu_intake_data,
-- qbu_testimonials, alf_usage_logs, and dashboard action plans.

-- ─── Tenant Sites ────────────────────────────────────────────────────────────

INSERT INTO tenant_sites (id, tenant_id, site_name, job_name, job_number, address, sq_footage, is_active)
SELECT
    gen_random_uuid(),
    t.id,
    s.site_name,
    s.job_name,
    s.job_number,
    s.address,
    s.sq_footage,
    true
FROM alf_tenants t,
(VALUES
    ('Meridian Tower', 'Meridian Tower - Manhattan', 'MFS-001', '350 Park Avenue, New York, NY 10022', '250,000'),
    ('Meridian Commons', 'Meridian Commons - White Plains', 'MFS-002', '100 Main Street, White Plains, NY 10601', '120,000'),
    ('Meridian Park Campus', 'Meridian Park Campus - Stamford', 'MFS-003', '1 Atlantic Street, Stamford, CT 06901', '80,000')
) AS s(site_name, job_name, job_number, address, sq_footage)
WHERE t.slug = 'meridian'
ON CONFLICT DO NOTHING;

-- ─── Client Contacts ─────────────────────────────────────────────────────────

INSERT INTO client_contacts (id, tenant_id, site_id, name, title, email, is_qbu_attendee, is_active)
SELECT
    gen_random_uuid(),
    ts.tenant_id,
    ts.id,
    c.name,
    c.title,
    c.email,
    c.is_qbu,
    true
FROM tenant_sites ts
JOIN alf_tenants t ON ts.tenant_id = t.id AND t.slug = 'meridian'
CROSS JOIN LATERAL (VALUES
    -- Meridian Tower contacts
    ('Margaret Chen', 'VP of Facilities', 'mchen@greystoneproperties.com', true),
    ('David Kowalski', 'Building Manager', 'dkowalski@greystoneproperties.com', true),
    ('Rachel Adams', 'Tenant Relations Director', 'radams@greystoneproperties.com', false)
) AS c(name, title, email, is_qbu)
WHERE ts.site_name = 'Meridian Tower'
ON CONFLICT DO NOTHING;

INSERT INTO client_contacts (id, tenant_id, site_id, name, title, email, is_qbu_attendee, is_active)
SELECT
    gen_random_uuid(),
    ts.tenant_id,
    ts.id,
    c.name,
    c.title,
    c.email,
    c.is_qbu,
    true
FROM tenant_sites ts
JOIN alf_tenants t ON ts.tenant_id = t.id AND t.slug = 'meridian'
CROSS JOIN LATERAL (VALUES
    -- Meridian Commons contacts
    ('James Whitfield', 'Property Manager', 'jwhitfield@westmarkrealty.com', true),
    ('Laura Dominguez', 'Operations Coordinator', 'ldominguez@westmarkrealty.com', true)
) AS c(name, title, email, is_qbu)
WHERE ts.site_name = 'Meridian Commons'
ON CONFLICT DO NOTHING;

INSERT INTO client_contacts (id, tenant_id, site_id, name, title, email, is_qbu_attendee, is_active)
SELECT
    gen_random_uuid(),
    ts.tenant_id,
    ts.id,
    c.name,
    c.title,
    c.email,
    c.is_qbu,
    true
FROM tenant_sites ts
JOIN alf_tenants t ON ts.tenant_id = t.id AND t.slug = 'meridian'
CROSS JOIN LATERAL (VALUES
    -- Meridian Park Campus contacts
    ('Steven Park', 'Campus Director', 'spark@harborporointdev.com', true),
    ('Nancy Tran', 'Facility Coordinator', 'ntran@harborporointdev.com', false)
) AS c(name, title, email, is_qbu)
WHERE ts.site_name = 'Meridian Park Campus'
ON CONFLICT DO NOTHING;

-- ─── Knowledge Base Documents (tenant_documents) ─────────────────────────────
-- These reference SOPs that a facility services company would maintain.
-- No actual files in storage — extracted_text is populated for agent reference.

INSERT INTO tenant_documents (id, tenant_id, department, doc_type, file_name, file_type, file_size, storage_path, title, extracted_text, char_count, status, created_at)
SELECT
    d.doc_id::uuid,
    t.id,
    d.department,
    'sop',
    d.file_name,
    'pdf',
    d.file_size,
    'tenants/' || t.id || '/meridian/documents/' || d.doc_id || '/' || d.file_name,
    d.title,
    d.extracted_text,
    length(d.extracted_text),
    'extracted',
    d.created_at::timestamptz
FROM alf_tenants t,
(VALUES
    ('a0000001-0000-0000-0000-000000000001', 'ops', 'daily-custodial-routine.pdf', 'Daily Custodial Routine', 245000, '2025-11-15 10:00:00',
     'DAILY CUSTODIAL ROUTINE - STANDARD OPERATING PROCEDURE
Meridian Facility Services | Effective: January 2025 | Rev 3.2

1. PURPOSE
This SOP establishes the daily custodial cleaning routine for all Meridian-managed sites. It ensures consistent service delivery, accountability, and quality standards across all shifts.

2. SCOPE
Applies to all custodial technicians (Day and Night shifts) at Meridian Tower, Meridian Commons, and Meridian Park Campus.

3. SHIFT START PROCEDURES
3.1 Clock in using WinTeam mobile app within 5 minutes of shift start
3.2 Report to supervisor station for daily briefing (10 min max)
3.3 Review Lighthouse task board for special requests and priority areas
3.4 Collect cleaning cart — verify chemical levels, microfiber count, liner stock
3.5 Complete pre-shift safety check: wet floor signs, glove inventory, PPE verification

4. RESTROOM CLEANING PROTOCOL (Every 2 hours)
4.1 Place wet floor signs at all entrances
4.2 Flush all fixtures and check for leaks
4.3 Clean and sanitize all surfaces: counters, fixtures, dispensers, partitions
4.4 Refill soap, paper towels, toilet tissue
4.5 Mop floors with neutral disinfectant (dilution ratio: 2oz per gallon)
4.6 Remove trash, replace liners
4.7 Log completion in Lighthouse app with timestamp

5. OFFICE AND COMMON AREA CLEANING
5.1 Empty all waste receptacles, replace liners
5.2 Dust all horizontal surfaces (desks, ledges, windowsills)
5.3 Vacuum carpeted areas with HEPA-filter upright
5.4 Damp mop hard floors
5.5 Clean glass surfaces (interior doors, partitions)
5.6 Spot-clean walls, light switches, door handles (high-touch disinfection)

6. LOBBY AND ENTRANCE MAINTENANCE
6.1 Vacuum walk-off mats
6.2 Clean glass entrance doors (both sides)
6.3 Dust and polish lobby furniture
6.4 Check and replenish hand sanitizer stations
6.5 Inspect floor finish condition — report any wear to supervisor

7. ELEVATOR AND STAIRWELL CARE
7.1 Wipe down elevator panels, buttons, handrails
7.2 Vacuum elevator cab floors
7.3 Clean stairwell handrails
7.4 Sweep stairwell landings

8. END-OF-SHIFT PROCEDURES
8.1 Return cleaning cart to storage — restock for next shift
8.2 Report any maintenance issues via Lighthouse maintenance request
8.3 Complete shift summary in Lighthouse (areas cleaned, issues noted)
8.4 Clock out via WinTeam mobile app

9. QUALITY STANDARDS
- All restrooms must be cleaned every 2 hours during operating hours
- Lighthouse task completion rate target: 95%+ per shift
- Supervisor spot-check minimum: 3 areas per shift
- Client complaint response: acknowledge within 30 minutes, resolve within 2 hours'),

    ('a0000001-0000-0000-0000-000000000002', 'ops', 'floor-care-program.pdf', 'Floor Care Program', 198000, '2025-11-15 10:30:00',
     'FLOOR CARE PROGRAM - STANDARD OPERATING PROCEDURE
Meridian Facility Services | Effective: January 2025 | Rev 2.1

1. PURPOSE
Establishes the floor care maintenance program including daily maintenance, interim care, and restorative processes for all hard floor surfaces.

2. FLOOR TYPES AND TREATMENT MATRIX
2.1 VCT (Vinyl Composition Tile): Strip and refinish quarterly, burnish weekly, damp mop daily
2.2 Terrazzo: Crystallize annually, burnish monthly, damp mop daily
2.3 Concrete (sealed): Re-seal annually, auto-scrub weekly, damp mop daily
2.4 Carpet: Extract quarterly, interim clean monthly, vacuum daily

3. DAILY FLOOR MAINTENANCE
3.1 Dust mop all hard floors with treated dust mop
3.2 Damp mop high-traffic areas with neutral cleaner (Spartan Clean on the Go #8)
3.3 Spot-treat spills immediately — deploy wet floor signs
3.4 Vacuum all carpeted areas with HEPA-filter equipment

4. WEEKLY FLOOR CARE
4.1 Auto-scrub lobbies, corridors, and cafeterias (Tennant T300 or equivalent)
4.2 Burnish VCT floors in lobbies using 20-inch propane burnisher
4.3 Edge and detail corners where auto-scrubber cannot reach
4.4 Inspect baseboards — clean as needed

5. QUARTERLY STRIP AND REFINISH (VCT)
5.1 Schedule with site supervisor minimum 2 weeks in advance
5.2 Post signage 48 hours before work begins
5.3 Strip existing finish using Spartan SparClean Floor Stripper (10:1 dilution)
5.4 Rinse floor twice with clean water
5.5 Apply 4-5 coats of Spartan Shineline Floor Finish, allowing 30-min dry time between coats
5.6 Burnish after final coat has cured (minimum 4 hours)
5.7 Document before/after photos in Lighthouse
5.8 Log materials used for inventory tracking

6. EQUIPMENT MAINTENANCE
6.1 Clean auto-scrubber tanks and squeegees after each use
6.2 Replace burnisher pads per manufacturer schedule
6.3 Inspect electrical cords weekly — tag out damaged equipment
6.4 Monthly PM on all floor equipment — log in TMA

7. CHEMICAL SAFETY
7.1 All chemicals stored in locked chemical room
7.2 SDS sheets posted and accessible
7.3 Floor care chemicals: stripper, finish, neutral cleaner, degreaser
7.4 All staff trained on GHS labeling and proper dilution ratios
7.5 Dilution stations calibrated monthly'),

    ('a0000001-0000-0000-0000-000000000003', 'ops', 'snow-removal-protocol.pdf', 'Snow Removal Protocol', 156000, '2025-11-20 09:00:00',
     'SNOW AND ICE MANAGEMENT PROTOCOL
Meridian Facility Services | Effective: November 2025 | Rev 4.0

1. PURPOSE
Establishes procedures for snow and ice management at all Meridian-managed sites to ensure safe pedestrian and vehicular access during winter weather events.

2. ACTIVATION TRIGGERS
2.1 Weather monitoring: Grounds supervisor monitors NWS forecasts daily Oct 15 - Apr 15
2.2 Pre-treatment: Deploy when forecast shows >40% chance of freezing precipitation within 24 hours
2.3 Active response: Deploy when accumulation reaches 1 inch or ice is present on any walking surface

3. PRE-TREATMENT PROTOCOL
3.1 Apply granular ice melt to all entrances, ramps, and ADA pathways
3.2 Application rate: 3-4 oz per square yard (pre-measured cups on each spreader)
3.3 Pre-treat loading docks, emergency exits, and fire lanes
3.4 Document application time and areas in Lighthouse

4. ACTIVE SNOW REMOVAL
4.1 Priority 1 (within 30 min of trigger): Main entrances, emergency exits, ADA ramps, fire lanes
4.2 Priority 2 (within 1 hour): Sidewalks, parking garage entrances, loading docks
4.3 Priority 3 (within 2 hours): Secondary walkways, parking lot aisles
4.4 Priority 4 (within 4 hours): Full parking lot clearing, perimeter sidewalks

5. EQUIPMENT
5.1 Walk-behind snow blower (2 per site)
5.2 Salt spreaders — calibrated before season start
5.3 Snow shovels, ice scrapers
5.4 Ice melt supply: maintain minimum 2-week supply on site

6. STAFFING
6.1 Grounds crew on-call November through March
6.2 Minimum 2 staff per site during active events
6.3 Overtime authorization: automatic during declared weather events
6.4 4-hour callback for overnight events

7. DOCUMENTATION
7.1 Log all activities in Lighthouse: start time, end time, areas cleared, materials used
7.2 Photograph problem areas before and after treatment
7.3 Report any slip/fall incidents immediately to supervisor and Safety Manager
7.4 Monthly winter operations summary to client by 5th of following month

8. CHEMICAL MANAGEMENT
8.1 Ice melt products: calcium chloride blend for walkways, rock salt for parking areas
8.2 Storage: dry, ventilated area, away from metal fixtures
8.3 Environmental note: avoid application near landscaped beds — use sand/grit alternative'),

    ('a0000001-0000-0000-0000-000000000004', 'ops', 'safety-incident-reporting.pdf', 'Safety Incident Reporting', 134000, '2025-11-20 09:30:00',
     'SAFETY INCIDENT REPORTING PROCEDURE
Meridian Facility Services | Effective: January 2025 | Rev 2.5

1. PURPOSE
Establishes the process for reporting, documenting, and investigating workplace safety incidents including injuries, near misses, and property damage.

2. DEFINITIONS
2.1 Recordable Incident: Any work-related injury or illness requiring medical treatment beyond first aid (per OSHA 29 CFR 1904)
2.2 Near Miss: An event that could have resulted in injury or property damage but did not
2.3 Good Save: A proactive action by an employee that prevented an incident
2.4 TRIR: Total Recordable Incident Rate = (Recordable Incidents × 200,000) / Total Hours Worked

3. IMMEDIATE RESPONSE (0-15 MINUTES)
3.1 Ensure scene safety — remove hazards if safe to do so
3.2 Provide first aid or call 911 for serious injuries
3.3 Notify site supervisor immediately
3.4 Secure the area if investigation is needed
3.5 Do NOT alter the scene unless necessary for safety

4. REPORTING (WITHIN 1 HOUR)
4.1 Supervisor completes Incident Report Form in Lighthouse
4.2 Required fields: date, time, location, persons involved, description, witnesses, photos
4.3 Near misses and good saves also reported in Lighthouse — same form, different category
4.4 Supervisor notifies Safety Manager via phone call for any recordable incident

5. INVESTIGATION (WITHIN 24 HOURS)
5.1 Safety Manager conducts root cause analysis
5.2 Interview all witnesses
5.3 Review surveillance footage if available
5.4 Document findings in Lighthouse investigation module
5.5 Identify corrective actions with responsible parties and deadlines

6. CORRECTIVE ACTIONS
6.1 Immediate corrective action for hazards that pose ongoing risk
6.2 30-day follow-up on all corrective actions
6.3 Update training materials if procedural gap identified
6.4 Share lessons learned at next safety meeting

7. OSHA REPORTING
7.1 Fatality: Report to OSHA within 8 hours
7.2 Hospitalization, amputation, loss of eye: Report to OSHA within 24 hours
7.3 Maintain OSHA 300 log — updated within 7 days of incident
7.4 Post annual OSHA 300A summary Feb 1 - April 30

8. METRICS AND REVIEW
8.1 Monthly safety dashboard review with operations leadership
8.2 TRIR target: below 2.0 company-wide
8.3 Near-miss reporting goal: 3:1 ratio to recordable incidents
8.4 Good save recognition program: monthly acknowledgment'),

    ('a0000001-0000-0000-0000-000000000005', 'hr', 'new-employee-onboarding.pdf', 'New Employee Onboarding', 187000, '2025-12-01 14:00:00',
     'NEW EMPLOYEE ONBOARDING PROCEDURE
Meridian Facility Services | Effective: January 2025 | Rev 3.0

1. PURPOSE
Standardizes the onboarding process for all new hires to ensure compliance, consistent training, and rapid integration into site operations.

2. PRE-HIRE (BEFORE DAY 1)
2.1 HR confirms offer acceptance and start date
2.2 Background check and drug screening completed
2.3 E-Verify submitted within 3 business days of hire
2.4 New hire packet prepared: I-9, W-4, state tax forms, employee handbook acknowledgment
2.5 WinTeam profile created with position, rate, site assignment
2.6 Uniform order placed — 3 shirts, 2 pants, safety shoes if applicable
2.7 Site supervisor notified of start date and shift assignment

3. DAY 1 — ORIENTATION (4 HOURS)
3.1 HR welcome and company overview (30 min)
3.2 Complete all paperwork: I-9 verification, tax forms, direct deposit, emergency contacts
3.3 Benefits overview — explain 30-day waiting period and enrollment process
3.4 Safety orientation: PPE requirements, chemical safety, emergency procedures, fire exits
3.5 WinTeam mobile app setup — clock in/out training
3.6 AA360 platform walkthrough (if applicable)
3.7 Issue ID badge and building access credentials
3.8 Distribute employee handbook — collect signed acknowledgment

4. WEEK 1 — SITE TRAINING
4.1 Site-specific orientation with supervisor (2 hours)
4.2 Tour of facility — restrooms, supply closets, chemical storage, break room
4.3 Introduction to team members
4.4 Hands-on training: cleaning procedures, equipment operation
4.5 Review daily task list in Lighthouse
4.6 Shadow experienced team member for first 3 shifts
4.7 Complete chemical safety quiz (passing score: 80%)

5. 30-DAY CHECK-IN
5.1 Supervisor evaluates performance — documented in WinTeam
5.2 Review attendance and punctuality
5.3 Benefits enrollment window opens — HR sends Employee Navigator invite
5.4 Address any questions or concerns
5.5 Confirm uniform fit — reorder if needed

6. 90-DAY REVIEW
6.1 Formal performance review with supervisor
6.2 Probationary period ends — confirm continued employment
6.3 Discuss career path and advancement opportunities
6.4 Update training records in WinTeam
6.5 Employee eligible for internal job postings

7. UNION EMPLOYEES (32BJ / LOCAL 30)
7.1 Provide union contact information and CBA summary on Day 1
7.2 Confirm starting rate matches CBA scale
7.3 Schedule union orientation session within first 30 days
7.4 Notify union rep of new hire within 48 hours'),

    ('a0000001-0000-0000-0000-000000000006', 'ops', 'qbu-preparation-process.pdf', 'QBU Preparation Process', 167000, '2025-12-01 14:30:00',
     'QUARTERLY BUSINESS UPDATE (QBU) PREPARATION PROCESS
Meridian Facility Services | Effective: January 2025 | Rev 2.0

1. PURPOSE
Standardizes the preparation and delivery of Quarterly Business Updates to clients, ensuring data accuracy, professional presentation, and actionable insights.

2. TIMELINE
2.1 Week 1 of quarter: QBU preparation begins for prior quarter
2.2 Day 1-5: Data collection from all source systems
2.3 Day 6-10: Data validation and narrative drafting
2.4 Day 11-15: Internal review and deck generation
2.5 Day 16-20: Client meeting scheduled and delivered

3. DATA COLLECTION (RESPONSIBLE: SITE SUPERVISOR + OPS MANAGER)
3.1 Pull work ticket completion data from Lighthouse (filter by quarter)
3.2 Pull safety metrics from Lighthouse: incidents, near misses, good saves, TRIR
3.3 Pull labor data from WinTeam: hours, OT, budget vs actual
3.4 Pull quality inspection scores from Lighthouse audit module
3.5 Gather client compliments and complaints (email, meeting notes, surveys)
3.6 Collect project completion photos (before/after)
3.7 Document any special events, emergency responses, or innovations

4. DATA VALIDATION (RESPONSIBLE: OPS MANAGER)
4.1 Cross-reference Lighthouse data with WinTeam for consistency
4.2 Verify headcount matches WinTeam roster
4.3 Confirm budget figures with Finance department
4.4 Flag any anomalies for investigation before presenting

5. QBU DECK STRUCTURE
5.1 Cover page with client name, site, quarter, date
5.2 Executive summary — 3-5 key highlights
5.3 Service delivery metrics: completion rate, response time, quality scores
5.4 Safety performance: TRIR, incidents, near misses, good saves
5.5 Staffing summary: headcount, turnover, training completed
5.6 Financial summary: budget vs actual (if contractually shared)
5.7 Project highlights with photos
5.8 Client testimonials
5.9 Next quarter priorities and improvement plan
5.10 Appendix: detailed data tables

6. INTERNAL REVIEW
6.1 Site supervisor reviews all data for accuracy
6.2 Operations VP reviews narrative and recommendations
6.3 Account manager reviews client-facing language
6.4 Final deck generated via QBU Builder tool

7. CLIENT DELIVERY
7.1 Schedule meeting 2 weeks in advance
7.2 Attendees: Account manager, site supervisor, client contacts
7.3 Meeting duration: 45-60 minutes
7.4 Leave behind: printed deck + digital PDF
7.5 Follow up within 48 hours with meeting notes and action items'),

    ('a0000001-0000-0000-0000-000000000007', 'ops', 'monthly-ops-reporting.pdf', 'Monthly Operations Reporting', 145000, '2025-12-10 11:00:00',
     'MONTHLY OPERATIONS REPORTING PROCEDURE
Meridian Facility Services | Effective: January 2025 | Rev 1.8

1. PURPOSE
Defines the monthly reporting cadence for site operations, ensuring consistent data collection, analysis, and communication to leadership and clients.

2. REPORTING SCHEDULE
2.1 By 3rd business day: Site supervisors submit raw data to Operations Manager
2.2 By 5th business day: Operations Manager compiles site-level reports
2.3 By 8th business day: VP reviews and approves consolidated report
2.4 By 10th business day: Reports distributed to clients (where contractually required)

3. REPORT COMPONENTS
3.1 Work Order Summary: total tickets, completion rate, avg response time, open items
3.2 Labor Summary: scheduled hours vs actual, OT percentage, headcount
3.3 Quality Metrics: inspection scores, corrective actions, client complaints
3.4 Safety Metrics: incidents, near misses, TRIR
3.5 Financial Summary: budget vs actual (internal only unless client-facing)
3.6 Staffing: hires, terminations, open positions, training completed

4. DATA SOURCES
4.1 Lighthouse: work orders, inspections, safety reports
4.2 WinTeam: labor hours, payroll, attendance, headcount
4.3 TMA: MEP work orders, equipment PM schedules (Meridian Tower only)
4.4 Client feedback: emails, meeting notes, survey responses

5. ANALYSIS REQUIREMENTS
5.1 Month-over-month trend comparison (minimum 3 months)
5.2 Identify any metric below target — provide root cause and corrective plan
5.3 Highlight positive trends and team achievements
5.4 Flag any upcoming risks (contract renewals, seasonal challenges, staffing gaps)

6. DISTRIBUTION
6.1 Internal: VP of Operations, Account Manager, Site Supervisor (all sites)
6.2 External: Client facility manager (per contract requirements)
6.3 Format: PDF report + optional dashboard link
6.4 Archive: save to tenant document repository for reference'),

    ('a0000001-0000-0000-0000-000000000008', 'ops', 'work-order-escalation.pdf', 'Work Order Escalation Procedure', 112000, '2025-12-10 11:30:00',
     'WORK ORDER ESCALATION PROCEDURE
Meridian Facility Services | Effective: January 2025 | Rev 2.3

1. PURPOSE
Defines the escalation process for work orders that cannot be completed within standard timeframes, ensuring timely resolution and client communication.

2. PRIORITY CLASSIFICATION
2.1 Critical (P1): Safety hazard, water leak, power outage, security breach — respond within 15 minutes
2.2 High (P2): Client complaint, broken fixture in public area, HVAC issue — respond within 1 hour
2.3 Medium (P3): Routine maintenance, minor repair, supply request — respond within 4 hours
2.4 Low (P4): Cosmetic issue, signage update, non-urgent request — respond within 24 hours

3. ESCALATION TRIGGERS
3.1 Response time exceeded for priority level
3.2 Technician unable to resolve — needs specialized skills or parts
3.3 Client directly escalates to management
3.4 Repeat issue (same problem reported 3+ times in 30 days)

4. ESCALATION CHAIN
4.1 Level 1: Assigned technician → Site supervisor (automatic if response time exceeded)
4.2 Level 2: Site supervisor → Operations Manager (if unresolved within 2x standard response time)
4.3 Level 3: Operations Manager → VP of Operations (if unresolved within 24 hours for P1/P2)
4.4 Level 4: VP → Account Manager + Client notification (if impacting service level agreement)

5. CLIENT COMMUNICATION
5.1 P1/P2 escalations: Client notified within 30 minutes of escalation
5.2 P3 escalations: Client notified if resolution will exceed 24 hours
5.3 All escalations: provide estimated resolution time and interim measures
5.4 Resolution confirmation sent to client within 1 hour of completion

6. DOCUMENTATION
6.1 All escalations logged in Lighthouse with escalation reason
6.2 Root cause noted on resolution
6.3 Weekly escalation summary reviewed by Operations Manager
6.4 Monthly trend analysis included in operations report')
) AS d(doc_id, department, file_name, title, file_size, created_at, extracted_text)
WHERE t.slug = 'meridian'
ON CONFLICT (id) DO NOTHING;

-- ─── SOP Analyses (3 completed, 2 pending) ───────────────────────────────────

INSERT INTO sop_analyses (id, tenant_id, document_id, department, status, analysis, model, tokens_input, tokens_output, initiated_by_type, created_at, updated_at)
SELECT
    a.analysis_id::uuid,
    t.id,
    a.doc_id::uuid,
    a.department,
    a.status,
    a.analysis::jsonb,
    'claude-sonnet-4-20250514',
    a.tokens_in,
    a.tokens_out,
    'tenant',
    a.created_at::timestamptz,
    a.created_at::timestamptz
FROM alf_tenants t,
(VALUES
    ('b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'ops', 'completed', 3200, 2800, '2025-12-05 14:00:00',
     '{"summary":"Daily custodial routine covering shift procedures, restroom cleaning, office maintenance, lobby care, and end-of-shift protocols across all Meridian sites.","manual_steps":[{"step_number":1,"description":"Clock in and attend daily briefing at supervisor station","frequency":"daily","current_effort_minutes":15,"complexity":"low"},{"step_number":2,"description":"Review Lighthouse task board for special requests","frequency":"daily","current_effort_minutes":5,"complexity":"low"},{"step_number":3,"description":"Restroom cleaning every 2 hours with logging","frequency":"daily","current_effort_minutes":25,"complexity":"medium"},{"step_number":4,"description":"Office and common area cleaning including vacuuming and mopping","frequency":"daily","current_effort_minutes":60,"complexity":"medium"},{"step_number":5,"description":"Lobby and entrance maintenance","frequency":"daily","current_effort_minutes":20,"complexity":"low"},{"step_number":6,"description":"End-of-shift summary and cart restock","frequency":"daily","current_effort_minutes":15,"complexity":"low"}],"automation_candidates":[{"step_numbers":[2],"description":"Auto-generate prioritized task list from Lighthouse requests, push to mobile","method":"workflow-automation","suggested_tools":["Lighthouse API","Push notifications"],"effort_to_automate":"low","impact":"medium","priority":"quick-win","estimated_time_saved_minutes_per_occurrence":5},{"step_numbers":[3,6],"description":"Automated restroom cleaning log reminders and shift summary generation","method":"ai-assist","suggested_tools":["Lighthouse","Mobile alerts"],"effort_to_automate":"medium","impact":"high","priority":"quick-win","estimated_time_saved_minutes_per_occurrence":10},{"step_numbers":[4],"description":"Robotic auto-scrubber deployment for large floor areas during off-peak","method":"rpa","suggested_tools":["Tennant AMR","Scheduling system"],"effort_to_automate":"high","impact":"high","priority":"long-term","estimated_time_saved_minutes_per_occurrence":30}],"quick_wins":["Push daily task priorities to mobile devices automatically","Auto-generate shift completion summaries from Lighthouse logs","Set up restroom cleaning countdown timers with alerts"],"long_term_items":["Deploy autonomous floor scrubbers for large common areas","IoT sensors in restrooms for demand-based cleaning triggers"],"automation_score":62,"automation_readiness":"medium"}'),

    ('b0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000004', 'ops', 'completed', 2900, 2500, '2025-12-05 15:00:00',
     '{"summary":"Safety incident reporting procedure covering immediate response, documentation, investigation, corrective actions, and OSHA compliance.","manual_steps":[{"step_number":1,"description":"Secure scene and provide first aid","frequency":"as-needed","current_effort_minutes":15,"complexity":"high"},{"step_number":2,"description":"Complete incident report form in Lighthouse with photos","frequency":"as-needed","current_effort_minutes":30,"complexity":"medium"},{"step_number":3,"description":"Safety Manager conducts root cause analysis and witness interviews","frequency":"as-needed","current_effort_minutes":120,"complexity":"high"},{"step_number":4,"description":"Document corrective actions with deadlines","frequency":"as-needed","current_effort_minutes":30,"complexity":"medium"},{"step_number":5,"description":"Update OSHA 300 log within 7 days","frequency":"as-needed","current_effort_minutes":15,"complexity":"medium"},{"step_number":6,"description":"Monthly safety dashboard review","frequency":"monthly","current_effort_minutes":60,"complexity":"medium"}],"automation_candidates":[{"step_numbers":[2],"description":"AI-assisted incident report drafting from voice notes and photos","method":"ai-assist","suggested_tools":["Speech-to-text","Image analysis","Lighthouse API"],"effort_to_automate":"medium","impact":"high","priority":"medium-term","estimated_time_saved_minutes_per_occurrence":15},{"step_numbers":[5],"description":"Auto-populate OSHA 300 log from Lighthouse incident data","method":"integration","suggested_tools":["Lighthouse","OSHA reporting module"],"effort_to_automate":"medium","impact":"medium","priority":"medium-term","estimated_time_saved_minutes_per_occurrence":10},{"step_numbers":[6],"description":"Auto-generate monthly safety dashboard from incident and near-miss data","method":"ai-assist","suggested_tools":["AA360 analytics","Dashboard automation"],"effort_to_automate":"low","impact":"high","priority":"quick-win","estimated_time_saved_minutes_per_occurrence":45}],"quick_wins":["Auto-generate monthly safety metrics dashboard","Send near-miss trend alerts to supervisors weekly","Auto-calculate and track TRIR in real-time"],"long_term_items":["AI-powered root cause pattern analysis across incidents","Predictive safety risk scoring by site and season"],"automation_score":55,"automation_readiness":"medium"}'),

    ('b0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000005', 'hr', 'completed', 3100, 2700, '2025-12-06 10:00:00',
     '{"summary":"New employee onboarding procedure covering pre-hire preparation, Day 1 orientation, site training, 30-day and 90-day reviews, and union-specific requirements.","manual_steps":[{"step_number":1,"description":"HR confirms offer, completes background check, creates WinTeam profile","frequency":"as-needed","current_effort_minutes":45,"complexity":"medium"},{"step_number":2,"description":"Prepare new hire packet with all required forms","frequency":"as-needed","current_effort_minutes":20,"complexity":"low"},{"step_number":3,"description":"Day 1 orientation: paperwork, safety training, app setup","frequency":"as-needed","current_effort_minutes":240,"complexity":"medium"},{"step_number":4,"description":"Week 1 site-specific training with supervisor","frequency":"as-needed","current_effort_minutes":480,"complexity":"medium"},{"step_number":5,"description":"30-day check-in and benefits enrollment trigger","frequency":"as-needed","current_effort_minutes":30,"complexity":"low"},{"step_number":6,"description":"90-day performance review and probation completion","frequency":"as-needed","current_effort_minutes":45,"complexity":"medium"}],"automation_candidates":[{"step_numbers":[1,2],"description":"Automated onboarding workflow: trigger background check, generate WinTeam profile, assemble digital packet","method":"workflow-automation","suggested_tools":["WinTeam API","DocuSign","Background check API"],"effort_to_automate":"medium","impact":"high","priority":"medium-term","estimated_time_saved_minutes_per_occurrence":40},{"step_numbers":[5],"description":"Auto-trigger 30-day benefits enrollment notification and Employee Navigator invite","method":"notification","suggested_tools":["WinTeam date trigger","Email automation"],"effort_to_automate":"low","impact":"medium","priority":"quick-win","estimated_time_saved_minutes_per_occurrence":15},{"step_numbers":[6],"description":"Auto-generate 90-day review template pre-populated with attendance and training data","method":"ai-assist","suggested_tools":["WinTeam data","Review template generator"],"effort_to_automate":"low","impact":"medium","priority":"quick-win","estimated_time_saved_minutes_per_occurrence":20}],"quick_wins":["Auto-send benefits enrollment reminder at day 30","Pre-populate 90-day review form from WinTeam data","Digital signature collection for handbook acknowledgment"],"long_term_items":["Full digital onboarding portal with progress tracking","Automated compliance verification (I-9, E-Verify) with alerts"],"automation_score":68,"automation_readiness":"high"}')
) AS a(analysis_id, doc_id, department, status, tokens_in, tokens_out, created_at, analysis)
WHERE t.slug = 'meridian'
ON CONFLICT (document_id) DO NOTHING;

-- ─── Automation Roadmap (ops department) ──────────────────────────────────────

INSERT INTO dept_automation_roadmaps (id, tenant_id, department, status, roadmap, sop_analysis_ids, model, tokens_input, tokens_output, initiated_by_type, created_at, updated_at)
SELECT
    'c0000001-0000-0000-0000-000000000001'::uuid,
    t.id,
    'ops',
    'completed',
    '{"department":"ops","total_sops_analyzed":3,"overall_automation_score":62,"summary":"Operations department has strong automation potential in reporting, task management, and floor care. Quick wins in automated reporting and alerts can save 15+ hours monthly. Medium-term gains from workflow integration with Lighthouse and WinTeam. Long-term opportunity in robotic floor care deployment.","phases":[{"phase":"quick-wins","label":"Quick Wins (0-30 days)","items":[{"description":"Auto-generate shift completion summaries from Lighthouse logs","source_sop":"daily-custodial-routine.pdf","effort":"low","impact":"high","estimated_time_saved":"8 hrs/month"},{"description":"Auto-generate monthly safety metrics dashboard","source_sop":"safety-incident-reporting.pdf","effort":"low","impact":"high","estimated_time_saved":"6 hrs/month"},{"description":"Push daily prioritized task lists to mobile devices","source_sop":"daily-custodial-routine.pdf","effort":"low","impact":"medium","estimated_time_saved":"4 hrs/month"}]},{"phase":"medium-term","label":"Medium-Term (1-3 months)","items":[{"description":"AI-assisted incident report drafting from voice notes and photos","source_sop":"safety-incident-reporting.pdf","effort":"medium","impact":"high","estimated_time_saved":"5 hrs/month"},{"description":"Auto-populate OSHA 300 log from Lighthouse incident data","source_sop":"safety-incident-reporting.pdf","effort":"medium","impact":"medium","estimated_time_saved":"3 hrs/month"},{"description":"Automated floor care schedule optimizer based on traffic patterns","source_sop":"floor-care-program.pdf","effort":"medium","impact":"medium","estimated_time_saved":"4 hrs/month"}]},{"phase":"long-term","label":"Long-Term (3-6 months)","items":[{"description":"Deploy autonomous floor scrubbers for large common areas","source_sop":"floor-care-program.pdf","effort":"high","impact":"high","estimated_time_saved":"20 hrs/month"},{"description":"IoT restroom sensors for demand-based cleaning triggers","source_sop":"daily-custodial-routine.pdf","effort":"high","impact":"high","estimated_time_saved":"15 hrs/month"}]}],"dependencies":[{"item":"AI incident drafting","depends_on":"Lighthouse API access","reason":"Need structured incident data feed for AI processing"},{"item":"Autonomous scrubbers","depends_on":"Floor care schedule optimizer","reason":"Robotic deployment needs optimized routing data"}],"total_estimated_monthly_time_saved":"65 hours","recommended_first_action":"Start with auto-generating shift summaries and safety dashboards — both are low-effort, high-impact, and demonstrate value quickly."}'::jsonb,
    ARRAY['b0000001-0000-0000-0000-000000000001'::uuid, 'b0000001-0000-0000-0000-000000000002'::uuid],
    'claude-sonnet-4-20250514',
    4500,
    3800,
    'tenant',
    '2025-12-08 10:00:00',
    '2025-12-08 10:00:00'
FROM alf_tenants t
WHERE t.slug = 'meridian'
ON CONFLICT (tenant_id, department) DO NOTHING;

-- ─── Automation Actions (from roadmap + dashboard action plans) ───────────────

INSERT INTO automation_actions (id, tenant_id, department, roadmap_id, phase, title, description, source_sop, assignee_type, status, agent_key, agent_skill_prompt, effort, impact, estimated_time_saved, source, priority, site_name, initiated_by_type, created_at, updated_at)
SELECT
    a.action_id::uuid,
    t.id,
    a.department,
    CASE WHEN a.roadmap_ref THEN 'c0000001-0000-0000-0000-000000000001'::uuid ELSE NULL END,
    a.phase,
    a.title,
    a.description,
    a.source_sop,
    a.assignee_type,
    a.status,
    a.agent_key,
    a.skill_prompt,
    a.effort,
    a.impact,
    a.time_saved,
    a.src,
    a.priority,
    a.site_name,
    'tenant',
    a.created_at::timestamptz,
    a.updated_at::timestamptz
FROM alf_tenants t,
(VALUES
    -- SOP-derived automation actions (from roadmap)
    ('d0000001-0000-0000-0000-000000000001', 'ops', true, 'quick-win', 'Auto-generate shift completion summaries', 'Automatically compile end-of-shift summaries from Lighthouse task completion logs. Push summary to supervisor and site manager.', 'daily-custodial-routine.pdf', 'agent', 'active', 'ops', 'Generate a shift completion summary from today''s Lighthouse task data. Include completion rate, any open items, and areas needing attention.', 'low', 'high', '8 hrs/month', 'sop', NULL, NULL, '2025-12-10 09:00:00', '2026-01-15 10:00:00'),
    ('d0000001-0000-0000-0000-000000000002', 'ops', true, 'quick-win', 'Auto-generate monthly safety dashboard', 'Create automated monthly safety metrics dashboard from incident, near-miss, and good-save data in Lighthouse.', 'safety-incident-reporting.pdf', 'agent', 'active', 'ops', 'Generate a monthly safety performance summary including TRIR, recordable incidents, near misses, good saves, and trend analysis. Flag any sites above TRIR threshold.', 'low', 'high', '6 hrs/month', 'sop', NULL, NULL, '2025-12-10 09:30:00', '2026-01-20 14:00:00'),
    ('d0000001-0000-0000-0000-000000000003', 'ops', true, 'quick-win', 'Push daily prioritized task lists to mobile', 'Auto-generate and push prioritized task lists to custodial staff mobile devices each morning based on Lighthouse requests and scheduled tasks.', 'daily-custodial-routine.pdf', 'hybrid', 'in_progress', NULL, NULL, 'low', 'medium', '4 hrs/month', 'sop', NULL, NULL, '2025-12-10 10:00:00', '2026-02-01 08:00:00'),
    ('d0000001-0000-0000-0000-000000000004', 'ops', true, 'medium-term', 'AI-assisted incident report drafting', 'Use AI to draft incident reports from supervisor voice notes and photos, pre-populating Lighthouse fields.', 'safety-incident-reporting.pdf', 'agent', 'planned', NULL, NULL, 'medium', 'high', '5 hrs/month', 'sop', NULL, NULL, '2025-12-10 10:30:00', '2025-12-10 10:30:00'),
    ('d0000001-0000-0000-0000-000000000005', 'ops', true, 'medium-term', 'Auto-populate OSHA 300 log from Lighthouse', 'Integrate Lighthouse incident data with OSHA 300 log to auto-populate recordable incident entries.', 'safety-incident-reporting.pdf', 'hybrid', 'planned', NULL, NULL, 'medium', 'medium', '3 hrs/month', 'sop', NULL, NULL, '2025-12-10 11:00:00', '2025-12-10 11:00:00'),
    ('d0000001-0000-0000-0000-000000000006', 'ops', true, 'long-term', 'Deploy autonomous floor scrubbers', 'Deploy and manage robotic auto-scrubbers (Tennant AMR) for large common areas during off-peak hours.', 'floor-care-program.pdf', 'human', 'planned', NULL, NULL, 'high', 'high', '20 hrs/month', 'sop', NULL, NULL, '2025-12-10 11:30:00', '2025-12-10 11:30:00'),

    -- Dashboard action plans
    ('d0000001-0000-0000-0000-000000000007', 'operations', false, 'quick-win', 'Investigate low completion rate at White Plains', 'Meridian Commons showing 58% ticket completion in H2 2025, down from 78% in H1. Review staffing levels, ticket volume, and any operational changes. Meet with Sarah Chen to develop improvement plan.', NULL, 'human', 'active', NULL, NULL, 'low', 'high', NULL, 'dashboard_action_plan', 'high', 'Meridian Commons - White Plains', '2026-01-15 09:00:00', '2026-02-01 10:00:00'),
    ('d0000001-0000-0000-0000-000000000008', 'labor', false, 'quick-win', 'Address chronic labor budget overruns at White Plains', 'Meridian Commons consistently 8-12% above budget every month. OT hours averaging 80/month. Review scheduling efficiency, evaluate if additional headcount is more cost-effective than OT.', NULL, 'human', 'planned', NULL, NULL, 'medium', 'high', NULL, 'dashboard_action_plan', 'high', 'Meridian Commons - White Plains', '2026-01-15 09:30:00', '2026-01-15 09:30:00'),
    ('d0000001-0000-0000-0000-000000000009', 'safety', false, 'quick-win', 'Review Q3 safety spike at Manhattan', 'Meridian Tower had elevated recordable incidents and near-misses in Q3 2025. TRIR spiked to 2.2. Investigate root causes, review training compliance, and implement corrective actions.', NULL, 'human', 'dismissed', NULL, NULL, 'low', 'high', NULL, 'dashboard_action_plan', 'critical', 'Meridian Tower - Manhattan', '2025-10-05 11:00:00', '2025-12-15 16:00:00'),
    ('d0000001-0000-0000-0000-000000000010', 'timekeeping', false, 'quick-win', 'Reduce punch exceptions at Stamford', 'Meridian Park Campus shows 4% exception rate on timekeeping punches — highest across all sites. Review clock-in procedures, check for equipment issues, retrain staff on WinTeam mobile app.', NULL, 'human', 'active', NULL, NULL, 'low', 'medium', NULL, 'dashboard_action_plan', 'medium', 'Meridian Park Campus - Stamford', '2026-01-20 14:00:00', '2026-02-10 09:00:00')
) AS a(action_id, department, roadmap_ref, phase, title, description, source_sop, assignee_type, status, agent_key, skill_prompt, effort, impact, time_saved, src, priority, site_name, created_at, updated_at)
WHERE t.slug = 'meridian'
ON CONFLICT (id) DO NOTHING;

-- ─── QBU Submissions ─────────────────────────────────────────────────────────

-- Q3 2025 QBU for Meridian Tower (delivered)
INSERT INTO qbu_submissions (id, tenant_id, site_id, quarter, year, status, created_at, updated_at)
SELECT
    'e0000001-0000-0000-0000-000000000001'::uuid,
    t.id,
    ts.id,
    'Q3',
    2025,
    'delivered',
    '2025-10-10 09:00:00',
    '2025-10-25 16:00:00'
FROM alf_tenants t
JOIN tenant_sites ts ON ts.tenant_id = t.id AND ts.site_name = 'Meridian Tower'
WHERE t.slug = 'meridian'
ON CONFLICT (id) DO NOTHING;

-- Q4 2025 QBU for Meridian Tower (delivered)
INSERT INTO qbu_submissions (id, tenant_id, site_id, quarter, year, status, created_at, updated_at)
SELECT
    'e0000001-0000-0000-0000-000000000002'::uuid,
    t.id,
    ts.id,
    'Q4',
    2025,
    'delivered',
    '2026-01-08 09:00:00',
    '2026-01-22 16:00:00'
FROM alf_tenants t
JOIN tenant_sites ts ON ts.tenant_id = t.id AND ts.site_name = 'Meridian Tower'
WHERE t.slug = 'meridian'
ON CONFLICT (id) DO NOTHING;

-- ─── QBU Intake Data ─────────────────────────────────────────────────────────

INSERT INTO qbu_intake_data (id, submission_id, tenant_id, section, data, updated_at)
SELECT
    gen_random_uuid(),
    'e0000001-0000-0000-0000-000000000001'::uuid,
    t.id,
    d.section,
    d.data::jsonb,
    '2025-10-15 14:00:00'
FROM alf_tenants t,
(VALUES
    ('overview', '{"siteName":"Meridian Tower","quarter":"Q3 2025","preparedBy":"Carlos Rivera","clientName":"Greystone Properties","highlights":["98.2% work order completion rate","Zero recordable incidents in July and August","Completed lobby floor restoration project ahead of schedule","New night shift lead onboarded — team fully staffed"]}'),
    ('metrics', '{"completionRate":98.2,"responseTime":"22 minutes avg","safetyIncidents":1,"nearMisses":4,"goodSaves":8,"customerComplaints":0,"headcount":40,"turnoverRate":4.2,"otPercentage":8.1,"budgetVariance":-1.8}'),
    ('projects', '{"completedProjects":[{"name":"Lobby Floor Restoration","description":"Full strip and refinish of 12,000 sq ft VCT lobby floor. Completed 3 days ahead of schedule with zero disruption to tenants.","completionDate":"2025-08-15"},{"name":"Restroom Refresh Program","description":"Deep clean and fixture upgrade in 24 restrooms across floors 5-15. New touchless dispensers installed.","completionDate":"2025-09-20"}]}'),
    ('staffing', '{"totalStaff":40,"newHires":3,"separations":1,"openPositions":0,"trainingHoursCompleted":186,"certificationsCurrent":true}')
) AS d(section, data)
WHERE t.slug = 'meridian'
ON CONFLICT (submission_id, section) DO NOTHING;

INSERT INTO qbu_intake_data (id, submission_id, tenant_id, section, data, updated_at)
SELECT
    gen_random_uuid(),
    'e0000001-0000-0000-0000-000000000002'::uuid,
    t.id,
    d.section,
    d.data::jsonb,
    '2026-01-15 14:00:00'
FROM alf_tenants t,
(VALUES
    ('overview', '{"siteName":"Meridian Tower","quarter":"Q4 2025","preparedBy":"Carlos Rivera","clientName":"Greystone Properties","highlights":["97.8% work order completion rate despite holiday surge","Snow response team activated 6 times — zero slip incidents","Successfully managed 3 tenant move-in/move-out events","TRIR improved from 2.2 (Q3) to 1.1 after corrective actions"]}'),
    ('metrics', '{"completionRate":97.8,"responseTime":"25 minutes avg","safetyIncidents":2,"nearMisses":6,"goodSaves":12,"customerComplaints":1,"headcount":40,"turnoverRate":2.5,"otPercentage":12.4,"budgetVariance":3.2}'),
    ('projects', '{"completedProjects":[{"name":"Holiday Deep Clean","description":"Full building deep clean during December holiday closure. All 25 floors completed in 3 days.","completionDate":"2025-12-28"},{"name":"Loading Dock Safety Upgrade","description":"Installed new safety bollards, updated signage, and added LED lighting to loading dock area.","completionDate":"2025-11-15"}]}'),
    ('staffing', '{"totalStaff":40,"newHires":2,"separations":2,"openPositions":1,"trainingHoursCompleted":210,"certificationsCurrent":true}')
) AS d(section, data)
WHERE t.slug = 'meridian'
ON CONFLICT (submission_id, section) DO NOTHING;

-- ─── QBU Testimonials ────────────────────────────────────────────────────────

INSERT INTO qbu_testimonials (id, submission_id, tenant_id, site_name, quote, attributed_to, source, created_at)
SELECT
    gen_random_uuid(),
    q.sub_id::uuid,
    t.id,
    q.site_name,
    q.quote,
    q.attributed_to,
    q.source,
    q.created_at::timestamptz
FROM alf_tenants t,
(VALUES
    ('e0000001-0000-0000-0000-000000000001', 'Meridian Tower', 'The lobby floor looks better than when the building was new. Your team did an outstanding job with zero disruption to our tenants.', 'Margaret Chen, VP of Facilities — Greystone Properties', 'email', '2025-10-12 10:00:00'),
    ('e0000001-0000-0000-0000-000000000001', 'Meridian Tower', 'Carlos and his team consistently go above and beyond. The restroom refresh project was completed ahead of schedule and the quality is exceptional.', 'David Kowalski, Building Manager — Greystone Properties', 'meeting', '2025-10-12 10:30:00'),
    ('e0000001-0000-0000-0000-000000000002', 'Meridian Tower', 'The holiday deep clean was flawless. We came back to a building that felt brand new. Appreciate the team working through the holidays.', 'Margaret Chen, VP of Facilities — Greystone Properties', 'email', '2026-01-10 09:00:00'),
    ('e0000001-0000-0000-0000-000000000002', 'Meridian Tower', 'Your snow response team was incredible this winter. Six events and not a single slip incident. That is the kind of performance that makes us confident in this partnership.', 'David Kowalski, Building Manager — Greystone Properties', 'meeting', '2026-01-10 09:30:00')
) AS q(sub_id, site_name, quote, attributed_to, source, created_at)
WHERE t.slug = 'meridian'
ON CONFLICT DO NOTHING;

-- ─── Agent Usage Logs (30 days of activity) ──────────────────────────────────

INSERT INTO alf_usage_logs (id, tenant_id, action, agent_key, tokens_input, tokens_output, model, initiated_by_type, created_at)
SELECT
    gen_random_uuid(),
    t.id,
    l.action,
    l.agent_key,
    l.tokens_in,
    l.tokens_out,
    'claude-sonnet-4-20250514',
    'tenant',
    (CURRENT_DATE - (l.days_ago || ' days')::interval + (l.hour || ' hours')::interval)::timestamptz
FROM alf_tenants t,
(VALUES
    -- HR Agent calls
    ('agent_call', 'hr', 1200, 1800, 1, 9),
    ('agent_call', 'hr', 1400, 2100, 2, 14),
    ('agent_call', 'hr', 1100, 1600, 4, 10),
    ('agent_call', 'hr', 1300, 1900, 6, 11),
    ('agent_call', 'hr', 1500, 2200, 8, 15),
    ('agent_call', 'hr', 1200, 1700, 11, 9),
    ('agent_call', 'hr', 1400, 2000, 14, 13),
    ('agent_call', 'hr', 1100, 1500, 18, 10),
    ('agent_call', 'hr', 1300, 1800, 22, 14),
    ('agent_call', 'hr', 1200, 1600, 26, 11),
    -- Finance Agent calls
    ('agent_call', 'finance', 1800, 2400, 1, 10),
    ('agent_call', 'finance', 2000, 2800, 3, 14),
    ('agent_call', 'finance', 1600, 2200, 7, 11),
    ('agent_call', 'finance', 1900, 2600, 10, 15),
    ('agent_call', 'finance', 1700, 2300, 15, 10),
    ('agent_call', 'finance', 2100, 2900, 19, 13),
    ('agent_call', 'finance', 1800, 2500, 24, 11),
    -- Ops Agent calls
    ('agent_call', 'ops', 2200, 3200, 0, 9),
    ('agent_call', 'ops', 2400, 3500, 1, 14),
    ('agent_call', 'ops', 2100, 3000, 2, 10),
    ('agent_call', 'ops', 2300, 3300, 3, 15),
    ('agent_call', 'ops', 2000, 2900, 5, 11),
    ('agent_call', 'ops', 2200, 3100, 6, 9),
    ('agent_call', 'ops', 2400, 3400, 8, 14),
    ('agent_call', 'ops', 2100, 3000, 10, 10),
    ('agent_call', 'ops', 2300, 3200, 12, 15),
    ('agent_call', 'ops', 2000, 2800, 15, 11),
    ('agent_call', 'ops', 2200, 3100, 18, 9),
    ('agent_call', 'ops', 2400, 3500, 21, 14),
    ('agent_call', 'ops', 2100, 3000, 25, 10),
    ('agent_call', 'ops', 2300, 3300, 28, 15),
    -- Sales Agent calls
    ('agent_call', 'sales', 1600, 2200, 2, 10),
    ('agent_call', 'sales', 1800, 2500, 5, 14),
    ('agent_call', 'sales', 1500, 2100, 9, 11),
    ('agent_call', 'sales', 1700, 2400, 13, 15),
    ('agent_call', 'sales', 1600, 2200, 17, 10),
    ('agent_call', 'sales', 1800, 2600, 21, 13),
    ('agent_call', 'sales', 1500, 2100, 25, 11),
    ('agent_call', 'sales', 1700, 2300, 29, 14),
    -- Purchasing Agent calls
    ('agent_call', 'purchasing', 1000, 1400, 3, 10),
    ('agent_call', 'purchasing', 1200, 1600, 8, 14),
    ('agent_call', 'purchasing', 1100, 1500, 14, 11),
    ('agent_call', 'purchasing', 1000, 1400, 20, 15),
    ('agent_call', 'purchasing', 1200, 1700, 27, 10),
    -- Admin Agent calls
    ('agent_call', 'admin', 2500, 3800, 1, 11),
    ('agent_call', 'admin', 2800, 4200, 4, 14),
    ('agent_call', 'admin', 2600, 3900, 9, 10),
    ('agent_call', 'admin', 2700, 4100, 15, 15),
    ('agent_call', 'admin', 2500, 3700, 22, 11),
    -- QBU generations
    ('qbu_generate', 'qbu', 3500, 5200, 5, 10),
    ('qbu_generate', 'qbu', 3800, 5600, 16, 14),
    -- SOP analyses
    ('sop_analysis', NULL, 3200, 2800, 7, 10),
    ('sop_analysis', NULL, 2900, 2500, 7, 11),
    ('sop_analysis', NULL, 3100, 2700, 8, 9),
    -- Roadmap generation
    ('roadmap_generation', NULL, 4500, 3800, 10, 14),
    -- Dashboard action plan
    ('dashboard_action_plan', 'actionPlan', 4200, 6800, 12, 10),
    ('dashboard_action_plan', 'actionPlan', 3900, 6200, 20, 14)
) AS l(action, agent_key, tokens_in, tokens_out, days_ago, hour)
WHERE t.slug = 'meridian';
