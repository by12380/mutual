import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Tracks the current user's unseen likes for nav badges.
 * Counts unique people who either liked the whole profile or a profile card
 * and excludes profiles the user has already swiped on from the Likes queue.
 */
export function useUnreadLikes() {
  const { user } = useAuth();
  const [unreadLikesCount, setUnreadLikesCount] = useState(0);

  const refreshUnreadLikesCount = useCallback(async () => {
    if (!user) {
      setUnreadLikesCount(0);
      return;
    }

    try {
      const [swipedResult, profileLikesResult, cardLikesResult] = await Promise.all([
        supabase
          .from('swipes')
          .select('swiped_id')
          .eq('swiper_id', user.id),
        supabase
          .from('swipes')
          .select('swiper_id')
          .eq('swiped_id', user.id)
          .eq('direction', 'like'),
        supabase
          .from('profile_card_likes')
          .select('liker_id')
          .eq('liked_profile_id', user.id),
      ]);

      if (swipedResult.error) throw swipedResult.error;
      if (profileLikesResult.error) throw profileLikesResult.error;
      if (cardLikesResult.error) throw cardLikesResult.error;

      const alreadySwiped = new Set((swipedResult.data || []).map((swipe) => swipe.swiped_id));
      const admirers = new Set();

      for (const like of profileLikesResult.data || []) {
        if (like.swiper_id !== user.id && !alreadySwiped.has(like.swiper_id)) {
          admirers.add(like.swiper_id);
        }
      }

      for (const like of cardLikesResult.data || []) {
        if (like.liker_id !== user.id && !alreadySwiped.has(like.liker_id)) {
          admirers.add(like.liker_id);
        }
      }

      setUnreadLikesCount(admirers.size);
    } catch (error) {
      console.error('Error fetching unread likes count:', error);
    }
  }, [user]);

  useEffect(() => {
    refreshUnreadLikesCount();
  }, [refreshUnreadLikesCount]);

  useEffect(() => {
    if (!user) return undefined;

    const subscription = supabase
      .channel(`unread-likes:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'swipes',
          filter: `swiped_id=eq.${user.id}`,
        },
        refreshUnreadLikesCount
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'swipes',
          filter: `swiper_id=eq.${user.id}`,
        },
        refreshUnreadLikesCount
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profile_card_likes',
          filter: `liked_profile_id=eq.${user.id}`,
        },
        refreshUnreadLikesCount
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, refreshUnreadLikesCount]);

  return unreadLikesCount;
}
