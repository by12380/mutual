import { useState } from 'react';
import { getInterestName } from '../../lib/interests';

/**
 * Profile card component for the discovery/swipe view
 * Displays user photos, name, age, bio, and interests
 */
export default function ProfileCard({ profile, onLike, onPass }) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [swipeAnimation, setSwipeAnimation] = useState(null);

  const photos = profile.photos?.length > 0 
    ? profile.photos 
    : ['https://via.placeholder.com/400x500?text=No+Photo'];

  const nextPhoto = () => {
    if (currentPhotoIndex < photos.length - 1) {
      setCurrentPhotoIndex(prev => prev + 1);
    }
  };

  const prevPhoto = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(prev => prev - 1);
    }
  };

  const handleLike = () => {
    setSwipeAnimation('right');
    setTimeout(() => {
      onLike();
      setSwipeAnimation(null);
      setCurrentPhotoIndex(0);
    }, 300);
  };

  const handlePass = () => {
    setSwipeAnimation('left');
    setTimeout(() => {
      onPass();
      setSwipeAnimation(null);
      setCurrentPhotoIndex(0);
    }, 300);
  };

  return (
    <div 
      className={`card w-full max-w-sm mx-auto transition-transform duration-300 ${
        swipeAnimation === 'left' ? 'animate-swipe-left' : ''
      } ${swipeAnimation === 'right' ? 'animate-swipe-right' : ''}`}
    >
      {/* Photo Section */}
      <div className="relative aspect-[3/4] bg-gray-200">
        <img
          src={photos[currentPhotoIndex]}
          alt={profile.name}
          className="w-full h-full object-cover"
        />

        {/* Photo Navigation */}
        {photos.length > 1 && (
          <>
            {/* Photo indicators */}
            <div className="absolute top-2 left-2 right-2 flex gap-1">
              {photos.map((_, index) => (
                <div
                  key={index}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    index === currentPhotoIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>

            {/* Tap areas for navigation */}
            <button
              onClick={prevPhoto}
              className="absolute left-0 top-0 w-1/3 h-full"
              aria-label="Previous photo"
            />
            <button
              onClick={nextPhoto}
              className="absolute right-0 top-0 w-1/3 h-full"
              aria-label="Next photo"
            />
          </>
        )}

        {/* Gradient overlay for text readability */}
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />

        {/* Name and Age */}
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h2 className="text-2xl font-bold">
            {profile.name}{profile.age && <span className="font-normal">, {profile.age}</span>}
          </h2>
          {profile.location && (
            <p className="text-sm text-white/80 flex items-center gap-1 mt-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {profile.location}
            </p>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="p-4">
        {/* Details (Height, Religion, Political Beliefs) */}
        {(
          (profile.height_feet && profile.height_visible !== false) ||
          (profile.religion && profile.religion_visible !== false) ||
          (profile.political_beliefs && profile.political_beliefs_visible !== false)
        ) && (
          <div className="flex flex-wrap gap-2 mb-3">
            {profile.height_feet && profile.height_visible !== false && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7l4-4m0 0l4 4m-4-4v18" />
                </svg>
                {profile.height_feet}'{profile.height_inches || 0}"
              </span>
            )}
            {profile.religion && profile.religion_visible !== false && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                {profile.religion}
              </span>
            )}
            {profile.political_beliefs && profile.political_beliefs_visible !== false && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                {profile.political_beliefs}
              </span>
            )}
          </div>
        )}

        {/* Bio */}
        {profile.bio && (
          <p className="text-gray-700 text-sm mb-3 line-clamp-3">{profile.bio}</p>
        )}

        {/* Interests */}
        {profile.interests?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {profile.interests.slice(0, 5).map(interestId => (
              <span
                key={interestId}
                className="px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full text-xs font-medium"
              >
                {getInterestName(interestId)}
              </span>
            ))}
            {profile.interests.length > 5 && (
              <span className="px-2 py-0.5 text-gray-500 text-xs">
                +{profile.interests.length - 5} more
              </span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <button
            onClick={handlePass}
            className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors shadow-md"
            aria-label="Pass"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <button
            onClick={handleLike}
            className="w-14 h-14 rounded-full bg-primary-500 flex items-center justify-center text-white hover:bg-primary-600 transition-colors shadow-md"
            aria-label="Like"
          >
            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
