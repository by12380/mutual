import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Custom hook for real-time chat functionality
 * Handles messages, real-time subscriptions, and read receipts
 */
export function useChat(matchId) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [match, setMatch] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const subscriptionRef = useRef(null);

  /**
   * Fetch match details and the other user's profile
   */
  const fetchMatchDetails = useCallback(async () => {
    if (!user || !matchId) return;

    try {
      // Fetch match
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (matchError) throw matchError;

      // Verify user is part of this match
      if (matchData.user1_id !== user.id && matchData.user2_id !== user.id) {
        throw new Error('You are not part of this match');
      }

      setMatch(matchData);

      // Fetch other user's profile
      const otherUserId = matchData.user1_id === user.id 
        ? matchData.user2_id 
        : matchData.user1_id;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, photos, bio')
        .eq('id', otherUserId)
        .single();

      if (profileError) throw profileError;
      setOtherUser(profileData);

    } catch (err) {
      console.error('Error fetching match details:', err);
      setError(err.message);
    }
  }, [user, matchId]);

  /**
   * Fetch all messages for this match
   */
  const fetchMessages = useCallback(async () => {
    if (!matchId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setMessages(data || []);

      // Mark unread messages as read
      if (user && data?.length > 0) {
        const unreadIds = data
          .filter(m => m.sender_id !== user.id && !m.read_at)
          .map(m => m.id);

        if (unreadIds.length > 0) {
          await supabase
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .in('id', unreadIds);
        }
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err.message);
    }
  }, [matchId, user]);

  // Initial data fetch
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchMatchDetails();
      await fetchMessages();
      setLoading(false);
    };
    init();
  }, [fetchMatchDetails, fetchMessages]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!matchId) return;

    // Subscribe to new messages
    subscriptionRef.current = supabase
      .channel(`messages:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const newMessage = payload.new;
          
          // Add new message to state
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });

          // Mark as read if from other user
          if (user && newMessage.sender_id !== user.id) {
            supabase
              .from('messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', newMessage.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          // Update message in state (for read receipts)
          setMessages(prev =>
            prev.map(m => (m.id === payload.new.id ? payload.new : m))
          );
        }
      )
      .subscribe();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [matchId, user]);

  /**
   * Send a new message
   */
  const sendMessage = useCallback(async (content) => {
    if (!user || !matchId || !content.trim()) {
      return { error: new Error('Invalid message') };
    }

    // Check if match is active
    if (match?.status !== 'active') {
      return { error: new Error('This conversation is not active') };
    }

    setSending(true);

    try {
      const { data, error: sendError } = await supabase
        .from('messages')
        .insert({
          match_id: matchId,
          sender_id: user.id,
          content: content.trim(),
        })
        .select()
        .single();

      if (sendError) throw sendError;

      // Optimistically add to messages (will be deduplicated by real-time)
      setMessages(prev => {
        if (prev.some(m => m.id === data.id)) return prev;
        return [...prev, data];
      });

      setSending(false);
      return { data };
    } catch (err) {
      console.error('Error sending message:', err);
      setSending(false);
      return { error: err };
    }
  }, [user, matchId, match?.status]);

  /**
   * Check if the current user can send messages
   * (match must be active)
   */
  const canSendMessage = match?.status === 'active';

  return {
    messages,
    match,
    otherUser,
    loading,
    error,
    sending,
    sendMessage,
    canSendMessage,
    refresh: fetchMessages,
  };
}
