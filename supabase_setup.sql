-- ==========================================================================
-- SUPABASE DATABASE SETUP FOR TUITION FEE PORTAL
-- ==========================================================================
-- Instructions:
-- 1. Go to your Supabase Dashboard (https://supabase.com)
-- 2. Open your project
-- 3. Click on "SQL Editor" in the left sidebar
-- 4. Click "New Query"
-- 5. Copy and paste all the SQL commands below into the editor
-- 6. Click "Run" at the bottom right
-- ==========================================================================

-- 1. Create the students table
CREATE TABLE IF NOT EXISTS students (
    roll_no TEXT PRIMARY KEY,
    dob TEXT NOT NULL,
    name TEXT NOT NULL,
    demand NUMERIC(12, 2) DEFAULT 0.00,
    exemption NUMERIC(12, 2) DEFAULT 0.00,
    paid NUMERIC(12, 2) DEFAULT 0.00,
    remaining NUMERIC(12, 2) DEFAULT 0.00
);

-- 2. Enable Row Level Security (RLS)
-- By default, this lets anyone read/write to the table without auth restrictions (standard for simple public portals)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- 3. Create policies to allow public read & write access
CREATE POLICY "Allow public read access" ON students
    FOR SELECT USING (true);

CREATE POLICY "Allow public update access" ON students
    FOR UPDATE USING (true);

-- 4. Insert default mock data (from your screenshot)
-- Note: ON CONFLICT DO NOTHING ensures running this multiple times won't throw duplicate key errors
INSERT INTO students (roll_no, dob, name, demand, exemption, paid, remaining)
VALUES 
('B240611EC', '10/12/2006', 'D KAMESH', 75000.00, 0.00, 0.00, 75000.00),
('B240212CS', '15/08/2005', 'AMAL JITH', 75000.00, 25000.00, 50000.00, 0.00),
('B240101ME', '01/01/2006', 'SARA JOHNSON', 75000.00, 75000.00, 0.00, 0.00)
ON CONFLICT (roll_no) DO NOTHING;
