import { useState, useRef, useCallback } from 'react';
import { useLikes } from '../hooks/useLikes';
import { useCardComments } from '../hooks/useCardComments';
import { useAuth } from '../contexts/AuthContext';
import { getInterestName } from '../lib/interests';
import UserProfileCards from '../components/UserProfileCards';
import MatchModal from '../components/discovery/MatchModal';

export default function Likes() {
  const { user, profile: myProfile } = useAuth();
  const {
    currentAdmirer,
    hasMore,
    loading,
    error,
    likeBack,
    pass,
    likedSections,
    toggleSectionLike,
    refresh,
    remainingCount,
    totalCount,
  } = useLikes();
  const {
    commentsBySection,
    addComment,
    deleteComment,
  } = useCardComments(currentAdmirer?.profile?.id);

  const [matchedProfile, setMatchedProfile] = useState(null);
  const [matchId, setMatchId] = useState(null);
  const [swiping, setSwiping] = useState(false);

  // Touch / drag state
  const containerRef = useRef(null);
  const dragState = useRef({ startX: 0, currentX: 0, dragging: false });
  const [dragOffset, setDragOffset] = useState(0);

  const handleLikeBack = async () => {
    if (swiping) return;
    setSwiping(true);
    animateSwipe(1);
    const result = await likeBack();
    setSwiping(false);
    if (result?.matched) {
      setMatchedProfile(result.profile);
      setMatchId(result.matchId);
    }
  };

  const handlePass = async () => {
    if (swiping) return;
    setSwiping(true);
    animateSwipe(-1);
    await pass();
    setSwiping(false);
  };

  const animateSwipe = (direction) => {
    setDragOffset(direction * 400);
    setTimeout(() => setDragOffset(0), 300);
  };

  const closeMatchModal = () => {
    setMatchedProfile(null);
    setMatchId(null);
  };

  // Touch handlers for swipe gesture
  const onTouchStart = useCallback((e) => {
    dragState.current = {
      startX: e.touches[0].clientX,
      currentX: e.touches[0].clientX,
      dragging: true,
    };
  }, []);

  const onTouchMove = useCallback((e) => {
    if (!dragState.current.dragging) return;
    dragState.current.currentX = e.touches[0].clientX;
    const dx = dragState.current.currentX - dragState.current.startX;
    setDragOffset(dx);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!dragState.current.dragging) return;
    dragState.current.dragging = false;
    const dx = dragState.current.currentX - dragState.current.startX;

    if (dx > 80) {
      handleLikeBack();
    } else if (dx < -80) {
      handlePass();
    } else {
      setDragOffset(0);
    }
  }, [handleLikeBack, handlePass]);

  const renderSectionPreview = (sectionId) => {
    if (sectionId === 'intro') {
      return (
        <div className="flex items-center gap-2">
          {myProfile?.photos?.[0] && (
            <img src={myProfile.photos[0]} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-700">Your intro</p>
            {myProfile?.bio && (
              <p className="text-xs text-gray-500 truncate max-w-[200px]">
                {myProfile.bio.length > 50 ? myProfile.bio.slice(0, 50) + '…' : myProfile.bio}
              </p>
            )}
          </div>
        </div>
      );
    }

    if (sectionId === 'interests') {
      const names = (myProfile?.interests || []).slice(0, 3).map(getInterestName);
      return (
        <div>
          <p className="text-xs font-medium text-gray-700 mb-1">Your interests</p>
          <div className="flex flex-wrap gap-1">
            {names.map((n) => (
              <span key={n} className="px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded text-[10px] font-medium">{n}</span>
            ))}
            {(myProfile?.interests || []).length > 3 && (
              <span className="text-[10px] text-gray-400">+{myProfile.interests.length - 3} more</span>
            )}
          </div>
        </div>
      );
    }

    if (sectionId.startsWith('photo-')) {
      const idx = parseInt(sectionId.split('-')[1]) - 1;
      const photo = myProfile?.photos?.[idx];
      if (photo) {
        return (
          <div className="flex items-center gap-2">
            <img src={photo} alt="" className="w-10 h-14 rounded-lg object-cover flex-shrink-0" />
            <p className="text-xs font-medium text-gray-700">Your photo</p>
          </div>
        );
      }
      return <span className="text-xs text-gray-500">Photo {sectionId.split('-')[1]}</span>;
    }

    if (sectionId.startsWith('prompt-')) {
      const idx = parseInt(sectionId.split('-')[1]) - 1;
      const prompt = myProfile?.prompts?.[idx];
      if (prompt) {
        return (
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-primary-600 uppercase tracking-wide">{prompt.prompt}</p>
            <p className="text-xs text-gray-600 truncate max-w-[200px]">
              {prompt.answer?.length > 60 ? prompt.answer.slice(0, 60) + '…' : prompt.answer}
            </p>
          </div>
        );
      }
      return <span className="text-xs text-gray-500">Prompt {sectionId.split('-')[1]}</span>;
    }

    return <span className="text-xs text-gray-500">{sectionId}</span>;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mb-4" />
        <p className="text-gray-500">Loading people who like you...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <div className="text-red-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Something went wrong</h2>
        <p className="text-gray-500 text-center mb-4">{error}</p>
        <button onClick={refresh} className="btn-primary">Try Again</button>
      </div>
    );
  }

  if (!hasMore || !currentAdmirer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <div className="text-primary-300 mb-4">
          <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          {totalCount === 0 ? 'No likes yet' : "You've seen everyone!"}
        </h2>
        <p className="text-gray-500 text-center mb-4">
          {totalCount === 0
            ? 'When someone likes or comments on your profile, they\'ll appear here'
            : 'Check back later for new admirers'}
        </p>
        <button onClick={refresh} className="btn-outline">Refresh</button>
      </div>
    );
  }

  const { profile, cardLikes, comments, profileLike } = currentAdmirer;

  // Build the set of liked section IDs for highlighting
  const likedSectionIds = new Set(cardLikes.map((cl) => cl.sectionId));
  const commentSectionIds = new Set(comments.map((c) => c.sectionId));
  const allHighlightedSections = new Set([...likedSectionIds, ...commentSectionIds]);

  return (
    <div className="max-w-sm mx-auto pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Likes</h1>
        <span className="text-sm text-gray-500">{remainingCount} left</span>
      </div>

      {/* Interaction summary banner */}
      <div className="px-4 mb-3">
        <div className="bg-primary-50 border border-primary-100 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
              <img
                src={profile.photos?.[0] || 'https://via.placeholder.com/32?text=?'}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-sm font-semibold text-gray-900">{profile.name}</p>
          </div>

          <div className="space-y-2">
            {profileLike && (
              <div className="flex items-center gap-2 p-2 bg-white/60 rounded-lg">
                <svg className="w-4 h-4 text-primary-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                <span className="text-xs font-medium text-primary-700">Liked your overall profile</span>
              </div>
            )}

            {cardLikes.map((cl) => (
              <div key={cl.sectionId} className="flex items-center gap-2 p-2 bg-white/60 rounded-lg">
                <svg className="w-4 h-4 text-pink-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                <div className="flex-1 min-w-0">
                  {renderSectionPreview(cl.sectionId)}
                </div>
              </div>
            ))}

            {comments.map((c, i) => (
              <div key={`comment-${c.sectionId}-${i}`} className="p-2 bg-white/60 rounded-lg space-y-1.5">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    {renderSectionPreview(c.sectionId)}
                  </div>
                </div>
                <p className="text-xs text-blue-700 italic pl-6">
                  &ldquo;{c.body.length > 80 ? c.body.slice(0, 80) + '…' : c.body}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Swipeable profile card area */}
      <div
        ref={containerRef}
        className="px-4 transition-transform duration-300 ease-out"
        style={{
          transform: `translateX(${dragOffset}px)`,
          opacity: Math.max(1 - Math.abs(dragOffset) / 500, 0.4),
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <UserProfileCards
          profile={profile}
          likedSections={likedSections}
          onSectionLike={toggleSectionLike}
          commentsBySection={commentsBySection}
          onAddComment={addComment}
          onDeleteComment={deleteComment}
          currentUserId={user?.id}
          profileOwnerId={profile.id}
        />
      </div>

      {/* Like / Pass action buttons */}
      <div className="px-4 mt-4 flex justify-center gap-6">
        <button
          onClick={handlePass}
          disabled={swiping}
          className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors shadow-md disabled:opacity-50"
          aria-label="Pass"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <button
          onClick={handleLikeBack}
          disabled={swiping}
          className="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center text-white hover:bg-primary-600 transition-colors shadow-md disabled:opacity-50"
          aria-label="Like back"
        >
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </button>
      </div>

      {/* Swipe hints */}
      <div className="flex justify-center gap-8 mt-3 text-sm text-gray-400">
        <span>&larr; Pass</span>
        <span>Like &rarr;</span>
      </div>

      {/* Match Modal */}
      {matchedProfile && (
        <MatchModal
          profile={matchedProfile}
          matchId={matchId}
          onClose={closeMatchModal}
        />
      )}
    </div>
  );
}
