-- Update QBU Builder Skill knowledge module with v2 changes:
-- - Quarterly safety inspections (Q1-Q4 per location)
-- - Work tickets by quarter (Q1-Q4 + YTD)
-- - Speaker notes in PPTX notes pane
-- - Cover slide: quarter only, no date
-- - Audit title: "Operational Audits and Corrective Actions"
-- - Pie chart color contrast
-- - Roadmap chronological order + quarter labels
-- - "Other" category explanation
-- - "Recordable" definition
-- - Photos max 2 per slide with talking point captions

UPDATE tenant_documents
SET extracted_text = $body$# QBU Builder — SKILL.md

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

**File:** `qbu-intake-template-v2.xlsx`

16-slide template with A&A's official section numbering system:

| Slide | Section | Title | Purpose |
|-------|---------|-------|---------|
| 1 | — | Title: Account Name | Dark bg, client name in A&A Blue, "Quarterly Business Update | Q# |", logo bottom-left, aaefs.com bottom-right. Shows quarter label ONLY — no presentation date. |
| 2 | — | Introductions | Two-column: A&A Team / Client Team (names + titles) |
| 3 | **A.1** | Safety Moment – "Theme of the Quarter" | Key Safety Tips (4), Quick Reminders (4), optional "Why It Matters" callout box |
| 4 | **A.2** | Safety & Compliance Review | Safety inspections table (Q1-Q4 per location), Recordables table (Q1-Q4 per location), Good Saves (separate section), Recordable incident details |
| 5 | **B.1** | Executive Summary | Key Achievements (3–5), Strategic Challenges (2–3), Innovation Milestones (2–5) |
| 6 | **C.1** | Operational Performance – Managing Demand | Work tickets by quarter (Q1-Q4 + YTD per location), YoY comparison table, Current Trends, Events, Key Takeaway |
| 7 | **C.2** | Operational Audits and Corrective Actions | Audit/action counts (QoQ comparison), Discrepancy explanations |
| 8 | **C.3** | Top Action Areas (Visual) | Pie charts of corrective action areas with high-contrast colors. When "Other" appears, explain what falls under it. |
| 9 | **D.1** | Completed Projects Showcase | Projects by category (grounds, irrigation, renovation), Janitorial event highlights |
| 10 | **D.2** | Completed Projects: Photos | Max 2 photos per slide, each with a talking-point caption (not just labels). Place after relevant content slide. |
| 11 | **D.3** | Service & Client Satisfaction | 1–3 client testimonials per location (emails, notes, messages). Attributed by name. |
| 12 | **E.1** | Addressing Key Operational Challenges | Two-column: Challenges (1–5) → Actions Taken (1–5). Every challenge has a corresponding action. |
| 13 | **F.1** | Current Financial Overview | Outstanding balance, aging breakdown (1–30, 31–60, 61–90, 91+), Financial Strategy |
| 14 | **G.1** | Innovation & Technology Integration | Smart Cleaning Systems, AI & Automation, Fleet Equipment & Grounds Technology — with photos |
| 15 | **G.2** | Roadmap – Strategic Initiatives | Next quarter look-ahead. Items in CHRONOLOGICAL order with quarter prefixes (e.g., "Q1 — March"). |
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
- **A.2 Safety & Compliance Review:**
  - **Safety inspections** now use Q1-Q4 columns per location (same format as recordables). Good Saves are a SEPARATE section — they represent hazard catches, not scheduled inspections.
  - **Recordables** — Use the exact table format: rows = locations, columns = Q1/Q2/Q3/Q4/Annual Totals. A "recordable" is a workers' compensation claim — an on-the-job injury that required medical treatment beyond first aid. Speaker notes should include this definition.
  - Every recordable incident must include: location, date, cause, medical treatment status, and return-to-work date.
  - **Good Saves** must include: location, hazard prevented, corrective action, who was notified.
  - Every data table must show BOTH the current quarter column AND year-to-date totals. The "Annual" column IS the YTD.

### B — Executive Summary

- Lead with **Key Achievements** (3–5 concrete accomplishments with specifics)
- **Strategic Challenges** (2–3) must be honest — spin undermines trust
- **Innovation Milestones** (2–5) — tech deployments, process improvements, equipment additions. ONLY include when explicitly provided.
- This slide sets the narrative for the entire QBU. Get it right.

