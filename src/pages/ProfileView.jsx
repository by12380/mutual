import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import UserProfileCards from '../components/UserProfileCards';
import { supabase } from '../lib/supabase';

const formatLikeDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatSectionLabel = (sectionId) => {
  if (sectionId === 'intro') return 'Intro card';
  if (sectionId === 'interests') return 'Interests card';
  if (sectionId.startsWith('photo-')) {
    const photoNumber = sectionId.split('-')[1];
    return `Photo ${photoNumber} card`;
  }
  if (sectionId.startsWith('prompt-')) {
    const promptNumber = sectionId.split('-')[1];
    return `Prompt ${promptNumber} card`;
  }
  return sectionId;
};

/**
 * Read-only profile view that shows what the user's profile
 * looks like to other users on the app.
 */
export default function ProfileView() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [profileLikes, setProfileLikes] = useState([]);
  const [cardLikes, setCardLikes] = useState([]);
  const [likesLoading, setLikesLoading] = useState(true);
  const [likesError, setLikesError] = useState(null);

  useEffect(() => {
    const fetchLikes = async () => {
      if (!profile?.id) {
        setProfileLikes([]);
        setCardLikes([]);
        setLikesLoading(false);
        return;
      }

      setLikesLoading(true);
      setLikesError(null);

      try {
        const [profileLikesResult, cardLikesResult] = await Promise.all([
          supabase
            .from('swipes')
            .select(`
              swiper_id,
              created_at,
              swiper:profiles!swipes_swiper_id_fkey (
                id,
                name,
                photos
              )
            `)
            .eq('swiped_id', profile.id)
            .eq('direction', 'like')
            .order('created_at', { ascending: false }),
          supabase
            .from('profile_card_likes')
            .select(`
              liker_id,
              section_id,
              created_at,
              liker:profiles!profile_card_likes_liker_id_fkey (
                id,
                name,
                photos
              )
            `)
            .eq('liked_profile_id', profile.id)
            .order('created_at', { ascending: false }),
        ]);

        if (profileLikesResult.error) throw profileLikesResult.error;
        if (cardLikesResult.error) throw cardLikesResult.error;

        setProfileLikes(profileLikesResult.data || []);
        setCardLikes(cardLikesResult.data || []);
      } catch (err) {
        console.error('Error fetching profile likes:', err);
        setLikesError(err.message || 'Failed to load likes');
      } finally {
        setLikesLoading(false);
      }
    };

    fetchLikes();
  }, [profile?.id]);

  const handleSignOut = async () => {
    await signOut();
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">My Profile</h1>
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-500 hover:text-gray-700 font-medium"
        >
          Sign Out
        </button>
      </div>

      <div className="px-4">
        <UserProfileCards profile={profile} showSectionLikes={false} />
      </div>

      {/* Likes summary */}
      <div className="px-4 mt-4 space-y-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Profile Likes</h2>
            <span className="text-xs font-medium text-gray-500">{profileLikes.length}</span>
          </div>

          {likesLoading ? (
            <p className="text-sm text-gray-500">Loading likes...</p>
          ) : profileLikes.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No profile likes yet</p>
          ) : (
            <div className="space-y-2">
              {profileLikes.map((like) => (
                <div key={`${like.swiper_id}-${like.created_at}`} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                    <img
                      src={like.swiper?.photos?.[0] || 'https://via.placeholder.com/32?text=?'}
                      alt={like.swiper?.name || 'User'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 truncate">{like.swiper?.name || 'Unknown user'}</p>
                    <p className="text-xs text-gray-500">{formatLikeDate(like.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Card Likes</h2>
            <span className="text-xs font-medium text-gray-500">{cardLikes.length}</span>
          </div>

          {likesLoading ? (
            <p className="text-sm text-gray-500">Loading likes...</p>
          ) : cardLikes.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No card likes yet</p>
          ) : (
            <div className="space-y-2">
              {cardLikes.map((like) => (
                <div key={`${like.liker_id}-${like.section_id}-${like.created_at}`} className="border border-gray-100 rounded-lg p-2.5">
                  <p className="text-xs font-semibold text-primary-600 mb-1">{formatSectionLabel(like.section_id)}</p>
                  <p className="text-sm text-gray-800">{like.liker?.name || 'Unknown user'}</p>
                  <p className="text-xs text-gray-500">{formatLikeDate(like.created_at)}</p>
                </div>
              ))}
            </div>
          )}

          {likesError && (
            <p className="mt-3 text-xs text-red-500">{likesError}</p>
          )}
        </div>
      </div>

      {/* Edit Profile Button */}
      <div className="px-4 mt-4">
        <button
          onClick={() => navigate('/profile/edit')}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit Profile
        </button>
      </div>
    </div>
  );
}
