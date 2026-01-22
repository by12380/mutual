import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Custom hook for managing matches
 * Handles fetching matches and real-time updates
 */
export function useMatches() {
  const { user, profile } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch all matches for the current user
   * Includes the other user's profile info
   */
  const fetchMatches = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch matches where user is either user1 or user2
      const { data, error: fetchError } = await supabase
        .from('matches')
        .select(`
          id,
          status,
          created_at,
          updated_at,
          user1_id,
          user2_id
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Fetch profile info for the other user in each match
      const matchesWithProfiles = await Promise.all(
        (data || []).map(async (match) => {
          const otherUserId = match.user1_id === user.id ? match.user2_id : match.user1_id;
          
          const { data: otherProfile } = await supabase
            .from('profiles')
            .select('id, name, photos, bio')
            .eq('id', otherUserId)
            .single();

          // Get the last message for preview
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content, created_at, sender_id')
            .eq('match_id', match.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('match_id', match.id)
            .neq('sender_id', user.id)
            .is('read_at', null);

          return {
            ...match,
            otherUser: otherProfile,
            lastMessage,
            unreadCount: unreadCount || 0,
            isActive: profile?.active_match_id === match.id,
          };
        })
      );

      setMatches(matchesWithProfiles);
    } catch (err) {
      console.error('Error fetching matches:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, profile?.active_match_id]);

  // Fetch matches on mount and when profile changes
  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Subscribe to real-time match updates
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('matches-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `user1_id=eq.${user.id}`,
        },
        () => fetchMatches()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `user2_id=eq.${user.id}`,
        },
        () => fetchMatches()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, fetchMatches]);

  /**
   * Activate a match for chatting
   * This enforces the "one active chat at a time" rule
   */
  const activateMatch = useCallback(async (matchId) => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      // First, deactivate any currently active match
      if (profile?.active_match_id && profile.active_match_id !== matchId) {
        await supabase
          .from('matches')
          .update({ status: 'pending' })
          .eq('id', profile.active_match_id);
      }

      // Activate the new match
      const { error: matchError } = await supabase
        .from('matches')
        .update({ status: 'active' })
        .eq('id', matchId);

      if (matchError) throw matchError;

      // Update user's active_match_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ active_match_id: matchId })
        .eq('id', user.id);

      if (profileError) throw profileError;

      await fetchMatches();
      return { success: true };
    } catch (err) {
      console.error('Error activating match:', err);
      return { error: err };
    }
  }, [user, profile?.active_match_id, fetchMatches]);

  /**
   * End/deactivate the current active match
   */
  const endMatch = useCallback(async (matchId) => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      // Set match status to ended
      const { error: matchError } = await supabase
        .from('matches')
        .update({ status: 'ended' })
        .eq('id', matchId);

      if (matchError) throw matchError;

      // Clear user's active_match_id if this was the active match
      if (profile?.active_match_id === matchId) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ active_match_id: null })
          .eq('id', user.id);

        if (profileError) throw profileError;
      }

      await fetchMatches();
      return { success: true };
    } catch (err) {
      console.error('Error ending match:', err);
      return { error: err };
    }
  }, [user, profile?.active_match_id, fetchMatches]);

  return {
    matches,
    loading,
    error,
    refresh: fetchMatches,
    activateMatch,
    endMatch,
    activeMatchId: profile?.active_match_id,
  };
}
