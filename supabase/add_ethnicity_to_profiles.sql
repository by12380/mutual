ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ethnicity TEXT,
  ADD COLUMN IF NOT EXISTS ethnicity_visible BOOLEAN DEFAULT TRUE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, first_name, last_name, age, gender, bio, photos, location, location_lat, location_lng,
    height_feet, height_inches, height_visible,
    religion, religion_visible,
    ethnicity, ethnicity_visible,
    political_beliefs, political_beliefs_visible,
    prompts
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    CASE
      WHEN (NEW.raw_user_meta_data->>'age') ~ '^[0-9]+$' THEN (NEW.raw_user_meta_data->>'age')::INTEGER
      ELSE NULL
    END,
    NEW.raw_user_meta_data->>'gender',
    NEW.raw_user_meta_data->>'bio',
    CASE
      WHEN jsonb_typeof(NEW.raw_user_meta_data->'photos') = 'array'
        THEN NEW.raw_user_meta_data->'photos'
      ELSE '[]'::JSONB
    END,
    NEW.raw_user_meta_data->>'location',
    (NEW.raw_user_meta_data->>'location_lat')::DOUBLE PRECISION,
    (NEW.raw_user_meta_data->>'location_lng')::DOUBLE PRECISION,
    (NEW.raw_user_meta_data->>'height_feet')::INTEGER,
    COALESCE((NEW.raw_user_meta_data->>'height_inches')::INTEGER, 0),
    COALESCE((NEW.raw_user_meta_data->>'height_visible')::BOOLEAN, TRUE),
    NEW.raw_user_meta_data->>'religion',
    COALESCE((NEW.raw_user_meta_data->>'religion_visible')::BOOLEAN, TRUE),
    NEW.raw_user_meta_data->>'ethnicity',
    COALESCE((NEW.raw_user_meta_data->>'ethnicity_visible')::BOOLEAN, TRUE),
    NEW.raw_user_meta_data->>'political_beliefs',
    COALESCE((NEW.raw_user_meta_data->>'political_beliefs_visible')::BOOLEAN, TRUE),
    COALESCE((NEW.raw_user_meta_data->'prompts')::JSONB, '[]'::JSONB)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
