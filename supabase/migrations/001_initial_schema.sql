-- ══════════════════════════════════════════════════════════
-- BEDFLOW INITIAL SCHEMA v2
-- Run in Supabase SQL Editor (Dashboard → SQL Editor)
-- ══════════════════════════════════════════════════════════

-- 1. ORGANIZATIONS
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('private','uhia','university','government')) DEFAULT 'private',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. HOSPITALS
CREATE TABLE hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  governorate TEXT NOT NULL DEFAULT 'Cairo',
  address TEXT,
  lat DECIMAL(9,6),
  lng DECIMAL(9,6),
  total_beds INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. WARDS
CREATE TABLE wards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  specialty TEXT DEFAULT 'General',
  floor INTEGER DEFAULT 1,
  total_beds INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT TRUE
);

-- 4. BEDS
CREATE TABLE beds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id UUID REFERENCES wards(id) ON DELETE CASCADE,
  bed_number TEXT NOT NULL,
  current_status TEXT CHECK (
    current_status IN ('available','occupied','cleaning','maintenance','reserved')
  ) DEFAULT 'available',
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated_by UUID REFERENCES auth.users(id),
  UNIQUE(ward_id, bed_number)
);

-- 5. BED STATUS LOGS (the data moat — never delete from this table)
CREATE TABLE bed_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bed_id UUID REFERENCES beds(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PROFILES (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id),
  org_id UUID REFERENCES organizations(id),
  role TEXT CHECK (role IN ('nurse','ops_director','admin','bedflow_admin')) NOT NULL DEFAULT 'nurse',
  name_ar TEXT,
  name_en TEXT,
  phone TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════
-- TRIGGER: auto-create profile on signup
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name_en)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ══════════════════════════════════════════════════════════
-- TRIGGER: auto-log bed status changes
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION log_bed_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.current_status IS DISTINCT FROM NEW.current_status THEN
    INSERT INTO bed_status_logs (bed_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.current_status, NEW.current_status, auth.uid());
    NEW.last_updated_at = NOW();
    NEW.last_updated_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER bed_status_change_trigger
  BEFORE UPDATE ON beds
  FOR EACH ROW EXECUTE FUNCTION log_bed_status_change();

-- ══════════════════════════════════════════════════════════
-- VIEW: hospital bed summary (for city map + reports)
-- No Redis caching needed at MVP scale (0-10 hospitals)
-- Add Upstash Redis caching in Phase 2 (10+ hospitals)
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW hospital_bed_summary AS
SELECT
  h.id            AS hospital_id,
  h.name_ar,
  h.name_en,
  h.lat,
  h.lng,
  h.governorate,
  h.address,
  COUNT(b.id)                                                         AS total_beds,
  COUNT(b.id) FILTER (WHERE b.current_status = 'available')          AS available_beds,
  COUNT(b.id) FILTER (WHERE b.current_status = 'occupied')           AS occupied_beds,
  COUNT(b.id) FILTER (WHERE b.current_status = 'cleaning')           AS cleaning_beds,
  COUNT(b.id) FILTER (WHERE b.current_status = 'maintenance')        AS maintenance_beds,
  ROUND(
    COUNT(b.id) FILTER (WHERE b.current_status = 'occupied')::DECIMAL
    / NULLIF(COUNT(b.id), 0) * 100, 1
  ) AS occupancy_rate
FROM hospitals h
LEFT JOIN wards w ON w.hospital_id = h.id AND w.active = TRUE
LEFT JOIN beds b ON b.ward_id = w.id
WHERE h.active = TRUE
GROUP BY h.id, h.name_ar, h.name_en, h.lat, h.lng, h.governorate, h.address;

-- ══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE wards           ENABLE ROW LEVEL SECURITY;
ALTER TABLE beds            ENABLE ROW LEVEL SECURITY;
ALTER TABLE bed_status_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION my_hospital_id()
RETURNS UUID AS $$
  SELECT hospital_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT role = 'bedflow_admin' FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "profiles_own" ON profiles
  FOR ALL USING (id = auth.uid() OR is_admin());

CREATE POLICY "hospitals_own" ON hospitals
  FOR ALL USING (id = my_hospital_id() OR is_admin());

CREATE POLICY "wards_own" ON wards
  FOR ALL USING (hospital_id = my_hospital_id() OR is_admin());

CREATE POLICY "beds_own" ON beds
  FOR ALL USING (
    ward_id IN (SELECT id FROM wards WHERE hospital_id = my_hospital_id())
    OR is_admin()
  );

CREATE POLICY "logs_own" ON bed_status_logs
  FOR ALL USING (
    bed_id IN (
      SELECT b.id FROM beds b
      JOIN wards w ON b.ward_id = w.id
      WHERE w.hospital_id = my_hospital_id()
    )
    OR is_admin()
  );

-- Enable Supabase Realtime on beds table (replaces WebSocket server)
ALTER PUBLICATION supabase_realtime ADD TABLE beds;