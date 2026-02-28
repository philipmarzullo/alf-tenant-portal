-- ============================================================================
-- DASHBOARDS & SNOWFLAKE-SHIM TABLES
-- ============================================================================
-- Adds sf_ prefixed tables that mimic future Snowflake data warehouse feeds.
-- Creates a test tenant "Meridian Facility Services" with synthetic data.
-- Extends automation_actions for dashboard action plan use.
-- ============================================================================

-- ─── 1A. Ensure Studio-added columns exist in migration schema ───────────────

ALTER TABLE alf_tenants ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE alf_tenants ADD COLUMN IF NOT EXISTS module_config JSONB DEFAULT '{}'::jsonb;

-- ─── 1B. Test Tenant ─────────────────────────────────────────────────────────

INSERT INTO alf_tenants (company_name, slug, plan, status, enabled_modules, max_users)
VALUES (
  'Meridian Facility Services',
  'meridian',
  'galaxy',
  'test',
  ARRAY['hr','finance','purchasing','sales','ops','qbu','salesDeck','automation','dashboards'],
  100
)
ON CONFLICT (slug) DO NOTHING;

-- ─── 1C. Dimension & Fact Tables ─────────────────────────────────────────────

-- Shared date dimension (no tenant_id — reference table)
CREATE TABLE IF NOT EXISTS sf_dim_date (
    date_key DATE PRIMARY KEY,
    year INT NOT NULL,
    quarter INT NOT NULL,
    quarter_label TEXT NOT NULL,
    month INT NOT NULL,
    month_label TEXT NOT NULL,
    day_of_week INT NOT NULL,
    is_weekend BOOLEAN NOT NULL DEFAULT false
);

