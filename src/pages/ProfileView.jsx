import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getInterestName } from '../lib/interests';

/**
 * Read-only profile view that shows what the user's profile
 * looks like to other users on the app.
 */
export default function ProfileView() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const photos = profile?.photos?.length > 0
    ? profile.photos
    : [];

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

  const hasDetails =
    (profile.height_feet && profile.height_visible !== false) ||
    (profile.religion && profile.religion_visible !== false) ||
    (profile.political_beliefs && profile.political_beliefs_visible !== false);

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

      {/* Profile Card Preview */}
      <div className="mx-4 card animate-fade-in">
        {/* Photo Section */}
        {photos.length > 0 ? (
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

            {/* Gradient overlay */}
            <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />

            {/* Name and Age */}
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h2 className="text-2xl font-bold">
                {profile.name}
                {profile.age && <span className="font-normal">, {profile.age}</span>}
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
        ) : (
          /* No photos placeholder */
          <div className="aspect-[3/4] bg-gray-100 flex flex-col items-center justify-center text-gray-400">
            <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm font-medium">No photos yet</p>
            <div className="mt-2 px-4 text-center">
              <h2 className="text-xl font-bold text-gray-700">
                {profile.name || 'Your Name'}
                {profile.age && <span className="font-normal">, {profile.age}</span>}
              </h2>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="p-4">
          {/* Details (Height, Religion, Political Beliefs) - only visible ones */}
          {hasDetails && (
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
          {profile.bio ? (
            <p className="text-gray-700 text-sm mb-3">{profile.bio}</p>
          ) : (
            <p className="text-gray-400 text-sm italic mb-3">No bio yet</p>
          )}

          {/* Interests */}
          {profile.interests?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profile.interests.map(interestId => (
                <span
                  key={interestId}
                  className="px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full text-xs font-medium"
                >
                  {getInterestName(interestId)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Button */}
      <div className="mx-4 mt-4">
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
