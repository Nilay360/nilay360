CREATE TABLE IF NOT EXISTS saved_properties (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE saved_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own saves"
  ON saved_properties
  USING (auth.uid() = user_id);
