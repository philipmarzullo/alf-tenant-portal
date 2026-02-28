-- ============================================================================
-- A&A KNOWLEDGE BASE SEED — 5 core documents for agent knowledge modules
-- ============================================================================
-- Seeds the QBU Builder Skill, Sales Deck Builder Skill, Brand Standards,
-- Claim Governance, and Company Profile documents into tenant_documents
-- for the A&A tenant. These titles match the knowledgeModules references
-- in agent configs.
-- ============================================================================

DO $$
DECLARE
    v_tenant_id UUID;
    v_user_id UUID;
BEGIN
    -- Look up A&A tenant
    SELECT id INTO v_tenant_id FROM alf_tenants WHERE slug = 'aaefs';

    IF v_tenant_id IS NULL THEN
        RAISE NOTICE 'aa_knowledge_base_seed: No tenant with slug=aaefs found. Skipping.';
        RETURN;
    END IF;

    -- Look up a user for created_by
    SELECT id INTO v_user_id FROM profiles WHERE tenant_id = v_tenant_id LIMIT 1;

    -- ─── 1. QBU Builder Skill ──────────────────────────────────────────────────
    INSERT INTO tenant_documents (
        id, tenant_id, department, doc_type, file_name, file_type, file_size,
        storage_path, title, extracted_text, char_count, status, created_at
    ) VALUES (
        'b0000001-0000-0000-0000-000000000001',
        v_tenant_id,
        'general',
        'reference',
        'qbu-builder-SKILL.md',
        'md',
        11500,
        'tenants/' || v_tenant_id || '/aaefs/documents/b0000001-0000-0000-0000-000000000001/qbu-builder-SKILL.md',
        'QBU Builder Skill',
        $body$# QBU Builder — SKILL.md

## Purpose

Build branded Quarterly Business Update (QBU) presentations for A&A Elevated Facility Solutions' existing accounts. QBUs demonstrate operational value, build trust through transparency, and identify expansion opportunities.

> **TERMINOLOGY:** A&A uses **"QBU" (Quarterly Business Update)**, not "QBR." Always use QBU in all outputs.

## Dependencies

Read these shared files BEFORE generating any output:

- `company-profile.md` — Company facts, leadership, programs
- `brand-standards.md` — Colors, typography, logo rules, layout, tone
- `claim-governance.md` — Rules for making claims (CRITICAL — all QBU metrics must be real)

---

## Template

**File:** `qbu-template-2025.pptx`

16-slide template with A&A's official section numbering system:

| Slide | Section | Title | Purpose |
|-------|---------|-------|---------|
| 1 | — | Title: Account Name | Dark bg, client name in A&A Blue, "Quarterly Business Update |Q#| Date:", logo bottom-left, aaefs.com bottom-right |
| 2 | — | Introductions | Two-column: A&A Team / Client Team (names + titles) |
| 3 | **A.1** | Safety Moment – "Theme of the Month" | Key Safety Tips, Quick Reminders, optional "Why It Matters" callout box |
| 4 | **A.2** | Safety & Compliance Review | Recordables table (by location, by quarter, annual totals), Good Saves, Recordable incident details |
| 5 | **B.1** | Executive Summary | Key Achievements (3–5), Strategic Challenges (2–3), Innovation Milestones (2–5) |
| 6 | **C.1** | Operational Performance – Managing Demand | Work tickets table (YoY comparison by location), Current Trends, Events, Key Takeaway |
| 7 | **C.2** | Audits and Corrective Actions | Audit/action counts (QoQ comparison), Discrepancy explanations |
| 8 | **C.3** | Top Action Areas (Visual) | Bar graph + pie chart of corrective action areas. Data from Tableau/E-Hub. |
| 9 | **D.1** | Completed Projects Showcase | Projects by category (grounds, irrigation, renovation), Janitorial event highlights |
| 10 | **D.2** | Completed Projects: Event Pictures | Photo showcase with captions in rounded-corner frames |
| 11 | **D.3** | Service & Client Satisfaction | 1–3 client testimonials per location (emails, notes, messages). Attributed by name. |
| 12 | **E.1** | Addressing Key Operational Challenges | Two-column: Challenges (1–5) → Actions Taken (1–5). Every challenge has a corresponding action. |
| 13 | **F.1** | Current Financial Overview | Outstanding balance, aging breakdown (1–30, 31–60, 61–90, 91+), Financial Strategy |
| 14 | **G.1** | Innovation & Technology Integration | Smart Cleaning Systems, AI & Automation, Fleet Equipment & Grounds Technology — with photos |
| 15 | **G.2** | Roadmap – Strategic Initiatives | Next quarter look-ahead. Concrete operational items. Used as outline for next QBU. |
| 16 | — | Thank You | Dark bg. "We look forward to further collaboration and delivering greater operational efficiencies." |

### Section Numbering Convention

| Letter | Domain |
|--------|--------|
| **A** | Safety |
| **B** | Executive Summary |
| **C** | Operational Performance |
| **D** | Completed Projects & Client Satisfaction |
| **E** | Challenges & Actions |
| **F** | Financial |
| **G** | Innovation & Roadmap |

### Adding Slides

- Duplicate **D.2** for additional photo showcases (label D.2a, D.2b, etc.)
- Add **C.4**, **C.5** for additional operational performance breakdowns
- Add **G.3** for additional roadmap or initiative slides
- Maintain the section letter convention when adding

---

## QBU Process Rules (from A&A SOP)

The agent should be aware of these process rules to generate appropriate content and follow-up materials:

| Rule | Requirement |
|------|-------------|
| Internal kickoff | **4 weeks** before delivery |
| Client notification | **2–3 weeks** before delivery |
| Questionnaire completion | Within **10 business days** of kickoff |
| Structured interviews | **30 minutes** each with Operations and Design teams |
| Company-wide capacity | No more than **3 QBUs per week** |
| Follow-up delivery | Action plan shared within **3 business days** of QBU |
| Action item tracking | All items tagged with **owner and deadline** |
| Storage | Decks saved in defined client SharePoint folder with naming convention |

---

## Content Rules by Section

### A — Safety

- **A.1 Safety Moment** rotates each quarter. Topics include: workplace violence prevention, slip/fall prevention, PPE usage, heat illness, winter preparedness, ergonomics, chemical safety.
- **A.2 Recordables** — Use the exact table format: rows = locations, columns = Q1/Q2/Q3/Q4/Annual Totals. Every recordable incident must include: location, date, cause, medical treatment status, and return-to-work date.
- **Good Saves** must include: location, hazard prevented, corrective action, who was notified.

### B — Executive Summary

- Lead with **Key Achievements** (3–5 concrete accomplishments with specifics)
- **Strategic Challenges** (2–3) must be honest — spin undermines trust
- **Innovation Milestones** (2–5) — tech deployments, process improvements, equipment additions
- This slide sets the narrative for the entire QBU. Get it right.

### C — Operational Performance

- **C.1** — Work ticket data MUST show YoY comparison with % change calculated. Include a **Key Takeaway** narrative that explains the numbers (e.g., "11.7% decrease reflects addition of 3rd shift and improved technology adoption").
- **C.2** — Audit and action counts MUST compare to prior quarter. If numbers don't align (audits ≠ actions), explain the discrepancy.
- **C.3** — Visual charts (bar + pie) required. Source data from Tableau and E-Hub. Include a Key Takeaway.
- **Every KPI must have a short interpretation sentence and a next action** — raw numbers without context are useless.

### D — Projects & Satisfaction

- **D.1** — Organize projects by category. Be specific: name buildings, describe what was done.
- **D.2** — Real on-site photos. Rounded-corner white frames with captions. Multiple slides OK.
- **D.3** — Use actual client quotes from emails, texts, or meeting notes. **Attribute by name.** These are powerful retention signals. Organize by location.

### E — Challenges

- Must be **recurring issues**, not one-time incidents (not "a single leaky sink")
- Every challenge MUST map to an action taken or planned
- Tag each item with the **location** where it occurred
- If an action was committed to last quarter, report on whether it was delivered
- Provide supporting evidence showing how the challenge affected operations

### F — Financial

- **Don't avoid uncomfortable AR conversations.** The financial slide is expected.
- Show total outstanding balance with as-of date
- Break down by aging bucket: 1–30, 31–60, 61–90, 91+ days
- Include financial strategy notes (weekly coordination meetings, KPI framework, BI reporting, etc.)

### G — Innovation & Roadmap

- **G.1** should highlight new technology, equipment, or process improvements with photos
- Connect each innovation to an operational benefit (efficiency, cost reduction, sustainability, staffing impact)
- **G.2** should be the concrete look-ahead for next quarter — this becomes the outline for the next QBU
- Include visuals where applicable

---

## Input Requirements

| Input | Required? | Notes |
|-------|-----------|-------|
| Client name | **Yes** | For title slide and throughout |
| Quarter and date | **Yes** | Q1/Q2/Q3/Q4 + month/year |
| A&A team attendees | **Yes** | Names and titles for introductions |
| Client team attendees | **Yes** | Names and titles for introductions |
| Safety data | **Yes** | Recordables by location/quarter, Good Saves, incident details |
| Work ticket data | **Yes** | Current quarter and prior year comparison by location |
| Audit/action data | **Yes** | Current quarter and prior quarter counts by location |
| Completed projects list | **Yes** | By category with locations |
| Challenges & actions | **Yes** | Recurring issues with corresponding actions |
| Financial data | **Yes** | Outstanding balance, aging breakdown, as-of date |
| Client testimonials | Recommended | Direct quotes, attributed |
| On-site photos | Recommended | Project completions, events, grounds work |
| Innovation highlights | Recommended | New tech, equipment, process changes |
| Roadmap items | Recommended | Next quarter priorities |

If required inputs are missing, **ask for them before generating.** A QBU without real data is worse than no QBU.

---

## Quality Checklist

- [ ] Client name on title slide, spelled correctly
- [ ] Quarter and date correct
- [ ] Section numbering follows A.1/A.2/B.1/C.1/C.2/C.3/D.1/D.2/D.3/E.1/F.1/G.1/G.2 convention
- [ ] ALL metrics are real — nothing fabricated (see `claim-governance.md`)
- [ ] Every KPI has an interpretation sentence and next action
- [ ] Every challenge maps to an action taken
- [ ] Challenges are recurring issues, not one-time incidents
- [ ] Financial overview included with actual aging data
- [ ] Client testimonials attributed by name
- [ ] YoY comparisons calculated correctly with % change
- [ ] Brand standards followed (see `brand-standards.md`)
- [ ] No banned phrases (see `brand-standards.md`)
- [ ] Speaker notes on every slide
- [ ] Photo showcases use rounded-corner frames with captions
- [ ] Roadmap is concrete and operational (not vague goals)

---

## Follow-Up Package (Post-QBU)

After the QBU is delivered, the agent should be able to generate:

1. **Action Plan Summary** — All action items from E.1 with owners, deadlines, and status. Formatted for email distribution within 3 business days.
2. **Tracker Row Update** — Structured data for updating the QBU master tracker in Microsoft Lists (client name, VP, local manager, frequency, dates, questionnaire status, follow-up status).
3. **Next Quarter Outline** — Based on G.2 roadmap slide, generate the data request list for the next QBU cycle.

---

## Technical Notes

- **Preferred:** Edit `qbu-template-2025.pptx` (preserves brand elements, dark backgrounds, chart placeholders)
- **Fallback:** pptxgenjs from scratch when template doesn't fit
- 16:9 layout (10" × 5.625")
- Hex colors without `#` prefix
- Logo files: `logo-color.png` (light bg) and `logo-white.png` (dark bg)
- Chart data in C.3 should be replaced with actual data — template has placeholder charts
- Visual QA: convert to images and inspect after generation

---

## Revision History

| Date | Version | Change |
|------|---------|--------|
| 2026-02-17 | 1.0 | Split from unified deck-builder skill. QBU-focused content extracted, SOP rules integrated, official section numbering documented, follow-up package spec added. |$body$,
        11500,
        'extracted',
        '2026-01-01T00:00:00Z'
    ) ON CONFLICT (id) DO NOTHING;

    -- ─── 2. Sales Deck Builder Skill ───────────────────────────────────────────
    INSERT INTO tenant_documents (
        id, tenant_id, department, doc_type, file_name, file_type, file_size,
        storage_path, title, extracted_text, char_count, status, created_at
    ) VALUES (
        'b0000001-0000-0000-0000-000000000002',
        v_tenant_id,
        'general',
        'reference',
        'sales-deck-builder-SKILL.md',
        'md',
        10200,
        'tenants/' || v_tenant_id || '/aaefs/documents/b0000001-0000-0000-0000-000000000002/sales-deck-builder-SKILL.md',
        'Sales Deck Builder Skill',
        $body$# Sales Deck Builder — SKILL.md

## Purpose

Build branded PowerPoint proposal decks, RFP response presentations, and first-call sales decks for A&A Elevated Facility Solutions.

## Dependencies

Read these shared files BEFORE generating any output:

- `company-profile.md` — Company facts, leadership, programs, differentiators
- `brand-standards.md` — Colors, typography, logo rules, layout, tone
- `claim-governance.md` — Rules for making claims (CRITICAL)

---

## Deck Sub-Types

| Sub-type | Goal | Slides | When to use |
|----------|------|--------|-------------|
| **First-call intro** | Win the next meeting | 10–14 | Early-stage prospect, limited intel |
| **Opportunity-specific proposal** | Win shortlist, align on approach | 15–24 | Active opportunity with scope details |
| **Formal RFP response** | Score points on a rubric | Mirrors RFP | RFP with specific questions and format requirements |

---

## Full Proposal Structure (15–24 slides)

Reverse-engineered from A&A's actual proposal decks for University at Albany, St. John's University, and Cooper Union.

| # | Slide | Content Guidance |
|---|-------|-----------------|
| 1 | **Title Slide** | Dark background. Prospect name in A&A Blue, service scope subtitle in white (e.g., "Custodial, Maintenance, and Grounds Services"), A&A logo bottom-left, aaefs.com bottom-right |
| 2 | **Agenda** | Numbered list of sections. Sets professional expectations. |
| 3 | **The Challenge** | Frame the prospect's pain: budget pressure, labor dynamics, regulatory expansion, fragmented vendors. Make them feel understood. Be specific to their vertical and facility type. |
| 4 | **Introductions / A&A Team** | Key A&A leadership + subject matter experts assigned to this opportunity. Pull from company-profile.md and customize based on scope (include Rocco for grounds, Sabi for PM, etc.) |
| 5 | **AAEFS Capabilities** | Company snapshot card: founded 1973, 2,000 employees, 150M+ sqft daily, ESOP, MWBE/MBE, CIMS-GB, union partnerships, geography map, major client logos |
| 6 | **Company Overview / Differentiators** | People First, ESOP model, union partnerships (25+ years), SYNC, AA360, Glide Path, 20+ years higher ed experience |
| 7 | **Supporting Pillars / Regional Infrastructure** | Three-tier visual: Corporate HQ, Regional Infrastructure, Local Self-Contained Operation. Include specialized subsidiaries. |
| 8 | **5-Year Safety Record** | TRIR/EMR trending chart, training programs list, OSHA compliance. Use actual safety data if available. |
| 9 | **Integrated Facilities Operating System** | Unified governance diagram: Janitorial + Grounds + MEP (if in scope). Single-point accountability. How silos are eliminated. |
| 10 | **Comprehensive Service Scope** | Tailored to prospect. For higher ed: academic buildings, residence halls, athletic facilities, event readiness. Card layout with icons. |
| 11 | **Risk Management** | Four areas: preventive maintenance, asset uptime, compliance/safety, labor continuity |
| 12 | **Data-Driven Operations & QA** | Four areas: QA tracking, labor optimization, performance visibility, continuous improvement. Reference AA360. |
| 13 | **Management Hiring & Onboarding** | Evaluation of incumbent talent, management mobilization, union coordination, People First leadership hiring |
| 14 | **Training & Onboarding** | Foundational onboarding (all roles), specialized tracks (janitorial, MEP, grounds), continuous learning, certification tracking |
| 15 | **Greatest Challenge / Our Approach** | Acknowledge this prospect's specific complexity. Then present structured, data-informed solution. Show discovery phase, Campus Rhythm Scheduling Engine, PM audits, stakeholder engagement. |
| 16 | **Transition Plan Timeline** | 4-phase visual: Strategy Development, Transition, Transformation, Optimization. Reference Microsoft Project. |
| 17–19 | **Transition Strategy Detail** (1 slide per phase) | Strategy Development (Alignment, Associates, Framework), Transition (Confirm Readiness, Onboarding, Launch), Transformation (Stakeholders, Structure, Benchmarks), Optimization (Identity, Culture, Excellence) |
| 20 | **From Baseline to Best-in-Class** | Continuous improvement cycle: establish baseline (30–60 day discovery), define best-in-class, implement change (pilot during academic lulls), measure success, Glide Path model |
| 21 | **Early Wins & Tactical Enhancements** | Concrete quick wins by service line. Show immediate value. MEP: PM refinement, color-coded piping. Janitorial: task resequencing, restroom sensors. Grounds: SOP updates, autonomous equipment. |
| 22 | **What Sets A&A Apart** | Four pillars: (1) People First — competitive advantage, (2) Complex Environment Experience, (3) Technology That Supports Not Replaces, (4) Aligned Incentives Through Glide Path |
| 23 | **Partnership Model / Financial Impact** | Glide Path shared-savings mechanics. Efficiency identification, verification, aligned incentives, client control. How it translates to value. |
| 24 | **Closing** | Dark background. "Your Strategic Partner in Optimizing Facility Performance" — A&A logo, aaefs.com |

### Short Intro Deck (10–14 slides)

Compress to: Title, Challenge, Credentials/Capabilities, Approach/Service Scope, QA & Technology, Transition Overview, What Sets Us Apart, Next Steps

### RFP Response

Mirror the RFP's structure and question order. Include a compliance matrix. Map every answer to a rubric criterion.

---

## Template

**File:** `general-template.pptx`

5-slide layout template:

| Slide | Type | Use |
|-------|------|-----|
| 1 | Title | White bg, A&A logo top-left, brand elements (chevrons, diamonds, blue circle with photo) right side |
| 2 | Content (standard) | White bg, red accent line top-left, A&A logo bottom-right |
| 3 | Content (alternate) | Same as slide 2 — duplicate for additional content |
| 4 | Section Divider | Light grey bg, brand elements (chevrons, diamonds) — use between major sections |
| 5 | Closing | Dark bg with full-bleed photo, brand elements, A&A logo, "Learn more at aaefs.com" |

**Workflow:** Duplicate slides 2/3 for content, insert slide 4 between major sections, always start with slide 1 and end with slide 5.

---

## Content Assembly Rules

### Personalization Requirements

Every proposal MUST be customized to the prospect:
- Prospect name on title slide and throughout
- Specific facility types, campus details, and operational challenges
- Org chart tailored to this engagement (who from A&A is assigned)
- Service scope matched to what they actually need
- Transition plan references their specific environment
- "Greatest Challenge" slide names their complexity, not a generic one

### Early Wins Slide

This is one of the highest-impact slides. It must include **concrete, specific quick wins** organized by service line — not vague improvement promises. Reference real tactics from A&A's playbook:
- Resequencing janitorial tasks to align with academic schedules
- Pilot restroom sensors in high-traffic areas
- PM schedule refinement using TMA data
- Color-coded piping in mechanical rooms
- Autonomous grounds equipment deployment
- SOP updates for overlooked areas

### What Sets A&A Apart

This closing argument slide always includes these four pillars, and ALWAYS leads with People First:
1. **People First. Always.** — "At our core, People First isn't a slogan — it's the operating system of our company."
2. **Complex Environment Experience** — Name specific institutions served, reference higher ed for 20+ years
3. **Technology That Supports, Not Replaces** — AA360, robotics, AI auditing, sensor tools. "We don't lead with technology for the sake of it."
4. **Aligned Incentives Through Glide Path** — Shared savings, long-term efficiency, fiscal responsibility

---

## Input Requirements

| Input | Required? | Notes |
|-------|-----------|-------|
| Prospect name | **Yes** | Exact legal or common name |
| Facility type & details | **Yes** | Property types, locations, sq footage, building count |
| Service lines in scope | **Yes** | Which combination of Janitorial, Grounds, MEP |
| Vertical | **Yes** | Higher ed, commercial, healthcare, etc. |
| Known pain points | Recommended | Budget pressure, vendor issues, labor challenges, compliance gaps |
| Decision timeline | Recommended | Shapes urgency framing |
| Union environment? | Recommended | Affects staffing and onboarding sections |
| Key messages / themes | Recommended | 2–3 things this deck must communicate |

If required inputs are missing, **ask for them before generating.**

---

## Quality Checklist

- [ ] Prospect name on title slide, spelled correctly
- [ ] All `[PLACEHOLDER]` items flagged — nothing silently fabricated
- [ ] Claim governance followed (see `claim-governance.md`)
- [ ] No banned phrases (transformational, best-in-class, synergy, cutting-edge)
- [ ] Brand standards followed (see `brand-standards.md`)
- [ ] Red accent underline below titles on content slides
- [ ] Dark background on title and closing slides
- [ ] No slide exceeds 6 lines of body text
- [ ] Layouts varied across consecutive slides
- [ ] Speaker notes on every slide
- [ ] People First, SYNC, Glide Path, AA360 referenced where relevant
- [ ] Transition plan included
- [ ] "What Sets A&A Apart" included
- [ ] Glide Path explained
- [ ] Service scope tailored to prospect (not generic)

---

## Technical Notes

- **Preferred:** Edit `general-template.pptx` (preserves brand elements, backgrounds, shapes)
- **Fallback:** pptxgenjs from scratch when template doesn't fit
- 16:9 layout (10" x 5.625")
- Hex colors without `#` prefix
- Logo files: `logo-color.png` (light bg) and `logo-white.png` (dark bg)
- Visual QA: convert to images and inspect after generation

---

## Revision History

| Date | Version | Change |
|------|---------|--------|
| 2026-02-17 | 1.0 | Split from unified deck-builder skill. Sales-focused content extracted and refined. |$body$,
        10200,
        'extracted',
        '2026-01-01T00:00:00Z'
    ) ON CONFLICT (id) DO NOTHING;

    -- ─── 3. Brand Standards ────────────────────────────────────────────────────
    INSERT INTO tenant_documents (
        id, tenant_id, department, doc_type, file_name, file_type, file_size,
        storage_path, title, extracted_text, char_count, status, created_at
    ) VALUES (
        'b0000001-0000-0000-0000-000000000003',
        v_tenant_id,
        'general',
        'reference',
        'brand-standards.md',
        'md',
        6500,
        'tenants/' || v_tenant_id || '/aaefs/documents/b0000001-0000-0000-0000-000000000003/brand-standards.md',
        'Brand Standards',
        $body$# A&A Elevated Facility Solutions — Brand Standards

> This file defines all visual and verbal brand rules. All skills reference this file for brand compliance.

## Voice & Tone

A&A's brand personality is **friendly and open**. "Consistency breeds trust, and trust is key in any relationship."

### Core Tone Rules

- **People First** — Always. Show the human side: teams, training, relationships, dignity
- **Friendly, confident, and approachable** — not stiff or corporate-heavy
- **Operationally specific** — concrete language about processes, systems, and metrics
- **Client-centric** — frame everything in terms of outcomes for the client
- **Financially credible** — speak in operational logic, verified savings, measurable impact
- **Structured** — headline-led slides, clear hierarchies, no paragraph overload

### Operator Tone Rules (Strictly Enforced)

**NEVER use:**
- "transformational"
- "best-in-class" (except when describing their baseline-to-best-in-class methodology)
- "synergy" or "synergistic"
- "cutting-edge" or "state-of-the-art"
- "holistic" or "paradigm"
- Generic consultant clichés

**ALWAYS:**
- Sound like someone who has installed and operated these systems
- Use active voice: "We inspect every floor daily" not "Inspections are conducted"
- Reference specific tools by name: AA360, TMA, Lighthouse, Corrigo, Microsoft Project
- Use A&A's own program names: People First™, SYNC, Glide Path
- Be concrete: name the building, cite the metric, specify the timeframe

---

## Color Palette

A&A's colors are "crisp and bright to bring that extra layer of cleanliness and safety."

| Role | Color Name | Hex | RGB | Usage |
|------|-----------|-----|-----|-------|
| **Primary** | A&A Blue | `009ADE` | 0, 154, 222 | Logo, title backgrounds, headers, primary shapes. **Do not alter.** |
| **Accent** | A&A Red | `E12F2C` | 225, 47, 44 | Accent elements, red underline below titles. Use sparingly. |
| **Dark Text** | Dark Grey | `272727` | 39, 39, 39 | Primary body text, headings on light backgrounds |
| **Secondary Text** | Medium Grey | `5A5D62` | 90, 93, 98 | Captions, secondary text, supporting content |
| **Light Background** | Off-White | `F5F5F5` | 245, 245, 245 | Content slide backgrounds |
| **Light Text** | White | `FFFFFF` | 255, 255, 255 | Text on dark/blue backgrounds |
| **Dark Background** | Near-Black | `1B2133` | 27, 33, 51 | Title and closing slide backgrounds (dark navy) |

### Color Usage Rules

- A&A Blue dominates (60–70% visual weight)
- A&A Red is accent only — primarily as a short underline below slide titles
- Title slide and closing slide: dark background with background photo, A&A Blue text for client name, white text for subtitle
- Content slides: white or off-white background, Dark Grey text
- Never use colors outside this palette in A&A materials

---

## Typography

Brand font: **Aktiv Grotesk** (Thin, Light, XBold). Digital fallback: **Roboto**.

| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| Slide Title | Roboto Light | 36–40pt | Light (300) | A&A Blue `009ADE` |
| Red Accent Line | — | — | — | `E12F2C`, short line below title, left-aligned |
| Subheader | Roboto | 20–24pt | Bold, ALL CAPS | Dark Grey `272727` |
| Body Header | Roboto | 16–18pt | Bold | Dark Grey `272727` |
| Body Text | Roboto | 14–16pt | Regular | Medium Grey `5A5D62` |
| Data Callout | Roboto Light | 48–60pt | Light | A&A Blue `009ADE` |
| Caption | Roboto | 10–12pt | Regular | Medium Grey `5A5D62` |
| Speaker Notes | Roboto | 12pt | Regular | — |

**Heading hierarchy:** Lighter weight for main titles (friendly, open feel), bold for subheaders (contrast and structure).

---

## Slide Text Rules

- **Slide titles:** Action-oriented or outcome-focused headline, not generic labels
- **Body text:** Maximum 5–6 lines per content area
- **Bullet points:** Use sparingly. Prefer icon grids, numbered steps, two-column layouts, or card layouts
- **Data callouts:** Large numbers (48–60pt) with small descriptive labels below (12–14pt)
- Short sentences on slides. Detail goes in speaker notes.

---

## Logo

The A&A logo is a stylized lowercase "a&a" in A&A Blue, with "Elevated Facility Solutions" tagline.

### Logo Files

| File | Use |
|------|-----|
| `logo-color.png` | A&A Blue on transparent — for content slides (light backgrounds) |
| `logo-white.png` | White on transparent — for title/closing slides (dark backgrounds) |
| `aa_full-color.ai` | Vector source file |

### Logo Placement

- **Title slide:** Logo bottom-left, `aaefs.com` bottom-right
- **Closing slide:** Same placement as title slide
- **Content slides:** Small logo with tagline, bottom-right corner

### Logo Rules

- **Never** rotate, stretch, recolor, or add effects
- Minimum clear space: width of the "a" character around all sides
- Minimum size: 0.75" (mark only) or 1.15" (with tagline)

---

## Branding Elements

A&A uses geometric decorative accents throughout materials:

- **Chevron/arrow shapes** — outlined (red) and filled (blue, grey) decorative accents
- **Diamond shapes** — small red/blue diamond accents, often paired with chevrons
- **Circles** — large A&A Blue circles as framing devices (often containing photos)
- **Red accent line** — short red line below slide titles on content slides (**signature A&A design element**)
- **Heart shape** — small red heart accent (appears on title/closing slides)

These elements appear prominently on title and closing slides; used sparingly on content slides.

---

## Imagery

- Use **natural-looking photos with people** — not overly posed stock photography
- Show **clean workplaces** across various industries served
- Images should feature **blue and red hues** where possible
- A&A uses photos inside brand shape frames (chevrons, circles) on certain slides
- For QBUs: include real on-site photos in **rounded-corner white frames** with subtle shadows and captions below

---

## Layout Principles

- **16:9 aspect ratio** (standard)
- **0.5" minimum margins**
- **Dark/light sandwich:** Title slide (dark bg + photo) → content slides (light bg) → closing slide (dark bg + photo matching title)
- **Red underline** below titles on content slides — this is the signature A&A visual pattern
- Vary layouts across slides — never repeat the same layout consecutively
- Every slide needs at least one visual element (shape, icon, photo, chart, or data callout)

---

## Speaker Notes (All Decks)

Every slide MUST include speaker notes that:
- Expand on key points with talking points for the presenter
- Include specific data or details that don't fit on the slide
- Suggest transition language to the next slide
- Are written in conversational, operator tone$body$,
        6500,
        'extracted',
        '2026-01-01T00:00:00Z'
    ) ON CONFLICT (id) DO NOTHING;

    -- ─── 4. Claim Governance ───────────────────────────────────────────────────
    INSERT INTO tenant_documents (
        id, tenant_id, department, doc_type, file_name, file_type, file_size,
        storage_path, title, extracted_text, char_count, status, created_at
    ) VALUES (
        'b0000001-0000-0000-0000-000000000004',
        v_tenant_id,
        'general',
        'reference',
        'claim-governance.md',
        'md',
        4100,
        'tenants/' || v_tenant_id || '/aaefs/documents/b0000001-0000-0000-0000-000000000004/claim-governance.md',
        'Claim Governance',
        $body$# A&A Elevated Facility Solutions — Claim Governance

> This file defines rules for making claims in any A&A output. All skills MUST follow these rules to prevent unsubstantiated or fabricated claims.

## Claim Types

Every statement about A&A falls into one of three categories:

### 1. General Industry Statement
Statements about market conditions, industry trends, or common challenges.

**Rule:** OK to use freely. No evidence required.

**Examples:**
- "Labor turnover is a persistent challenge in facilities services"
- "Budget constraints require innovative approaches to facility management"
- "Fragmented vendor relationships create accountability gaps"

### 2. A&A Capability Claim
Statements about what A&A can do, offers, or is equipped for.

**Rule:** Must use approved language from skill files, `company-profile.md`, or uploaded source materials.

**Examples:**
- "AA360 provides real-time QA tracking, multilingual training, and performance analytics"
- "A&A's ESOP model drives accountability and retention"
- "A&A has served higher education institutions for over 20 years"

### 3. A&A Performance Claim
Statements about specific results A&A has delivered.

**Rule:** Must cite a specific source metric, client, and timeframe. If the data doesn't exist in the source materials, DO NOT make the claim.

**Examples:**
- "11.7% decrease in work orders at LIU Post year-over-year"
- "87% positive reaction time with Corrigo deployment at LIU"
- "154 audits completed across both LIU campuses in Q3 2025"

---

## Hard Rules

1. **NEVER fabricate metrics, headcount, wages, or pricing.** Not even as examples or estimates.

2. **NEVER silently invent performance claims.** If you don't have the data, don't make the claim.

3. **If evidence is missing, convert to a safe version:**
   - "A&A can support" instead of "A&A delivered"
   - "Typical outcomes include" instead of "We reduced"
   - "Our model is designed to" instead of "We achieved"

4. **All placeholders must be explicitly flagged:** `[PLACEHOLDER: need data]`

5. **Every performance claim in a QBU must be traceable** to a specific data source (work order system, inspection records, safety logs, financial records).

6. **In proposals:** Capability claims are fine. Performance claims require evidence from a similar account or must be flagged as projected outcomes with assumptions stated.

7. **In QBUs:** All metrics must be real. No estimates, no rounding for convenience, no claims about trends that aren't supported by the data tables in the deck.

---

## Pricing & Staffing — Special Rules

The agent must NEVER fabricate headcount, wages, or pricing in any context.

**For proposals, the agent generates:**
- Staffing approach narrative (methodology, not numbers)
- Coverage model narrative (logic, not headcount)
- Assumptions list
- A pricing inputs checklist for the human owner to complete

**Once actual numbers are provided by a human**, the agent can create:
- Pricing summary page
- Scope-to-price alignment bullets
- Alternates and options structure

---

## Self-Check Before Output

Before including any claim about A&A:

- [ ] Is this a general industry statement, capability claim, or performance claim?
- [ ] If capability claim: Is the language sourced from approved materials?
- [ ] If performance claim: Can I cite the specific metric, client, and timeframe?
- [ ] If I can't cite it: Have I converted to a safe version or flagged as `[PLACEHOLDER]`?
- [ ] Have I avoided fabricating any numbers?$body$,
        4100,
        'extracted',
        '2026-01-01T00:00:00Z'
    ) ON CONFLICT (id) DO NOTHING;

    -- ─── 5. Company Profile ────────────────────────────────────────────────────
    INSERT INTO tenant_documents (
        id, tenant_id, department, doc_type, file_name, file_type, file_size,
        storage_path, title, extracted_text, char_count, status, created_at
    ) VALUES (
        'b0000001-0000-0000-0000-000000000005',
        v_tenant_id,
        'general',
        'reference',
        'company-profile.md',
        'md',
        8600,
        'tenants/' || v_tenant_id || '/aaefs/documents/b0000001-0000-0000-0000-000000000005/company-profile.md',
        'Company Profile',
        $body$# A&A Elevated Facility Solutions — Company Profile

> This file is the single source of truth for A&A company facts. All skills reference this file rather than duplicating company information.

## Company Overview

| Field | Value |
|-------|-------|
| **Legal name** | A&A Elevated Facility Solutions (AAEFS) |
| **Website** | aaefs.com |
| **Founded** | 1973 |
| **HQ** | 965 Midland Ave, Yonkers, NY 10704 |
| **Employees** | 2,000+ |
| **Daily coverage** | 150M+ square feet |
| **Ownership** | Employee-Owned (ESOP) |
| **MWBE Status** | Yes / MBE — Nationally Certified |
| **Sustainability** | CIMS-GB Certified |

## Service Lines

- **Janitorial** — Daily cleaning, special event support, health protocols, deep cleaning programs
- **Grounds Maintenance** — Landscaping, snow removal, outdoor event preparation, irrigation, athletic field management, autonomous mowing
- **MEP (Mechanical, Electrical, Plumbing)** — Preventive maintenance, emergency response, building systems management

## Geographic Coverage

| Region | Markets |
|--------|---------|
| Northeast | Philadelphia to Maine |
| Mid-Atlantic | Virginia, Maryland, Washington DC |
| Southeast | Atlanta to Miami |
| Midwest | Chicago, Milwaukee, Detroit |
| West Coast | Los Angeles, San Francisco, San Diego, Seattle, Oregon |
| South | Northern Texas, Dallas |

## Leadership Team

| Name | Title |
|------|-------|
| Armando Rodriguez | President & CEO |
| Michael DeChristopher | COO |
| Eric Wheeler | VP of Operations |
| Philip Marzullo | Director of Innovation |
| Dana Micklos | Risk & Safety Director |
| Will Loeffel | Assistant Controller |
| Jaimie Restrepo | Startup/Transition Director |
| Sabi Radesich | Senior PM |
| Rocco Popoli | Senior Grounds |
| Mike Anthony | Remediation/Construction |

## Key Programs & Platforms

### People First™
A&A's core operating philosophy. Not a slogan — the operating system of the company. When people are treated with dignity, they treat others with respect and warmth. This creates energy, pride, and performance. It is A&A's competitive advantage.

### SYNC
Task-based service model applied across all service lines for clarity, consistency, accountability, and enhanced day-to-day execution.

### Glide Path Partnership
Shared-savings model that returns a percentage of verified efficiency gains to clients while incentivizing A&A to drive continuous cost reductions and long-term operational improvements. Governance oversight remains under full client authority.

### AA360
Technology platform for QA tracking, multilingual training, performance analytics, robotics integration, AI auditing, and space utilization. Integrates with TMA and other client systems.

### Lighthouse
Quality and performance platform deployed at certain accounts for real-time task completion tracking.

### Corrigo
Work order management system used at certain accounts.

### TMA
Asset management/CMMS integration for MEP operations. Used for PM scheduling, compliance tracking, and asset uptime reporting.

### Microsoft Project
Transition planning and milestone tracking tool. Provides real-time visibility into progress across departments.

## Specialized Subsidiaries

- **Armor Environmental** — Disaster recovery (flood, fire, mold)
- **Wallico Maintenance** — Metal and stone specialists
- **Post-Construction Cleaning Team** — 50+ staff available locally

## Union Partnerships

Deep union relationships spanning **25+ years**, including:
- 32BJ
- 1102
- Local 30
- Local 74
- Additional local chapters

Built on mutual respect, trust, and shared commitment to worker success.

## Higher Education Focus (Primary Vertical)

A&A has served K-12 and public/private higher education institutions for **20+ years**.

**Current/reference clients:**
- Long Island University (LIU) — Post and Brooklyn campuses
- Fordham University
- Caldwell University
- Lewis & Clark College
- Loyola Law School

A&A also serves commercial real estate, healthcare, corporate, and government facilities.

## Key Differentiators

1. **People First™** — Employee dignity drives service quality
2. **ESOP Model** — Employee ownership aligns workforce incentives with client success
3. **Union Expertise** — 25+ years managing union workforces and bargaining
4. **Technology That Supports, Not Replaces** — AA360, robotics, AI auditing deployed where they improve outcomes
5. **Glide Path Partnership** — Shared savings ensure aligned incentives
6. **Complex Environment Experience** — Higher education, research labs, clinical spaces, residential life
7. **Manager-Heavy Model** — Daily oversight, strong client communication, real-time accountability
8. **Integrated Service Delivery** — Single-point accountability across janitorial, grounds, and MEP eliminates silos

## Training Programs

### Foundational Onboarding (All Roles)
- People First™ Orientation
- Health & Safety Protocols (OSHA, HAZMAT, Driving)
- AA360 Access and Use
- Training Manuals in all required languages

### Specialized Tracks
- **Janitorial:** APPA-level training (daily, project, terminal), SOPs with Visual Task Cards, Green Cleaning Certification
- **MEP:** Lockout/Tagout, Confined Space, Arc Flash, Building Systems Integration (BMS), Preventive Maintenance Routines
- **Grounds:** Seasonal Task Readiness, Equipment Safety (mowers, stripers), Turf Robot Orientation

### Continuous Learning
- Annual Refresher Training
- Monthly Safety Awards
- QA Walkthrough Alignment
- Certification Tracking via AA360

## Safety Training Topics

Reporting an Accident, Ladder Safety, Cord Safety, Proper Disposal of Trash/Waste, PPE, Slip and Fall Prevention, Spill Clean-Up, Material Handling, Handling Sharps, SDS, Hazard Communication Program, Bloodborne Pathogen/Body Fluid Spills, Customer Service Training, Site Specific Orientation, Environmental Policy, Quality Plan & Disaster Plan, Sexual Harassment Training, Supervisor/Manager Training, Driver's Training

## Quality Assurance Framework

A&A's QA operates on a four-phase cycle:

1. **QA: Planning** — Site evaluation, customized cleaning plan, standardized procedures, resource allocation (staffing + equipment + supplies)
2. **QA: Deployment** — Training and certification, implementation of standardized procedures, communication and coordination with facility management
3. **QA: Data Visualization/Analysis** — Routine inspections, quality audits, KPIs (cleanliness ratings, incident reports, satisfaction scores), visual reports, feedback mechanisms
4. **QA: Action Plans** — Trend analysis, root cause analysis, targeted interventions, resource allocation, continuous monitoring
5. **QA: Driving Results** — Performance reviews, KPI analysis, ongoing training, process refinement, transparent reporting, stakeholder engagement

## Transition Methodology

A&A uses a **4-phase transition approach**:

1. **Strategy Development** — Alignment with client leadership, associate engagement (site visits, meet teams), custom change management framework synced with client calendar
2. **Transition** — Confirm readiness (staff, equipment, supplies), onboarding & training (service standards + institutional culture), launch implementation team with 30-day quick wins
3. **Transformation** — Engage campus stakeholders (workshops, focus groups), strengthen facilities structure (staffing, labor rebalancing, workflow reorganization), define operational benchmarks (digital QA, KPIs, feedback loops)
4. **Optimization** — Redefine facilities identity (from back-of-house to mission-aligned partner), empower workforce culture (training, recognition, feedback), establish operational excellence (real-time dashboards, QR-code feedback, continuous improvement)

**Baseline-to-Best-in-Class cycle:** 30–60 day discovery → data-driven insights via AA360/TMA → define best-in-class → pilot during academic lulls → measure success (QA scores, labor efficiency, PM compliance) → Glide Path shared savings$body$,
        8600,
        'extracted',
        '2026-01-01T00:00:00Z'
    ) ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'aa_knowledge_base_seed: Inserted 5 A&A knowledge base documents for tenant %', v_tenant_id;

END $$;
