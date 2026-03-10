import { useState, useCallback } from 'react';
import { supabase, getPublicUrl } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateCardId, migratePhotos } from '../lib/cardId';

/**
 * Custom hook for managing user profile data and operations
 */
export function useProfile() {
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Update user profile fields
   */
  const updateProfile = useCallback(async (updates) => {
    if (!user) return { error: new Error('Not authenticated') };
    
    setLoading(true);
    setError(null);

    const { data, error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return { error: updateError };
    }

    // Refresh the profile in context
    await refreshProfile();
    setLoading(false);
    return { data };
  }, [user, refreshProfile]);

  /**
   * Upload a profile photo to Supabase Storage
   * Returns the public URL of the uploaded image
   */
  const uploadPhoto = useCallback(async (file) => {
    if (!user) return { error: new Error('Not authenticated') };

    setLoading(true);
    setError(null);

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      setError(uploadError.message);
      setLoading(false);
      return { error: uploadError };
    }

    // Get public URL
    const publicUrl = getPublicUrl('avatars', fileName);
    setLoading(false);
    return { url: publicUrl };
  }, [user]);

  /**
   * Add a photo URL to the user's photos array (stored as {id, url} objects)
   */
  const addPhoto = useCallback(async (photoUrl) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('photos')
      .eq('id', user.id)
      .maybeSingle();

    const currentPhotos = migratePhotos(profile?.photos);

    if (currentPhotos.length >= 6) {
      return { error: new Error('Maximum 6 photos allowed') };
    }

    const newPhoto = { id: generateCardId(), url: photoUrl };
    const newPhotos = [...currentPhotos, newPhoto];
    return updateProfile({ photos: newPhotos });
  }, [user, updateProfile]);

  /**
   * Remove a photo from the user's photos array by URL
   */
  const removePhoto = useCallback(async (photoUrl) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data: profile } = await supabase
      .from('profiles')
      .select('photos')
      .eq('id', user.id)
      .maybeSingle();

    const currentPhotos = migratePhotos(profile?.photos);
    const newPhotos = currentPhotos.filter(p => p.url !== photoUrl);

    return updateProfile({ photos: newPhotos });
  }, [user, updateProfile]);

  /**
   * Set the active match for the user (enforces one-at-a-time rule)
   */
  const setActiveMatch = useCallback(async (matchId) => {
    return updateProfile({ active_match_id: matchId });
  }, [updateProfile]);

  /**
   * Clear the active match
   */
  const clearActiveMatch = useCallback(async () => {
    return updateProfile({ active_match_id: null });
  }, [updateProfile]);

  return {
    loading,
    error,
    updateProfile,
    uploadPhoto,
    addPhoto,
    removePhoto,
    setActiveMatch,
    clearActiveMatch,
  };
}
