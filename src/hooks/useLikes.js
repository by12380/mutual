import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook for the "Likes" tab — fetches people who have liked or commented
 * on the current user's profile, grouped by person, excluding anyone
 * the user has already swiped on.
 */
export function useLikes() {
  const { user } = useAuth();
  const [admirers, setAdmirers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currentAdmirer = admirers[currentIndex] || null;

  const fetchAdmirers = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const [swipedResult, profileLikesResult, cardLikesResult, commentsResult] =
        await Promise.all([
          supabase
            .from('swipes')
            .select('swiped_id')
            .eq('swiper_id', user.id),
          supabase
            .from('swipes')
            .select(`
              swiper_id,
              created_at
            `)
            .eq('swiped_id', user.id)
            .eq('direction', 'like'),
          supabase
            .from('profile_card_likes')
            .select(`
              liker_id,
              section_id,
              created_at
            `)
            .eq('liked_profile_id', user.id),
          supabase
            .from('profile_card_comments')
            .select(`
              commenter_id,
              section_id,
              body,
              created_at
            `)
            .eq('profile_id', user.id)
            .neq('commenter_id', user.id),
        ]);

      if (swipedResult.error) throw swipedResult.error;
      if (profileLikesResult.error) throw profileLikesResult.error;
      if (cardLikesResult.error) throw cardLikesResult.error;
      if (commentsResult.error) throw commentsResult.error;

      const alreadySwiped = new Set(
        (swipedResult.data || []).map((s) => s.swiped_id),
      );

      // Collect unique user IDs who interacted with the current user's profile
      const interactorMap = {};

      for (const like of profileLikesResult.data || []) {
        if (alreadySwiped.has(like.swiper_id) || like.swiper_id === user.id) continue;
        if (!interactorMap[like.swiper_id]) {
          interactorMap[like.swiper_id] = {
            userId: like.swiper_id,
            profileLike: true,
            cardLikes: [],
            comments: [],
            latestAt: like.created_at,
          };
        } else {
          interactorMap[like.swiper_id].profileLike = true;
          if (like.created_at > interactorMap[like.swiper_id].latestAt) {
            interactorMap[like.swiper_id].latestAt = like.created_at;
          }
        }
      }

      for (const cl of cardLikesResult.data || []) {
        if (alreadySwiped.has(cl.liker_id) || cl.liker_id === user.id) continue;
        if (!interactorMap[cl.liker_id]) {
          interactorMap[cl.liker_id] = {
            userId: cl.liker_id,
            profileLike: false,
            cardLikes: [],
            comments: [],
            latestAt: cl.created_at,
          };
        }
        interactorMap[cl.liker_id].cardLikes.push({
          sectionId: cl.section_id,
          createdAt: cl.created_at,
        });
        if (cl.created_at > interactorMap[cl.liker_id].latestAt) {
          interactorMap[cl.liker_id].latestAt = cl.created_at;
        }
      }

      for (const comment of commentsResult.data || []) {
        if (alreadySwiped.has(comment.commenter_id) || comment.commenter_id === user.id) continue;
        if (!interactorMap[comment.commenter_id]) {
          interactorMap[comment.commenter_id] = {
            userId: comment.commenter_id,
            profileLike: false,
            cardLikes: [],
            comments: [],
            latestAt: comment.created_at,
          };
        }
        interactorMap[comment.commenter_id].comments.push({
          sectionId: comment.section_id,
          body: comment.body,
          createdAt: comment.created_at,
        });
        if (comment.created_at > interactorMap[comment.commenter_id].latestAt) {
          interactorMap[comment.commenter_id].latestAt = comment.created_at;
        }
      }

      const userIds = Object.keys(interactorMap);
      if (userIds.length === 0) {
        setAdmirers([]);
        setCurrentIndex(0);
        setLoading(false);
        return;
      }

      // Fetch full profile data for all interactors
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds)
        .not('name', 'is', null);

      if (profilesError) throw profilesError;

      const profileMap = {};
      for (const p of profiles || []) {
        profileMap[p.id] = p;
      }

      const result = userIds
        .filter((uid) => profileMap[uid])
        .map((uid) => ({
          ...interactorMap[uid],
          profile: profileMap[uid],
        }))
        .sort((a, b) => new Date(b.latestAt) - new Date(a.latestAt));

      setAdmirers(result);
      setCurrentIndex(0);
    } catch (err) {
      console.error('Error fetching likes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAdmirers();
  }, [fetchAdmirers]);

  /**
   * Swipe on the current admirer. Records a swipe and checks for match.
   */
  const swipe = useCallback(
    async (direction) => {
      if (!user || !currentAdmirer) {
        return { error: new Error('No admirer to swipe on') };
      }

      const targetId = currentAdmirer.userId;

      try {
        const { error: swipeError } = await supabase.from('swipes').insert({
          swiper_id: user.id,
          swiped_id: targetId,
          direction,
        });

        if (swipeError) throw swipeError;

        let matched = false;
        let matchId = null;

        if (direction === 'like') {
          // They already liked us (that's why they're in this list),
          // so a match trigger should fire. Fetch the match row.
          const orderedUser1 = user.id < targetId ? user.id : targetId;
          const orderedUser2 = user.id < targetId ? targetId : user.id;

          const { data: matchData } = await supabase
            .from('matches')
            .select('id')
            .eq('user1_id', orderedUser1)
            .eq('user2_id', orderedUser2)
            .single();

          matched = !!matchData;
          matchId = matchData?.id || null;
        }

        setCurrentIndex((prev) => prev + 1);

        return { matched, matchId, profile: currentAdmirer.profile };
      } catch (err) {
        console.error('Error recording swipe from likes:', err);
        return { error: err };
      }
    },
    [user, currentAdmirer],
  );

  const likeBack = useCallback(() => swipe('like'), [swipe]);
  const pass = useCallback(() => swipe('pass'), [swipe]);

  const hasMore = currentIndex < admirers.length;

  return {
    currentAdmirer,
    hasMore,
    loading,
    error,
    likeBack,
    pass,
    refresh: fetchAdmirers,
    remainingCount: Math.max(admirers.length - currentIndex, 0),
    totalCount: admirers.length,
  };
}
