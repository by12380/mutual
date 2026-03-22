import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Tracks the current user's unread message count for nav badges.
 */
export function useUnreadMessages() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const matchIdsRef = useRef([]);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) {
      matchIdsRef.current = [];
      setUnreadCount(0);
      return;
    }

    try {
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (matchesError) throw matchesError;

      const matchIds = (matches || []).map((match) => match.id);
      matchIdsRef.current = matchIds;

      if (matchIds.length === 0) {
        setUnreadCount(0);
        return;
      }

      const { count, error: unreadError } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('match_id', matchIds)
        .neq('sender_id', user.id)
        .is('read_at', null);

      if (unreadError) throw unreadError;

      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread message count:', error);
    }
  }, [user]);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!user) return undefined;

    const refreshIfRelevant = (payload) => {
      const matchId = payload.new?.match_id || payload.old?.match_id;
      if (!matchId || matchIdsRef.current.includes(matchId)) {
        refreshUnreadCount();
      }
    };

    const subscription = supabase
      .channel(`unread-messages:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `user1_id=eq.${user.id}`,
        },
        refreshUnreadCount
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `user2_id=eq.${user.id}`,
        },
        refreshUnreadCount
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        refreshIfRelevant
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        refreshIfRelevant
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, refreshUnreadCount]);

  return unreadCount;
}
