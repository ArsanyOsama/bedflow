-- ══════════════════════════════════════════════════════════
-- BEDFLOW SEED DATA — Demo hospitals for pitch day (CORRECTED UUIDs)
-- ══════════════════════════════════════════════════════════

INSERT INTO organizations (id, name, type) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Cairo Private Hospital Group', 'private');

-- Hospital A: Cairo Specialized (Heliopolis)
INSERT INTO hospitals (id, org_id, name_ar, name_en, lat, lng, total_beds, governorate, address) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111',
   'مستشفى القاهرة التخصصي',
   'Cairo Specialized Hospital',
   30.0626, 31.2497, 150, 'Cairo', 'Heliopolis, Cairo');

-- Hospital B: Maadi Medical
INSERT INTO hospitals (id, org_id, name_ar, name_en, lat, lng, total_beds, governorate, address) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '11111111-1111-1111-1111-111111111111',
   'مستشفى المعادي الطبي',
   'Maadi Medical Hospital',
   29.9602, 31.2569, 120, 'Cairo', 'Maadi, Cairo');

-- Wards for Hospital A (Replaced invalid 'w' with '1')
INSERT INTO wards (id, hospital_id, name_ar, name_en, specialty, floor, total_beds) VALUES
  ('1a1aaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','العناية المركزة','ICU','ICU',2,20),
  ('1a2aaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','الجراحة العامة','General Surgery','Surgery',3,40),
  ('1a3aaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','الداخلية','Internal Medicine','Internal',4,50);

-- Wards for Hospital B (Replaced invalid 'w' with '1')
INSERT INTO wards (id, hospital_id, name_ar, name_en, specialty, floor, total_beds) VALUES
  ('1b1bbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','العناية المركزة','ICU','ICU',1,15),
  ('1b2bbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','الأطفال','Pediatrics','Pediatric',2,35);

-- Beds for Hospital A — ICU (20 beds, realistic mix)
INSERT INTO beds (ward_id, bed_number, current_status)
SELECT '1a1aaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ICU-' || n,
  CASE WHEN n <= 14 THEN 'occupied' WHEN n <= 17 THEN 'available' WHEN n = 18 THEN 'cleaning' ELSE 'maintenance' END
FROM generate_series(1, 20) n;

-- Beds for Hospital A — Surgery (40 beds)
INSERT INTO beds (ward_id, bed_number, current_status)
SELECT '1a2aaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SUR-' || n,
  CASE WHEN n <= 28 THEN 'occupied' WHEN n <= 36 THEN 'available' ELSE 'cleaning' END
FROM generate_series(1, 40) n;

-- Beds for Hospital A — Internal (50 beds)
INSERT INTO beds (ward_id, bed_number, current_status)
SELECT '1a3aaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'INT-' || n,
  CASE WHEN n <= 38 THEN 'occupied' WHEN n <= 46 THEN 'available' ELSE 'cleaning' END
FROM generate_series(1, 50) n;

-- Beds for Hospital B — ICU (15 beds)
INSERT INTO beds (ward_id, bed_number, current_status)
SELECT '1b1bbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ICU-' || n,
  CASE WHEN n <= 11 THEN 'occupied' ELSE 'available' END
FROM generate_series(1, 15) n;

-- Beds for Hospital B — Pediatrics (35 beds)
INSERT INTO beds (ward_id, bed_number, current_status)
SELECT '1b2bbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'PED-' || n,
  CASE WHEN n <= 22 THEN 'occupied' WHEN n <= 30 THEN 'available' ELSE 'cleaning' END
FROM generate_series(1, 35) n;