### C — Operational Performance

- **C.1** — Work ticket data MUST show quarterly breakdown (Q1-Q4 + YTD per location) AND YoY comparison with % change calculated. Include a **Key Takeaway** narrative that explains the numbers.
- **C.2** — Title is "Operational Audits and Corrective Actions". Audit and action counts MUST compare to prior quarter. If numbers don't align, explain the discrepancy.
- **C.3** — Pie charts with high-contrast colors (alternating warm/cool). When "Other" appears as a corrective action category, provide 2-3 specific examples (e.g., exterior grounds, loading docks, elevators, mechanical rooms, storage areas).
- **Every KPI must have a short interpretation sentence and a next action** — raw numbers without context are useless.

### D — Projects & Satisfaction

- **D.1** — Organize projects by category. Be specific: name buildings, describe what was done.
- **D.2** — Maximum 2 photos per slide. Each photo MUST have a caption that serves as a talking point — not just a label like "Before" but a sentence describing what's visible and why it matters. Place photo slides AFTER the relevant content slide.
- **D.3** — Use actual client quotes from emails, texts, or meeting notes. **Attribute by name.** Organize by location.

### E — Challenges

- Must be **recurring issues**, not one-time incidents
- Every challenge MUST map to an action taken or planned
- Tag each item with the **location** where it occurred
- If an action was committed to last quarter, report on whether it was delivered

### F — Financial

- **Don't avoid uncomfortable AR conversations.** The financial slide is expected.
- Show total outstanding balance with as-of date
- Break down by aging bucket: 1–30, 31–60, 61–90, 91+ days
- Include financial strategy notes

### G — Innovation & Roadmap

- **G.1** should highlight new technology, equipment, or process improvements with photos
- Connect each innovation to an operational benefit
- **G.2** — Roadmap items MUST be in chronological order by date. Use quarter prefix in the month field: "Q1 — March", "Q2 — April", etc. When all items are in the same quarter, still label each with the month for clarity.
- G.2 should be the concrete look-ahead for next quarter — this becomes the outline for the next QBU

---

## Quarter + Year-to-Date Rule

Every data slide that shows metrics (A.2 Safety, C.1 Work Tickets, C.2 Audits) MUST show both the current quarter value AND year-to-date total. For safety and work ticket tables with Q1-Q4 columns, the Annual/YTD column IS the year-to-date.

---

## Speaker Notes

Speaker notes are required for EVERY slide. They appear in the PPTX notes pane (not just in the output text). Each slide gets 2-3 sentences of talking points, emphasis areas, and delivery guidance. Use specific details from supporting documents to give the presenter insider knowledge.

---

## Cover Slide Rule

The cover slide shows ONLY the quarter label (e.g., "Q4 2025"). Do NOT include a presentation date — it creates confusion when the presentation date falls in a different quarter than the data being presented.

---

## Facility Services Domain Knowledge

### Safety Data Hierarchy

Safety data falls into three conceptually different tiers:

1. **Safety Inspections** — Scheduled compliance checks. Proactive. A high inspection count is GOOD — it means the team is actively monitoring.
2. **Good Saves** — Reactive hazard catches. Someone spotted a danger before it caused harm. These are wins — evidence of a safety-aware culture. NOT scheduled activities.
3. **Recordable Incidents** — Workers' compensation claims requiring medical treatment beyond first aid. Zero recordables = strong safety performance.

Never conflate these tiers. Inspections and recordables are scheduled/measured. Good saves are reactive catches.

### Multi-Campus Accounts

Many accounts span multiple campuses (e.g., Post Campus and Brooklyn Campus). Always break down data per campus in safety tables, work tickets, and audit metrics. Note differences between campuses in the analysis — one campus may drive most deficiencies.

### Audit Explanation → Narrative Flow

The Audit Change Explanation and Action Change Explanation fields explain WHY numbers changed. That "why" should flow through multiple slides: C.2 analysis → C.3 takeaway → B.1 executive summary → E.1 challenges. A single audit explanation often tells a story that spans 4 slides.

### Seasonal & Environmental Context

Facility services are deeply seasonal:
- **Winter:** Salt/ice vendor issues, sand/salt residue tracked into buildings, increased common area and restroom deficiencies
- **Spring:** Grounds ramp-up, fertilization, irrigation activation, landscape restoration after winter
- **Summer:** Heat illness prevention, increased event volume, grounds maintenance peak
- **Fall:** Winterization prep, event season (homecoming, career fairs), plow/equipment readiness

