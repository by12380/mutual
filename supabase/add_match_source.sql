ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'swipe'
CHECK (source IN ('swipe', 'comment'));

CREATE INDEX IF NOT EXISTS idx_matches_source ON public.matches(source);

-- Backfill historical rows: if a pair does not have mutual right swipes,
-- treat the existing thread as comment-started rather than a true match.
UPDATE public.matches AS m
SET source = 'comment'
WHERE m.source <> 'comment'
  AND NOT EXISTS (
    SELECT 1
    FROM public.swipes AS s1
    JOIN public.swipes AS s2
      ON s1.swiper_id = m.user1_id
     AND s1.swiped_id = m.user2_id
     AND s1.direction = 'like'
     AND s2.swiper_id = m.user2_id
     AND s2.swiped_id = m.user1_id
     AND s2.direction = 'like'
  );
