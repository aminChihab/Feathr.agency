-- supabase/migrations/00011_bookings_table.sql

CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date timestamptz NOT NULL,
  duration text,
  notes text,
  revenue_cents bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can insert own bookings"
  ON bookings FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update own bookings"
  ON bookings FOR UPDATE USING (auth.uid() = profile_id);
CREATE POLICY "Users can delete own bookings"
  ON bookings FOR DELETE USING (auth.uid() = profile_id);
