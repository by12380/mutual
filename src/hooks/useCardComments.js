import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook to manage comments on a specific profile's card sections.
 *
 * @param {string} profileId – The profile being viewed / commented on
 */
export function useCardComments(profileId) {
  const { user } = useAuth();
  const [commentsBySection, setCommentsBySection] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!profileId) {
      setCommentsBySection({});
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profile_card_comments')
        .select(`
          id,
          commenter_id,
          section_id,
          body,
          created_at,
          commenter:profiles!profile_card_comments_commenter_id_fkey (
            id,
            name,
            photos
          )
        `)
        .eq('profile_id', profileId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const grouped = {};
      (data || []).forEach((c) => {
        if (!grouped[c.section_id]) grouped[c.section_id] = [];
        grouped[c.section_id].push(c);
      });
      setCommentsBySection(grouped);
    } catch (err) {
      console.error('Error fetching card comments:', err);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Realtime subscription for new / deleted comments on this profile
  useEffect(() => {
    if (!profileId) return;

    const channel = supabase
      .channel(`card-comments-${profileId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profile_card_comments',
          filter: `profile_id=eq.${profileId}`,
        },
        () => {
          fetchComments();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, fetchComments]);

  const addComment = useCallback(
    async (sectionId, body) => {
      if (!user || !profileId || !sectionId || !body?.trim()) {
        return { error: new Error('Missing required fields') };
      }

      try {
        const { data, error } = await supabase
          .from('profile_card_comments')
          .insert({
            commenter_id: user.id,
            profile_id: profileId,
            section_id: sectionId,
            body: body.trim(),
          })
          .select(`
            id,
            commenter_id,
            section_id,
            body,
            created_at,
            commenter:profiles!profile_card_comments_commenter_id_fkey (
              id,
              name,
              photos
            )
          `)
          .single();

        if (error) throw error;

        setCommentsBySection((prev) => ({
          ...prev,
          [sectionId]: [...(prev[sectionId] || []), data],
        }));

        return { comment: data };
      } catch (err) {
        console.error('Error adding comment:', err);
        return { error: err };
      }
    },
    [user, profileId],
  );

  const deleteComment = useCallback(
    async (commentId, sectionId) => {
      try {
        const { error } = await supabase
          .from('profile_card_comments')
          .delete()
          .eq('id', commentId);

        if (error) throw error;

        setCommentsBySection((prev) => ({
          ...prev,
          [sectionId]: (prev[sectionId] || []).filter((c) => c.id !== commentId),
        }));

        return {};
      } catch (err) {
        console.error('Error deleting comment:', err);
        return { error: err };
      }
    },
    [],
  );

  return { commentsBySection, loading, addComment, deleteComment, refresh: fetchComments };
}
