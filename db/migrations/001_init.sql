-- OpenKitchen initial schema.
-- Photo rows are insert-only and their timestamps come from the DB clock only.

CREATE TABLE restaurants (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  area         text NOT NULL,
  slug         text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  upload_token text NOT NULL UNIQUE CHECK (length(upload_token) >= 32),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE spots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id),
  key           text NOT NULL CHECK (key IN ('prep_counter', 'stove', 'fridge', 'wash_area')),
  label         text NOT NULL,
  checklist     text NOT NULL,
  UNIQUE (restaurant_id, key)
);

CREATE TABLE photos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id),
  spot_id       uuid NOT NULL REFERENCES spots(id),
  blob_url      text NOT NULL,
  captured_at   timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX photos_restaurant_captured_idx ON photos (restaurant_id, captured_at DESC);

CREATE TABLE findings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id   uuid NOT NULL REFERENCES photos(id),
  spot_match boolean NOT NULL,
  status     text NOT NULL CHECK (status IN ('ok', 'issues', 'unclear')),
  issues     jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(issues) = 'array'),
  confidence numeric(3, 2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  note       text NOT NULL,
  model      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX findings_photo_idx ON findings (photo_id, created_at DESC);

-- Server time only: overwrite whatever timestamps the caller sent.
CREATE FUNCTION photos_server_time() RETURNS trigger AS $$
BEGIN
  NEW.captured_at := now();
  NEW.created_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER photos_server_time
  BEFORE INSERT ON photos
  FOR EACH ROW EXECUTE FUNCTION photos_server_time();

-- Insert-only: no row in photos can be changed or removed.
CREATE FUNCTION photos_reject_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'photos is insert-only: % is not allowed', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER photos_no_update_delete
  BEFORE UPDATE OR DELETE ON photos
  FOR EACH ROW EXECUTE FUNCTION photos_reject_change();

CREATE TRIGGER photos_no_truncate
  BEFORE TRUNCATE ON photos
  FOR EACH STATEMENT EXECUTE FUNCTION photos_reject_change();
