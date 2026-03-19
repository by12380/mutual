import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { haversineDistance } from '../lib/geo';

/**
 * Custom hook for the discovery/swipe feature
 * Handles fetching potential matches and recording swipes
 *
 * @param {Object} options
 * @param {number|null} options.maxDistance - Maximum distance in miles (null = no filter)
 * @param {[number, number]|null} options.ageRange - [minAge, maxAge] filter (null = no filter)
 * @param {[number, number]|null} options.heightRange - [minInches, maxInches] filter (null = no filter)
 * @param {string[]|null} options.genders - Gender values to include (null = no filter)
 * @param {string[]|null} options.religions - Religion values to include (null = no filter)
 */
export function useDiscovery({
  maxDistance = null,
  ageRange = null,
  heightRange = null,
  genders = null,
  religions = null,
} = {}) {
  const { user, profile: myProfile } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedSections, setLikedSections] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const currentProfile = profiles[currentIndex] || null;

  /**
   * Fetch profiles that the user hasn't swiped on yet,
   * optionally filtered by distance and sorted nearest-first.
   */
  const fetchProfiles = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data: swipedData } = await supabase
        .from('swipes')
        .select('swiped_id')
        .eq('swiper_id', user.id);

      const swipedIds = swipedData?.map(s => s.swiped_id) || [];
      const excludeIds = [user.id, ...swipedIds];

      const { data: profilesData, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .not('first_name', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      let results = profilesData || [];

      const myLat = myProfile?.location_lat;
      const myLng = myProfile?.location_lng;

      if (maxDistance != null && myLat != null && myLng != null) {
        results = results
          .map((p) => ({
            ...p,
            _distance: haversineDistance(myLat, myLng, p.location_lat, p.location_lng),
          }))
          .filter((p) => p._distance <= maxDistance)
          .sort((a, b) => a._distance - b._distance);
      } else if (myLat != null && myLng != null) {
        results = results
          .map((p) => ({
            ...p,
            _distance: haversineDistance(myLat, myLng, p.location_lat, p.location_lng),
          }))
          .sort((a, b) => a._distance - b._distance);
      }

      if (ageRange != null) {
        const [minAge, maxAge] = ageRange;
        results = results.filter(
          (p) => p.age != null && p.age >= minAge && p.age <= maxAge,
        );
      }

      if (heightRange != null) {
        const [minInches, maxInches] = heightRange;
        results = results.filter((p) => {
          if (p.height_feet == null) return false;
          const totalInches = p.height_feet * 12 + (p.height_inches || 0);
          return totalInches >= minInches && totalInches <= maxInches;
        });
      }

      if (genders != null && genders.length > 0) {
        results = results.filter((p) => p.gender != null && genders.includes(p.gender));
      }

      if (religions != null && religions.length > 0) {
        results = results.filter((p) => p.religion != null && religions.includes(p.religion));
      }

      setProfiles(results);
      setCurrentIndex(0);
      setLikedSections({});
    } catch (err) {
      console.error('Error fetching profiles:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user,
    myProfile?.location_lat,
    myProfile?.location_lng,
    maxDistance,
    ageRange?.[0],
    ageRange?.[1],
    heightRange?.[0],
    heightRange?.[1],
    genders?.join(','),
    religions?.join(','),
  ]);

  // Fetch profiles on mount and when filters change
  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  /**
   * Load persisted section likes for the current profile.
   */
  useEffect(() => {
    const fetchCurrentSectionLikes = async () => {
      if (!user || !currentProfile?.id) {
        setLikedSections({});
        return;
      }

      const { data, error: likesError } = await supabase
        .from('profile_card_likes')
        .select('section_id')
        .eq('liker_id', user.id)
        .eq('liked_profile_id', currentProfile.id);

      if (likesError) {
        console.error('Error fetching profile card likes:', likesError);
        setLikedSections({});
        return;
      }

      const nextLikedSections = {};
      (data || []).forEach((item) => {
        nextLikedSections[item.section_id] = true;
      });
      setLikedSections(nextLikedSections);
    };

    fetchCurrentSectionLikes();
  }, [user, currentProfile?.id]);

  /**
   * Toggle like on a specific section card for the current profile.
   */
  const toggleSectionLike = useCallback(async (sectionId) => {
    if (!user || !currentProfile?.id || !sectionId) {
      return { error: new Error('No profile card to like') };
    }

    const alreadyLiked = likedSections[sectionId] === true;

    try {
      if (alreadyLiked) {
        const { error: deleteError } = await supabase
          .from('profile_card_likes')
          .delete()
          .eq('liker_id', user.id)
          .eq('liked_profile_id', currentProfile.id)
          .eq('section_id', sectionId);

        if (deleteError) throw deleteError;
      } else {
        const { error: insertError } = await supabase
          .from('profile_card_likes')
          .insert({
            liker_id: user.id,
            liked_profile_id: currentProfile.id,
            section_id: sectionId,
          });

        if (insertError) throw insertError;
      }

      setLikedSections((prev) => ({
        ...prev,
        [sectionId]: !alreadyLiked,
      }));

      return { liked: !alreadyLiked };
    } catch (err) {
      console.error('Error toggling profile card like:', err);
      return { error: err };
    }
  }, [user, currentProfile?.id, likedSections]);

  /**
   * Record a swipe (like or pass)
   * Returns { matched: true, matchId: UUID } if this creates a new match
   * The match is created automatically by a database trigger on mutual likes
   */
  const swipe = useCallback(async (direction) => {
    if (!user || currentIndex >= profiles.length) {
      return { error: new Error('No profile to swipe on') };
    }

    const targetProfile = profiles[currentIndex];

    try {
      // Record the swipe (match is created automatically by DB trigger if mutual)
      const { error: swipeError } = await supabase
        .from('swipes')
        .insert({
          swiper_id: user.id,
          swiped_id: targetProfile.id,
          direction,
        });

      if (swipeError) throw swipeError;

      // Check if this creates a match (if we liked them)
      let matched = false;
      let matchId = null;

      if (direction === 'like') {
        // Check if they already liked us (mutual like = match)
        const { data: mutualLike } = await supabase
          .from('swipes')
          .select('id')
          .eq('swiper_id', targetProfile.id)
          .eq('swiped_id', user.id)
          .eq('direction', 'like')
          .single();

        matched = !!mutualLike;

        // If matched, fetch the match ID (created by trigger)
        if (matched) {
          // Order user IDs to match the constraint in the matches table
          const orderedUser1 = user.id < targetProfile.id ? user.id : targetProfile.id;
          const orderedUser2 = user.id < targetProfile.id ? targetProfile.id : user.id;

          const { data: matchData, error: matchError } = await supabase
            .from('matches')
            .select('id, source')
            .eq('user1_id', orderedUser1)
            .eq('user2_id', orderedUser2)
            .maybeSingle();

          if (matchError) throw matchError;

          if (matchData?.source === 'comment') {
            const { error: promoteError } = await supabase
              .from('matches')
              .update({ source: 'swipe' })
              .eq('id', matchData.id);

            if (promoteError) throw promoteError;
          }

          matchId = matchData?.id || null;
        }
      }

      // Move to next profile
      setCurrentIndex(prev => prev + 1);
      setLikedSections({});

      return { matched, matchId, profile: targetProfile };
    } catch (err) {
      console.error('Error recording swipe:', err);
      return { error: err };
    }
  }, [user, profiles, currentIndex]);

  /**
   * Like the current profile
   */
  const like = useCallback(() => swipe('like'), [swipe]);

  /**
   * Pass on the current profile
   */
  const pass = useCallback(() => swipe('pass'), [swipe]);

  /**
   * Check if there are more profiles to show
   */
  const hasMore = currentIndex < profiles.length;

  return {
    currentProfile,
    hasMore,
    loading,
    error,
    like,
    pass,
    likedSections,
    toggleSectionLike,
    refresh: fetchProfiles,
    remainingCount: profiles.length - currentIndex,
  };
}
