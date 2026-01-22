import { useState } from 'react';
import { useDiscovery } from '../hooks/useDiscovery';
import ProfileCard from '../components/discovery/ProfileCard';
import MatchModal from '../components/discovery/MatchModal';

export default function Discover() {
  const { currentProfile, hasMore, loading, error, like, pass, refresh, remainingCount } = useDiscovery();
  const [matchedProfile, setMatchedProfile] = useState(null);
  const [matchId, setMatchId] = useState(null);

  const handleLike = async () => {
    const result = await like();
    if (result.matched) {
      setMatchedProfile(result.profile);
      // Note: matchId would come from the swipe result if we modify the hook
      // For now, user can navigate to matches to see the new match
    }
  };

  const handlePass = async () => {
    await pass();
  };

  const closeMatchModal = () => {
    setMatchedProfile(null);
    setMatchId(null);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mb-4" />
        <p className="text-gray-500">Finding people near you...</p>
      </div>
    );
  }

  // Error state
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
        <button onClick={refresh} className="btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  // No more profiles
  if (!hasMore || !currentProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <div className="text-primary-300 mb-4">
          <svg className="w-24 h-24 mx-auto" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">You've seen everyone!</h2>
        <p className="text-gray-500 text-center mb-4">
          Check back later for new people in your area
        </p>
        <button onClick={refresh} className="btn-outline">
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Discover</h1>
        <span className="text-sm text-gray-500">{remainingCount} left</span>
      </div>

      {/* Profile Card */}
      <ProfileCard
        profile={currentProfile}
        onLike={handleLike}
        onPass={handlePass}
      />

      {/* Keyboard hints */}
      <div className="hidden md:flex justify-center gap-8 mt-4 text-sm text-gray-400">
        <span>← Pass</span>
        <span>Like →</span>
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
