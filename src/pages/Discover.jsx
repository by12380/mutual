import { useState } from 'react';
import { useDiscovery } from '../hooks/useDiscovery';
import { useCardComments } from '../hooks/useCardComments';
import { useAuth } from '../contexts/AuthContext';
import UserProfileCards from '../components/UserProfileCards';
import MatchModal from '../components/discovery/MatchModal';
import LocationFilter from '../components/discovery/LocationFilter';
import AgeFilter from '../components/discovery/AgeFilter';
import HeightFilter from '../components/discovery/HeightFilter';
import GenderFilter from '../components/discovery/GenderFilter';
import ReligionFilter from '../components/discovery/ReligionFilter';
import EthnicityFilter from '../components/discovery/EthnicityFilter';
import PoliticalBeliefsFilter from '../components/discovery/PoliticalBeliefsFilter';

export default function Discover() {
  const { user, profile: myProfile } = useAuth();
  const [maxDistance, setMaxDistance] = useState(null);
  const [ageRange, setAgeRange] = useState(null);
  const [heightRange, setHeightRange] = useState(null);
  const [selectedGenders, setSelectedGenders] = useState(null);
  const [selectedReligions, setSelectedReligions] = useState(null);
  const [selectedEthnicities, setSelectedEthnicities] = useState(null);
  const [selectedPoliticalBeliefs, setSelectedPoliticalBeliefs] = useState(null);
  const [dealbreakers, setDealbreakers] = useState({
    location: false,
    age: false,
    height: false,
    gender: false,
    religion: false,
    ethnicity: false,
    politicalBeliefs: false,
  });
  const setDealbreaker = (key, value) => {
    setDealbreakers((prev) => ({
      ...prev,
      [key]: value,
    }));
  };
  const {
    currentProfile,
    hasMore,
    loading,
    error,
    like,
    pass,
    likedSections,
    toggleSectionLike,
    refresh,
    remainingCount,
  } = useDiscovery({
    maxDistance,
    ageRange,
    heightRange,
    genders: selectedGenders,
    religions: selectedReligions,
    ethnicities: selectedEthnicities,
    politicalBeliefs: selectedPoliticalBeliefs,
    dealbreakers,
  });
  const {
    commentsBySection,
    addComment,
    deleteComment,
  } = useCardComments(currentProfile?.id);
  const [matchedProfile, setMatchedProfile] = useState(null);
  const [matchId, setMatchId] = useState(null);

  const handleLike = async () => {
    const result = await like();
    if (result.matched) {
      setMatchedProfile(result.profile);
      setMatchId(result.matchId);
    }
  };

  const handlePass = async () => {
    await pass();
  };

  const handleSectionLike = async (sectionId) => {
    await toggleSectionLike(sectionId);
  };

  const closeMatchModal = () => {
    setMatchedProfile(null);
    setMatchId(null);
  };

  const hasActiveFilters = (
    maxDistance != null
    || ageRange != null
    || heightRange != null
    || selectedGenders != null
    || selectedReligions != null
    || selectedEthnicities != null
    || selectedPoliticalBeliefs != null
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mb-4" />
        <p className="text-gray-500">Finding people near you...</p>
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
        <button onClick={refresh} className="btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  if (!hasMore || !currentProfile) {
    return (
      <div className="max-w-sm mx-auto">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Discover</h1>
        </div>
        <div className="px-4 pb-2 overflow-x-auto scrollbar-hide">
          <div className="flex w-max min-w-full flex-nowrap items-center gap-2">
            <LocationFilter
              value={maxDistance}
              onChange={setMaxDistance}
              hasLocation={!!(myProfile?.location_lat && myProfile?.location_lng)}
              dealbreaker={dealbreakers.location}
              onDealbreakerChange={(value) => setDealbreaker('location', value)}
            />
            <AgeFilter
              value={ageRange}
              onChange={setAgeRange}
              dealbreaker={dealbreakers.age}
              onDealbreakerChange={(value) => setDealbreaker('age', value)}
            />
            <HeightFilter
              value={heightRange}
              onChange={setHeightRange}
              dealbreaker={dealbreakers.height}
              onDealbreakerChange={(value) => setDealbreaker('height', value)}
            />
            <GenderFilter
              value={selectedGenders}
              onChange={setSelectedGenders}
              dealbreaker={dealbreakers.gender}
              onDealbreakerChange={(value) => setDealbreaker('gender', value)}
            />
            <ReligionFilter
              value={selectedReligions}
              onChange={setSelectedReligions}
              dealbreaker={dealbreakers.religion}
              onDealbreakerChange={(value) => setDealbreaker('religion', value)}
            />
            <EthnicityFilter
              value={selectedEthnicities}
              onChange={setSelectedEthnicities}
              dealbreaker={dealbreakers.ethnicity}
              onDealbreakerChange={(value) => setDealbreaker('ethnicity', value)}
            />
            <PoliticalBeliefsFilter
              value={selectedPoliticalBeliefs}
              onChange={setSelectedPoliticalBeliefs}
              dealbreaker={dealbreakers.politicalBeliefs}
              onDealbreakerChange={(value) => setDealbreaker('politicalBeliefs', value)}
            />
          </div>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
          <div className="text-primary-300 mb-4">
            <svg className="w-24 h-24 mx-auto" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {hasActiveFilters ? 'No one matches your filters' : "You've seen everyone!"}
          </h2>
          <p className="text-gray-500 text-center mb-4">
            {hasActiveFilters
              ? 'Try adjusting your filters'
              : 'Check back later for new people in your area'}
          </p>
          <button onClick={refresh} className="btn-outline">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Discover</h1>
        <span className="text-sm text-gray-500">{remainingCount} left</span>
      </div>

      {/* Filters */}
      <div className="px-4 pb-2 overflow-x-auto scrollbar-hide">
        <div className="flex w-max min-w-full flex-nowrap items-center gap-2">
          <LocationFilter
            value={maxDistance}
            onChange={setMaxDistance}
            hasLocation={!!(myProfile?.location_lat && myProfile?.location_lng)}
            dealbreaker={dealbreakers.location}
            onDealbreakerChange={(value) => setDealbreaker('location', value)}
          />
          <AgeFilter
            value={ageRange}
            onChange={setAgeRange}
            dealbreaker={dealbreakers.age}
            onDealbreakerChange={(value) => setDealbreaker('age', value)}
          />
          <HeightFilter
            value={heightRange}
            onChange={setHeightRange}
            dealbreaker={dealbreakers.height}
            onDealbreakerChange={(value) => setDealbreaker('height', value)}
          />
          <GenderFilter
            value={selectedGenders}
            onChange={setSelectedGenders}
            dealbreaker={dealbreakers.gender}
            onDealbreakerChange={(value) => setDealbreaker('gender', value)}
          />
          <ReligionFilter
            value={selectedReligions}
            onChange={setSelectedReligions}
            dealbreaker={dealbreakers.religion}
            onDealbreakerChange={(value) => setDealbreaker('religion', value)}
          />
          <EthnicityFilter
            value={selectedEthnicities}
            onChange={setSelectedEthnicities}
            dealbreaker={dealbreakers.ethnicity}
            onDealbreakerChange={(value) => setDealbreaker('ethnicity', value)}
          />
          <PoliticalBeliefsFilter
            value={selectedPoliticalBeliefs}
            onChange={setSelectedPoliticalBeliefs}
            dealbreaker={dealbreakers.politicalBeliefs}
            onDealbreakerChange={(value) => setDealbreaker('politicalBeliefs', value)}
          />
        </div>
      </div>

      <div className="px-4">
        <UserProfileCards
          profile={currentProfile}
          likedSections={likedSections}
          onSectionLike={handleSectionLike}
          commentsBySection={commentsBySection}
          onAddComment={addComment}
          onDeleteComment={deleteComment}
          currentUserId={user?.id}
          profileOwnerId={currentProfile?.id}
        />
      </div>

      {/* Like / Pass action buttons */}
      <div className="px-4 mt-4 flex justify-center gap-6">
        <button
          onClick={handlePass}
          className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors shadow-md"
          aria-label="Pass"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <button
          onClick={handleLike}
          className="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center text-white hover:bg-primary-600 transition-colors shadow-md"
          aria-label="Like"
        >
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </button>
      </div>

      {/* Keyboard hints */}
      <div className="hidden md:flex justify-center gap-8 mt-4 text-sm text-gray-400">
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