-- Job / site dimension
CREATE TABLE IF NOT EXISTS sf_dim_job (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES alf_tenants(id) ON DELETE CASCADE,
    job_name TEXT NOT NULL,
    location TEXT NOT NULL,
    supervisor TEXT,
    company TEXT,
    tier TEXT CHECK (tier IN ('standard','premium','enterprise')),
    sq_footage INT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_sf_dim_job_tenant ON sf_dim_job(tenant_id);

-- Employee dimension
CREATE TABLE IF NOT EXISTS sf_dim_employee (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES alf_tenants(id) ON DELETE CASCADE,
    employee_number TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL,
    hire_date DATE,
    job_id UUID REFERENCES sf_dim_job(id) ON DELETE SET NULL,
    hourly_rate NUMERIC(8,2),
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_sf_dim_employee_tenant ON sf_dim_employee(tenant_id);

-- Work tickets fact
CREATE TABLE IF NOT EXISTS sf_fact_work_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES alf_tenants(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES sf_dim_job(id) ON DELETE CASCADE,
    date_key DATE NOT NULL REFERENCES sf_dim_date(date_key),
    category TEXT NOT NULL,
    status TEXT NOT NULL,
    priority TEXT CHECK (priority IN ('low','medium','high','critical')),
    assigned_to TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_sf_fact_work_tickets_tenant ON sf_fact_work_tickets(tenant_id);
CREATE INDEX idx_sf_fact_work_tickets_job_date ON sf_fact_work_tickets(job_id, date_key);

-- Labor budget vs actual fact
CREATE TABLE IF NOT EXISTS sf_fact_labor_budget_actual (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES alf_tenants(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES sf_dim_job(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    budget_hours NUMERIC(10,2),
    actual_hours NUMERIC(10,2),
    budget_dollars NUMERIC(12,2),
    actual_dollars NUMERIC(12,2),
    ot_hours NUMERIC(10,2) DEFAULT 0,
    ot_dollars NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_sf_fact_labor_tenant ON sf_fact_labor_budget_actual(tenant_id);

-- Timekeeping fact
CREATE TABLE IF NOT EXISTS sf_fact_timekeeping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES alf_tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES sf_dim_employee(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES sf_dim_job(id) ON DELETE CASCADE,
    date_key DATE NOT NULL REFERENCES sf_dim_date(date_key),
    clock_in TIME,
    clock_out TIME,
    regular_hours NUMERIC(6,2) DEFAULT 0,
    ot_hours NUMERIC(6,2) DEFAULT 0,
    dt_hours NUMERIC(6,2) DEFAULT 0,
    punch_status TEXT NOT NULL DEFAULT 'accepted'
        CHECK (punch_status IN ('accepted','incomplete','manual_edit','exception')),
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_sf_fact_timekeeping_tenant ON sf_fact_timekeeping(tenant_id);
CREATE INDEX idx_sf_fact_timekeeping_emp_date ON sf_fact_timekeeping(employee_id, date_key);

-- Job daily metrics fact (quality + safety)
CREATE TABLE IF NOT EXISTS sf_fact_job_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES alf_tenants(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES sf_dim_job(id) ON DELETE CASCADE,
    date_key DATE NOT NULL REFERENCES sf_dim_date(date_key),
    audits INT DEFAULT 0,
    corrective_actions INT DEFAULT 0,
    recordable_incidents INT DEFAULT 0,
    good_saves INT DEFAULT 0,
    near_misses INT DEFAULT 0,
    trir NUMERIC(6,3) DEFAULT 0,
    headcount INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_sf_fact_job_daily_tenant ON sf_fact_job_daily(tenant_id);
CREATE INDEX idx_sf_fact_job_daily_job_date ON sf_fact_job_daily(job_id, date_key);

-- ─── 1C. RLS ─────────────────────────────────────────────────────────────────

-- sf_dim_date — shared, read-only for all authenticated
ALTER TABLE sf_dim_date ENABLE ROW LEVEL SECURITY;
CREATE POLICY sf_dim_date_select ON sf_dim_date FOR SELECT USING (true);
CREATE POLICY sf_dim_date_service ON sf_dim_date FOR ALL
    USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Tenant-scoped tables
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'sf_dim_job', 'sf_dim_employee', 'sf_fact_work_tickets',
        'sf_fact_labor_budget_actual', 'sf_fact_timekeeping', 'sf_fact_job_daily'
    ]) LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format(
            'CREATE POLICY %I ON %I FOR SELECT USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))',
            t || '_select', t
        );
        EXECUTE format(
            'CREATE POLICY %I ON %I FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')',
            t || '_service', t
        );
    END LOOP;
END $$;

-- ─── 1D. Extend automation_actions ───────────────────────────────────────────

-- Add new status values for action plan items
ALTER TABLE automation_actions DROP CONSTRAINT IF EXISTS automation_actions_status_check;
ALTER TABLE automation_actions ADD CONSTRAINT automation_actions_status_check
    CHECK (status IN ('planned','skill_generating','ready_for_review','active','manual','dismissed',
                      'open','in_progress','completed'));

-- New columns for dashboard action plans
ALTER TABLE automation_actions ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'sop'
    CHECK (source IN ('sop','dashboard_action_plan'));
ALTER TABLE automation_actions ADD COLUMN IF NOT EXISTS priority TEXT
    CHECK (priority IN ('critical','high','medium','low'));
ALTER TABLE automation_actions ADD COLUMN IF NOT EXISTS site_name TEXT;
ALTER TABLE automation_actions ADD COLUMN IF NOT EXISTS metric_snapshot JSONB;

-- ─── 1E. Seed Date Dimension ─────────────────────────────────────────────────

INSERT INTO sf_dim_date (date_key, year, quarter, quarter_label, month, month_label, day_of_week, is_weekend)
SELECT
    d::date,
    EXTRACT(YEAR FROM d)::int,
    EXTRACT(QUARTER FROM d)::int,
    'Q' || EXTRACT(QUARTER FROM d)::int,
    EXTRACT(MONTH FROM d)::int,
    TO_CHAR(d, 'Mon'),
    EXTRACT(ISODOW FROM d)::int,
    EXTRACT(ISODOW FROM d)::int IN (6, 7)
FROM generate_series('2025-01-01'::date, '2025-12-31'::date, '1 day') AS d
ON CONFLICT (date_key) DO NOTHING;

-- ─── 1E. Seed Meridian Jobs ──────────────────────────────────────────────────

DO $$
DECLARE
    v_tenant_id UUID;
    v_job_manhattan UUID;
    v_job_white_plains UUID;
    v_job_stamford UUID;
BEGIN
    SELECT id INTO v_tenant_id FROM alf_tenants WHERE slug = 'meridian';
    IF v_tenant_id IS NULL THEN RAISE EXCEPTION 'Meridian tenant not found'; END IF;

    -- 3 job sites
    INSERT INTO sf_dim_job (id, tenant_id, job_name, location, supervisor, company, tier, sq_footage)
    VALUES
        (gen_random_uuid(), v_tenant_id, 'Meridian Tower - Manhattan', 'New York, NY', 'Carlos Rivera', 'Meridian Facility Services', 'enterprise', 250000),
        (gen_random_uuid(), v_tenant_id, 'Meridian Commons - White Plains', 'White Plains, NY', 'Sarah Chen', 'Meridian Facility Services', 'premium', 120000),
        (gen_random_uuid(), v_tenant_id, 'Meridian Park Campus - Stamford', 'Stamford, CT', 'Michael Torres', 'Meridian Facility Services', 'standard', 80000);

    SELECT id INTO v_job_manhattan FROM sf_dim_job WHERE tenant_id = v_tenant_id AND job_name LIKE '%Manhattan%';
    SELECT id INTO v_job_white_plains FROM sf_dim_job WHERE tenant_id = v_tenant_id AND job_name LIKE '%White Plains%';
    SELECT id INTO v_job_stamford FROM sf_dim_job WHERE tenant_id = v_tenant_id AND job_name LIKE '%Stamford%';

    -- ─── Employees (~30 across 3 sites) ──────────────────────────────────────

    INSERT INTO sf_dim_employee (tenant_id, employee_number, first_name, last_name, role, hire_date, job_id, hourly_rate)
    SELECT
        v_tenant_id,
        'MFS-' || LPAD(i::text, 4, '0'),
        (ARRAY['James','Maria','David','Ana','Robert','Linda','Carlos','Patricia','Michael','Sandra',
               'Juan','Lisa','Jose','Karen','William'])[((i-1) % 15) + 1],
        (ARRAY['Garcia','Smith','Rodriguez','Johnson','Martinez','Williams','Lopez','Brown','Gonzalez','Davis',
               'Hernandez','Miller','Diaz','Wilson','Moore'])[((i-1) % 15) + 1],
        CASE WHEN i <= 3 THEN 'supervisor' WHEN i <= 6 THEN 'lead' ELSE 'technician' END,
        '2020-01-01'::date + (random() * 1800)::int,
        CASE WHEN i <= 12 THEN v_job_manhattan WHEN i <= 22 THEN v_job_white_plains ELSE v_job_stamford END,
        CASE WHEN i <= 3 THEN 28.50 WHEN i <= 6 THEN 24.00 ELSE 18.00 + (random() * 4)::numeric(4,2) END
    FROM generate_series(1, 30) AS i;

    -- ─── Work Tickets (~1200 across 2025) ────────────────────────────────────
    -- Manhattan: high volume, strong completion (82%), balanced categories
    -- White Plains: mid volume, declining completion in H2 (~60%), repair-heavy
    -- Stamford: low volume, very clean completion (90%)

    -- Manhattan tickets (~600)
    INSERT INTO sf_fact_work_tickets (tenant_id, job_id, date_key, category, status, priority, assigned_to, completed_at)
    SELECT v_tenant_id, v_job_manhattan,
        ('2025-01-01'::date + (random() * 364)::int),
        (ARRAY['Cleaning','Maintenance','Repair','Inspection','Safety','Supply'])[floor(random() * 6 + 1)::int],
        CASE WHEN random() < 0.82 THEN 'completed' WHEN random() < 0.92 THEN 'in_progress' WHEN random() < 0.97 THEN 'pending' ELSE 'cancelled' END,
        (ARRAY['low','medium','high','critical'])[floor(random() * 4 + 1)::int],
        'Tech-' || floor(random() * 12 + 1)::int,
        CASE WHEN random() < 0.82 THEN now() - (random() * 90)::int * interval '1 day' ELSE NULL END
    FROM generate_series(1, 600);

    -- White Plains tickets (~400) — repair-heavy, H2 backlog
    INSERT INTO sf_fact_work_tickets (tenant_id, job_id, date_key, category, status, priority, assigned_to, completed_at)
    SELECT v_tenant_id, v_job_white_plains,
        ('2025-01-01'::date + (random() * 364)::int) AS dt,
        -- Skew toward Repair and Maintenance
        (ARRAY['Repair','Maintenance','Repair','Cleaning','Maintenance','Supply'])[floor(random() * 6 + 1)::int],
        -- H2 (Jul-Dec): only 58% completion vs H1 78%
        CASE
            WHEN EXTRACT(MONTH FROM ('2025-01-01'::date + (random() * 364)::int)) >= 7 THEN
                CASE WHEN random() < 0.58 THEN 'completed' WHEN random() < 0.78 THEN 'in_progress' WHEN random() < 0.92 THEN 'pending' ELSE 'cancelled' END
            ELSE
                CASE WHEN random() < 0.78 THEN 'completed' WHEN random() < 0.90 THEN 'in_progress' WHEN random() < 0.96 THEN 'pending' ELSE 'cancelled' END
        END,
        -- Higher priority tickets
        (ARRAY['medium','high','medium','high','critical','low'])[floor(random() * 6 + 1)::int],
        'Tech-' || floor(random() * 8 + 1)::int,
        CASE WHEN random() < 0.60 THEN now() - (random() * 90)::int * interval '1 day' ELSE NULL END
    FROM generate_series(1, 400);

    -- Stamford tickets (~200) — low volume, very clean
    INSERT INTO sf_fact_work_tickets (tenant_id, job_id, date_key, category, status, priority, assigned_to, completed_at)
    SELECT v_tenant_id, v_job_stamford,
        ('2025-01-01'::date + (random() * 364)::int),
        (ARRAY['Cleaning','Inspection','Cleaning','Maintenance','Supply','Cleaning'])[floor(random() * 6 + 1)::int],
        CASE WHEN random() < 0.90 THEN 'completed' WHEN random() < 0.96 THEN 'in_progress' ELSE 'pending' END,
        (ARRAY['low','low','medium','low'])[floor(random() * 4 + 1)::int],
        'Tech-' || floor(random() * 5 + 1)::int,
        CASE WHEN random() < 0.90 THEN now() - (random() * 60)::int * interval '1 day' ELSE NULL END
    FROM generate_series(1, 200);

    -- ─── Labor Budget vs Actual (36 monthly records) ─────────────────────────
    -- Manhattan: tight budget control, ~2% variance, moderate OT
    -- White Plains: chronic overruns (8-12% over budget every month), high OT
    -- Stamford: slightly under budget, low OT — clean performer

    INSERT INTO sf_fact_labor_budget_actual (tenant_id, job_id, period_start, period_end, budget_hours, actual_hours, budget_dollars, actual_dollars, ot_hours, ot_dollars)
    SELECT
        v_tenant_id,
        j.id,
        make_date(2025, m, 1),
        (make_date(2025, m, 1) + interval '1 month - 1 day')::date,
        -- Budget hours (stable baseline)
        CASE WHEN j.tier = 'enterprise' THEN 2200 WHEN j.tier = 'premium' THEN 1100 ELSE 700 END
            + (random() * 60 - 30)::numeric(6,0),
        -- Actual hours: Manhattan tight, White Plains over, Stamford under
        CASE WHEN j.tier = 'enterprise' THEN 2200 WHEN j.tier = 'premium' THEN 1100 ELSE 700 END
            * CASE
                WHEN j.job_name LIKE '%Manhattan%' THEN (0.98 + random() * 0.06)::numeric(6,2)
                WHEN j.job_name LIKE '%White Plains%' THEN (1.08 + random() * 0.06)::numeric(6,2)
                ELSE (0.92 + random() * 0.06)::numeric(6,2)
              END,
        -- Budget dollars (stable)
        CASE WHEN j.tier = 'enterprise' THEN 48000 WHEN j.tier = 'premium' THEN 23000 ELSE 14000 END
            + (random() * 1000 - 500)::numeric(8,0),
        -- Actual dollars: White Plains 8-14% over, Manhattan ~2%, Stamford ~3% under
        CASE WHEN j.tier = 'enterprise' THEN 48000 WHEN j.tier = 'premium' THEN 23000 ELSE 14000 END
            * CASE
                WHEN j.job_name LIKE '%Manhattan%' THEN (0.99 + random() * 0.05)::numeric(8,2)
                WHEN j.job_name LIKE '%White Plains%' THEN (1.08 + random() * 0.06)::numeric(8,2)
                ELSE (0.94 + random() * 0.05)::numeric(8,2)
              END
            -- Q4 bump across all sites
            * CASE WHEN m >= 10 THEN 1.04 ELSE 1.0 END,
        -- OT hours: White Plains consistently high, others moderate
        (CASE
            WHEN j.job_name LIKE '%White Plains%' THEN 65 + (random() * 30)::numeric(6,2)
            WHEN j.job_name LIKE '%Manhattan%' THEN 40 + (random() * 25)::numeric(6,2)
            ELSE 12 + (random() * 10)::numeric(6,2)
         END
         * CASE WHEN m >= 10 THEN 1.3 ELSE 1.0 END)::numeric(8,2),
        -- OT dollars
        (CASE
            WHEN j.job_name LIKE '%White Plains%' THEN 1950 + (random() * 900)::numeric(8,2)
            WHEN j.job_name LIKE '%Manhattan%' THEN 1200 + (random() * 750)::numeric(8,2)
            ELSE 360 + (random() * 300)::numeric(8,2)
         END
         * CASE WHEN m >= 10 THEN 1.3 ELSE 1.0 END)::numeric(10,2)
    FROM sf_dim_job j
    CROSS JOIN generate_series(1, 12) AS m
    WHERE j.tenant_id = v_tenant_id;

    -- ─── Timekeeping (~5000 punch records) ───────────────────────────────────
    -- Manhattan: clean timekeeping, 96% accepted, low exceptions
    -- White Plains: decent timekeeping, 92% accepted
    -- Stamford: timekeeping mess — only 82% accepted, 8% incomplete, 6% manual edits, 4% exceptions

    INSERT INTO sf_fact_timekeeping (tenant_id, employee_id, job_id, date_key, clock_in, clock_out, regular_hours, ot_hours, dt_hours, punch_status)
    SELECT
        v_tenant_id,
        e.id,
        e.job_id,
        d.date_key,
        ('06:00'::time + (random() * 120)::int * interval '1 minute'),
        ('14:00'::time + (random() * 180)::int * interval '1 minute'),
        7.5 + (random() * 1.0)::numeric(4,2),
        CASE WHEN random() < 0.15 THEN (random() * 3)::numeric(4,2) ELSE 0 END,
        CASE WHEN random() < 0.03 THEN (random() * 2)::numeric(4,2) ELSE 0 END,
        -- Per-site punch status profiles
        CASE
            -- Stamford: problematic timekeeping
            WHEN e.job_id = v_job_stamford THEN
                CASE WHEN random() < 0.82 THEN 'accepted'
                     WHEN random() < 0.90 THEN 'incomplete'
                     WHEN random() < 0.96 THEN 'manual_edit'
                     ELSE 'exception' END
            -- Manhattan: clean
            WHEN e.job_id = v_job_manhattan THEN
                CASE WHEN random() < 0.96 THEN 'accepted'
                     WHEN random() < 0.98 THEN 'incomplete'
                     WHEN random() < 0.99 THEN 'manual_edit'
                     ELSE 'exception' END
            -- White Plains: decent
            ELSE
                CASE WHEN random() < 0.92 THEN 'accepted'
                     WHEN random() < 0.95 THEN 'incomplete'
                     WHEN random() < 0.98 THEN 'manual_edit'
                     ELSE 'exception' END
        END
    FROM sf_dim_employee e
    CROSS JOIN (
        SELECT date_key FROM sf_dim_date
        WHERE NOT is_weekend AND year = 2025
        ORDER BY random()
        LIMIT 170
    ) d
    WHERE e.tenant_id = v_tenant_id;

    -- ─── Job Daily Metrics (~1095 records) ───────────────────────────────────

    INSERT INTO sf_fact_job_daily (tenant_id, job_id, date_key, audits, corrective_actions, recordable_incidents, good_saves, near_misses, trir, headcount)
    SELECT
        v_tenant_id,
        j.id,
        d.date_key,
        -- Audits: Manhattan does the most (enterprise), others proportional
        CASE WHEN j.tier = 'enterprise' THEN floor(random() * 3 + 1) WHEN j.tier = 'premium' THEN floor(random() * 2 + 0.5) ELSE floor(random() * 2) END,
        -- Corrective actions: White Plains has quality issues (35% of audit days)
        -- Manhattan steady (15%), Stamford clean (8%)
        CASE
            WHEN j.job_name LIKE '%White Plains%' AND random() < 0.35 THEN floor(random() * 2 + 1)
            WHEN j.job_name LIKE '%Manhattan%' AND random() < 0.15 THEN floor(random() * 2 + 1)
            WHEN j.job_name LIKE '%Stamford%' AND random() < 0.08 THEN 1
            ELSE 0
        END,
        -- Recordable incidents: Manhattan Q3 safety spike, others rare
        CASE
            WHEN j.job_name LIKE '%Manhattan%' AND EXTRACT(QUARTER FROM d.date_key) = 3 AND random() < 0.05 THEN 1
            WHEN j.job_name LIKE '%White Plains%' AND random() < 0.012 THEN 1
            WHEN random() < 0.005 THEN 1
            ELSE 0
        END,
        -- Good saves: Manhattan leads (strong safety culture), Stamford decent
        CASE
            WHEN j.job_name LIKE '%Manhattan%' AND random() < 0.18 THEN floor(random() * 2 + 1)
            WHEN j.job_name LIKE '%Stamford%' AND random() < 0.14 THEN 1
            WHEN random() < 0.06 THEN 1
            ELSE 0
        END,
        -- Near misses
        CASE
            WHEN j.job_name LIKE '%Manhattan%' AND EXTRACT(QUARTER FROM d.date_key) = 3 AND random() < 0.10 THEN 1
            WHEN random() < 0.04 THEN 1
            ELSE 0
        END,
        -- TRIR: Stamford cleanest (0.6-0.9), Manhattan baseline except Q3 spike (1.5-2.2), White Plains slightly elevated (1.0-1.5)
        CASE
            WHEN j.job_name LIKE '%Stamford%' THEN (0.5 + random() * 0.4)::numeric(5,3)
            WHEN j.job_name LIKE '%Manhattan%' AND EXTRACT(QUARTER FROM d.date_key) = 3 THEN (1.5 + random() * 0.7)::numeric(5,3)
            WHEN j.job_name LIKE '%Manhattan%' THEN (0.8 + random() * 0.4)::numeric(5,3)
            WHEN j.job_name LIKE '%White Plains%' THEN (1.0 + random() * 0.5)::numeric(5,3)
            ELSE (0.8 + random() * 0.5)::numeric(5,3)
        END,
        -- Headcount
        CASE WHEN j.tier = 'enterprise' THEN 12 WHEN j.tier = 'premium' THEN 8 ELSE 5 END
    FROM sf_dim_job j
    CROSS JOIN sf_dim_date d
    WHERE j.tenant_id = v_tenant_id
      AND d.year = 2025
      AND NOT d.is_weekend;

    -- ─── 1F. Update module_config for Meridian + A&A ─────────────────────────

    UPDATE alf_tenants SET module_config = COALESCE(module_config, '{}'::jsonb) ||
        '{"dashboards":{"pages":["operations","labor","quality","timekeeping","safety","action-plans"],"actions":["generateActionPlan"]}}'::jsonb
    WHERE slug IN ('meridian', 'aaefs');

END $$;
