-- =============================================================================
-- MIGRATION: Add stable card IDs to photos and prompts
-- =============================================================================
-- This migration converts the photos column from TEXT[] to JSONB (array of
-- {id, url} objects) and adds an `id` field to each prompt object.
--
-- Run this ONCE against your existing database to backfill card IDs.
-- After running, likes and comments will persist even when users reorder
-- photos, remove prompts, or edit their profile.
-- =============================================================================

-- Step 1: Convert photos from TEXT[] to JSONB with stable IDs
-- Only runs if the column is currently TEXT[] type.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'photos'
      AND data_type = 'ARRAY'
  ) THEN
    -- Add a temporary JSONB column
    ALTER TABLE public.profiles ADD COLUMN photos_jsonb JSONB DEFAULT '[]';

    -- Migrate existing TEXT[] photos to JSONB [{id, url}, ...]
    UPDATE public.profiles
    SET photos_jsonb = (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', encode(gen_random_bytes(6), 'hex'),
            'url', photo_url
          )
        ),
        '[]'::jsonb
      )
      FROM unnest(photos) AS photo_url
    )
    WHERE photos IS NOT NULL AND array_length(photos, 1) > 0;

    -- Drop old column and rename new one
    ALTER TABLE public.profiles DROP COLUMN photos;
    ALTER TABLE public.profiles RENAME COLUMN photos_jsonb TO photos;
  END IF;
END $$;

-- Step 2: Add `id` field to each prompt object that doesn't have one
UPDATE public.profiles
SET prompts = (
  SELECT jsonb_agg(
    CASE
      WHEN prompt_obj ? 'id' THEN prompt_obj
      ELSE jsonb_build_object('id', encode(gen_random_bytes(6), 'hex')) || prompt_obj
    END
  )
  FROM jsonb_array_elements(prompts) AS prompt_obj
)
WHERE prompts IS NOT NULL
  AND jsonb_array_length(prompts) > 0
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(prompts) AS p
    WHERE NOT (p ? 'id')
  );

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
