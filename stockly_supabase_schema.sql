-- ==============================================================================
-- Stockly Intelligent Warehouse Management System (WMS)
-- Master Supabase / PostgreSQL Schema Migration
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. USERS & ROLES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('super_admin', 'warehouse_manager', 'inventory_clerk', 'technician', 'viewer')),
    department TEXT,
    job_title TEXT,
    phone_number TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. INVENTORY ITEMS & BARCODES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku TEXT UNIQUE NOT NULL,                       -- Barcode / QR / SKU Unique Identifier
    name TEXT NOT NULL,                            -- Item Name in Arabic
    name_en TEXT,                                  -- Item Name in English (Optional)
    category TEXT NOT NULL,                        -- Warehouse Department / Category
    unit TEXT NOT NULL DEFAULT 'قطعة',             -- Unit (قطعة, متر, لفة, كرتونة, لتر, إلخ)
    current_balance NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    min_limit NUMERIC(12, 3) DEFAULT 5.000,        -- Low Stock Alert Threshold
    max_limit NUMERIC(12, 3),
    unit_price NUMERIC(12, 2) DEFAULT 0.00,
    warehouse_zone TEXT,                           -- Specific Aisle / Shelf / Bin (e.g. Zone A-12)
    barcode_type TEXT DEFAULT 'CODE128',
    qr_payload TEXT,                               -- Dedicated QR Code Content
    is_critical BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_items_sku ON public.items (sku);
CREATE INDEX IF NOT EXISTS idx_items_category ON public.items (category);
CREATE INDEX IF NOT EXISTS idx_items_balance ON public.items (current_balance);

-- ------------------------------------------------------------------------------
-- 3. INVENTORY ADDITIONS (INBOUND RECEIPTS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.additions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_number TEXT UNIQUE NOT NULL,           -- e.g. ADD-2026-0001
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    supplier_name TEXT NOT NULL,
    supplier_invoice_number TEXT,
    category TEXT NOT NULL,
    receiver_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'CANCELLED')),
    items_count INTEGER DEFAULT 0,
    total_value NUMERIC(14, 2) DEFAULT 0.00,
    notes TEXT,
    items_payload JSONB NOT NULL DEFAULT '[]'::JSONB, -- Array of received item snapshots
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_additions_doc ON public.additions (document_number);
CREATE INDEX IF NOT EXISTS idx_additions_date ON public.additions (date);

-- ------------------------------------------------------------------------------
-- 4. INVENTORY DISBURSEMENTS (OUTBOUND ORDERS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.disbursements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_number TEXT UNIQUE NOT NULL,           -- e.g. DIS-2026-0001
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    recipient_name TEXT NOT NULL,                  -- Technician / Department head receiving
    recipient_department TEXT NOT NULL,
    work_order_ref TEXT,                           -- Work Order / Task Code
    purpose TEXT,                                  -- Purpose of disbursement
    status TEXT NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'RETURNED')),
    items_count INTEGER DEFAULT 0,
    total_value NUMERIC(14, 2) DEFAULT 0.00,
    notes TEXT,
    items_payload JSONB NOT NULL DEFAULT '[]'::JSONB, -- Array of disbursed item snapshots
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disbursements_doc ON public.disbursements (document_number);
CREATE INDEX IF NOT EXISTS idx_disbursements_date ON public.disbursements (date);

-- ------------------------------------------------------------------------------
-- 5. CUSTODY & HANDOVER RECORDS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.custody_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_number TEXT UNIQUE NOT NULL,
    model_type TEXT NOT NULL CHECK (model_type IN ('COMPANY_CUSTODY', 'TECH_CUSTODY', 'TOOLS_ASSETS', 'TECHNICAL_INSPECTION')),
    contractor_name TEXT,
    recipient_name TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RETURNED', 'SETTLED')),
    items_payload JSONB NOT NULL DEFAULT '[]'::JSONB,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. AUDIT & LOGISTICS EVENT LOGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email TEXT,
    action TEXT NOT NULL,                          -- e.g. 'ITEM_CREATED', 'BALANCE_DISBURSED', 'BARCODE_SCANNED'
    entity_type TEXT NOT NULL,                     -- 'item', 'addition', 'disbursement'
    entity_id TEXT,
    details JSONB,
    ip_address TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON public.audit_logs (timestamp);

-- ------------------------------------------------------------------------------
-- 7. AUTOMATIC UPDATED_AT TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_items_updated_at ON public.items;
CREATE TRIGGER trg_items_updated_at BEFORE UPDATE ON public.items
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

DROP TRIGGER IF EXISTS trg_additions_updated_at ON public.additions;
CREATE TRIGGER trg_additions_updated_at BEFORE UPDATE ON public.additions
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

DROP TRIGGER IF EXISTS trg_disbursements_updated_at ON public.disbursements;
CREATE TRIGGER trg_disbursements_updated_at BEFORE UPDATE ON public.disbursements
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

-- ==============================================================================
-- End of Stockly Master Schema Migration
-- ==============================================================================
