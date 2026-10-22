-- One photo per spot per kitchen day (India time). The API also checks this first,
-- but the index is what makes two simultaneous uploads unable to both get in.
CREATE UNIQUE INDEX photos_one_per_spot_per_day
  ON photos (spot_id, ((captured_at AT TIME ZONE 'Asia/Kolkata')::date));