Don't just report "deficiencies increased 15%" — explain that winter conditions and a salt vendor switch drove the increase.

### Presentation Quality Standard

A&A reviews QBU decks internally as a team before presenting to clients. Output should be review-ready: every number traceable to intake data, every narrative grounded in specific context, a coherent story arc across all 16 slides.

---

## Input Requirements

| Input | Required? | Notes |
|-------|-----------|-------|
| Client name | **Yes** | For title slide and throughout |
| Quarter label | **Yes** | e.g., "Q4 2025" — quarter only, no date |
| A&A team attendees | **Yes** | Names and titles for introductions |
| Client team attendees | **Yes** | Names and titles for introductions |
| Safety data (quarterly) | **Yes** | Inspections and recordables by location/quarter (Q1-Q4), Good Saves, incident details |
| Work ticket data (quarterly) | **Yes** | Q1-Q4 + YTD by location, plus prior year comparison |
| Audit/action data | **Yes** | Current quarter and prior quarter counts by location |
| Completed projects list | **Yes** | By category with locations |
| Challenges & actions | **Yes** | Recurring issues with corresponding actions |
| Financial data | **Yes** | Outstanding balance, aging breakdown, as-of date |
| Client testimonials | Recommended | Direct quotes, attributed |
| On-site photos | Recommended | Max 2 per slide with talking-point captions |
| Innovation highlights | Recommended | New tech, equipment, process changes |
| Roadmap items | Recommended | Next quarter priorities in chronological order |

If required inputs are missing, **ask for them before generating.** A QBU without real data is worse than no QBU.

---

## Quality Checklist

- [ ] Client name on title slide, spelled correctly
- [ ] Quarter label correct (no presentation date on cover)
- [ ] Section numbering follows A.1/A.2/B.1/C.1/C.2/C.3/D.1/D.2/D.3/E.1/F.1/G.1/G.2 convention
- [ ] ALL metrics are real — nothing fabricated (see `claim-governance.md`)
- [ ] Every KPI has an interpretation sentence and next action
- [ ] Every challenge maps to an action taken
- [ ] Challenges are recurring issues, not one-time incidents
- [ ] Financial overview included with actual aging data
- [ ] Client testimonials attributed by name
- [ ] YoY comparisons calculated correctly with % change
- [ ] Safety and work ticket tables show Q1-Q4 + Annual/YTD
- [ ] Brand standards followed (see `brand-standards.md`)
- [ ] No banned phrases (see `brand-standards.md`)
- [ ] Speaker notes on every slide (in PPTX notes pane)
- [ ] Photo slides have max 2 photos with talking-point captions
- [ ] Roadmap items in chronological order with quarter prefixes
- [ ] "Other" corrective action category explained with examples
- [ ] C.2 title is "Operational Audits and Corrective Actions"

---

## Follow-Up Package (Post-QBU)

After the QBU is delivered, the agent should be able to generate:

1. **Action Plan Summary** — All action items from E.1 with owners, deadlines, and status. Formatted for email distribution within 3 business days.
2. **Tracker Row Update** — Structured data for updating the QBU master tracker in Microsoft Lists.
3. **Next Quarter Outline** — Based on G.2 roadmap slide, generate the data request list for the next QBU cycle.

---

## Technical Notes

- 16:9 layout (10" × 5.625")
- Hex colors without `#` prefix
- Logo files: `logo-color.png` (light bg) and `logo-white.png` (dark bg)
- Pie chart colors use alternating warm/cool palette for maximum contrast
- Speaker notes use `slide.addNotes(text)` in PptxGenJS
- Visual QA: convert to images and inspect after generation

---

## Revision History

| Date | Version | Change |
|------|---------|--------|
| 2026-02-17 | 1.0 | Split from unified deck-builder skill. QBU-focused content extracted. |
| 2026-03-09 | 2.0 | V2 template: quarterly inspections (Q1-Q4), quarterly work tickets, speaker notes in PPTX notes pane, cover date removed, audit title updated, pie chart colors improved, roadmap chronological order, "Other" category explanation, recordable definition, photo captions as talking points. |$body$,
    char_count = 12800
WHERE id = 'b0000001-0000-0000-0000-000000000001';
