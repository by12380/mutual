import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Custom hook for the discovery/swipe feature
 * Handles fetching potential matches and recording swipes
 */
export function useDiscovery() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch profiles that the user hasn't swiped on yet
   */
  const fetchProfiles = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Get IDs of users we've already swiped on
      const { data: swipedData } = await supabase
        .from('swipes')
        .select('swiped_id')
        .eq('swiper_id', user.id);

      const swipedIds = swipedData?.map(s => s.swiped_id) || [];
      
      // Add current user to exclusion list
      const excludeIds = [user.id, ...swipedIds];

      // Fetch profiles we haven't swiped on
      // Only show profiles that have completed their profile (have a name)
      const { data: profilesData, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .not('name', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (fetchError) throw fetchError;

      setProfiles(profilesData || []);
      setCurrentIndex(0);
    } catch (err) {
      console.error('Error fetching profiles:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch profiles on mount
  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  /**
   * Record a swipe (like or pass)
   * Returns { matched: true } if this creates a new match
   */
  const swipe = useCallback(async (direction) => {
    if (!user || currentIndex >= profiles.length) {
      return { error: new Error('No profile to swipe on') };
    }

    const targetProfile = profiles[currentIndex];

    try {
      // Record the swipe
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
      if (direction === 'like') {
        // Check if they already liked us
        const { data: mutualLike } = await supabase
          .from('swipes')
          .select('id')
          .eq('swiper_id', targetProfile.id)
          .eq('swiped_id', user.id)
          .eq('direction', 'like')
          .single();

        matched = !!mutualLike;
      }

      // Move to next profile
      setCurrentIndex(prev => prev + 1);

      return { matched, profile: targetProfile };
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
   * Get the current profile to display
   */
  const currentProfile = profiles[currentIndex] || null;

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
    refresh: fetchProfiles,
    remainingCount: profiles.length - currentIndex,
  };
}
