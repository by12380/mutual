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
  const [likedSections, setLikedSections] = useState({});

  const photos = profile?.photos?.length > 0
    ? profile.photos
    : [];
  const mainPhoto = photos[0];
  const additionalPhotos = photos.slice(1);
  const prompts = profile?.prompts || [];
  const interests = profile?.interests || [];

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

  const toggleSectionLike = (sectionId) => {
    setLikedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const sectionLikeButton = (sectionId, label) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={likedSections[sectionId] === true}
      onClick={() => toggleSectionLike(sectionId)}
      className={`absolute bottom-3 right-3 w-11 h-11 rounded-full border border-gray-200 shadow-md flex items-center justify-center transition-colors ${
        likedSections[sectionId]
          ? 'bg-primary-500 text-white hover:bg-primary-600'
          : 'bg-white/95 text-primary-500 hover:text-primary-600 hover:bg-white'
      }`}
    >
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    </button>
  );

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

      <div className="px-4 space-y-4">
        {/* Main profile card (photo + details + bio) */}
        <div className="card relative overflow-hidden animate-fade-in">
          {mainPhoto ? (
            <div className="relative aspect-[3/4] bg-gray-200">
              <img
                src={mainPhoto}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />
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

          <div className="p-4 pb-14">
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

            {profile.bio ? (
              <p className="text-gray-700 text-sm">{profile.bio}</p>
            ) : (
              <p className="text-gray-400 text-sm italic">No bio yet</p>
            )}
          </div>
          {sectionLikeButton('intro', 'Like profile intro')}
        </div>

        {/* Interests card */}
        <div className="card relative p-4 pb-14">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Interests</h3>
          {interests.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {interests.map(interestId => (
                <span
                  key={interestId}
                  className="px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full text-xs font-medium"
                >
                  {getInterestName(interestId)}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No interests yet</p>
          )}
          {sectionLikeButton('interests', 'Like interests')}
        </div>

        {/* Additional photo cards */}
        {additionalPhotos.map((photo, index) => (
          <div key={`${photo}-${index}`} className="card relative overflow-hidden">
            <div className="aspect-[3/4] bg-gray-200">
              <img
                src={photo}
                alt={`${profile.name} photo ${index + 2}`}
                className="w-full h-full object-cover"
              />
            </div>
            {sectionLikeButton(`photo-${index + 2}`, `Like photo ${index + 2}`)}
          </div>
        ))}

        {/* One prompt per card */}
        {prompts.map((prompt, index) => (
          <div key={`${prompt.prompt}-${index}`} className="card relative p-4 pb-14">
            <p className="text-xs font-semibold text-primary-600 uppercase tracking-wide mb-2">
              {prompt.prompt}
            </p>
            <p className="text-sm text-gray-800">{prompt.answer}</p>
            {sectionLikeButton(`prompt-${index + 1}`, `Like prompt ${index + 1}`)}
          </div>
        ))}
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
