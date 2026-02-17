import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { INTERESTS } from '../lib/interests';
import { PROMPT_OPTIONS, MAX_PROMPTS } from '../lib/prompts';
import LocationPicker from '../components/LocationPicker';

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
];

const RELIGION_OPTIONS = [
  'Christianity',
  'Islam',
  'Judaism',
  'Hinduism',
  'Buddhism',
  'Sikhism',
  'Spiritual',
  'Agnostic',
  'Atheist',
  'Other',
  'Prefer not to say',
];

const POLITICAL_OPTIONS = [
  'Liberal',
  'Conservative',
  'Moderate',
  'Libertarian',
  'Progressive',
  'Apolitical',
  'Other',
  'Prefer not to say',
];

export default function Profile() {
  const { profile } = useAuth();
  const { updateProfile, uploadPhoto, addPhoto, removePhoto, loading } = useProfile();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Form state
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState(null);
  const [interests, setInterests] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [height, setHeight] = useState({ feet: '', inches: '' });
  const [heightVisible, setHeightVisible] = useState(true);
  const [religion, setReligion] = useState('');
  const [religionVisible, setReligionVisible] = useState(true);
  const [politicalBeliefs, setPoliticalBeliefs] = useState('');
  const [politicalBeliefsVisible, setPoliticalBeliefsVisible] = useState(true);
  const [prompts, setPrompts] = useState([]);
  const [showPromptPicker, setShowPromptPicker] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [promptAnswer, setPromptAnswer] = useState('');
  const [promptSearch, setPromptSearch] = useState('');
  const [editingPromptIndex, setEditingPromptIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setAge(profile.age?.toString() || '');
      setGender(profile.gender || '');
      setBio(profile.bio || '');
      setInterests(profile.interests || []);
      setPhotos(profile.photos || []);
      setHeight({
        feet: profile.height_feet?.toString() || '',
        inches: profile.height_inches?.toString() || '',
      });
      setHeightVisible(profile.height_visible !== false);
      setReligion(profile.religion || '');
      setReligionVisible(profile.religion_visible !== false);
      setPoliticalBeliefs(profile.political_beliefs || '');
      setPoliticalBeliefsVisible(profile.political_beliefs_visible !== false);
      setPrompts(profile.prompts || []);
      if (profile.location) {
        setLocation({
          name: profile.location,
          lat: profile.location_lat || null,
          lng: profile.location_lng || null,
        });
      } else {
        setLocation(null);
      }
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    const updates = {
      name: name.trim(),
      age: age ? parseInt(age, 10) : null,
      gender: gender || null,
      bio: bio.trim(),
      interests,
      location: location?.name || null,
      location_lat: location?.lat || null,
      location_lng: location?.lng || null,
      height_feet: height.feet ? parseInt(height.feet, 10) : null,
      height_inches: height.feet ? (height.inches ? parseInt(height.inches, 10) : 0) : null,
      height_visible: heightVisible,
      religion: religion || null,
      religion_visible: religionVisible,
      political_beliefs: politicalBeliefs || null,
      political_beliefs_visible: politicalBeliefsVisible,
      prompts: prompts.length > 0 ? prompts : null,
    };

    const { error } = await updateProfile(updates);

    if (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save profile' });
    } else {
      setMessage({ type: 'success', text: 'Profile saved successfully!' });
    }

    setSaving(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be less than 5MB' });
      return;
    }

    setMessage({ type: '', text: '' });
    const { url, error: uploadError } = await uploadPhoto(file);

    if (uploadError) {
      setMessage({ type: 'error', text: uploadError.message });
      return;
    }

    const { error: addError } = await addPhoto(url);
    if (addError) {
      setMessage({ type: 'error', text: addError.message });
      return;
    }

    setPhotos([...photos, url]);
    setMessage({ type: 'success', text: 'Photo uploaded!' });
  };

  const handleRemovePhoto = async (photoUrl) => {
    const { error } = await removePhoto(photoUrl);
    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }
    setPhotos(photos.filter(p => p !== photoUrl));
  };

  const toggleInterest = (interestId) => {
    if (interests.includes(interestId)) {
      setInterests(interests.filter(id => id !== interestId));
    } else if (interests.length < 10) {
      setInterests([...interests, interestId]);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="p-4">
        {/* Header with back button */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/profile')}
            className="p-1 -ml-1 text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="Back to profile"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold">Edit Profile</h1>
        </div>

        {/* Status Message */}
        {message.text && (
          <div
            className={`px-4 py-3 rounded-lg mb-4 ${
              message.type === 'error'
                ? 'bg-red-50 text-red-600'
                : 'bg-green-50 text-green-600'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Photos Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Photos</h2>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, index) => (
              <div key={index} className="relative aspect-square">
                <img
                  src={photo}
                  alt={`Profile ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />
                <button
                  onClick={() => handleRemovePhoto(photo)}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ))}
            {photos.length < 6 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-primary-400 hover:text-primary-400 transition-colors"
              >
                <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs">Add Photo</span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <p className="text-xs text-gray-500 mt-2">Add up to 6 photos. First photo is your main profile picture.</p>
        </section>

        {/* Basic Info */}
        <section className="mb-8 space-y-4">
          <h2 className="text-lg font-semibold mb-3">Basic Info</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="Your name"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="input-field"
              placeholder="Your age"
              min={18}
              max={120}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="input-field"
            >
              <option value="">Select gender</option>
              {GENDER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="input-field min-h-[100px] resize-none"
              placeholder="Tell others about yourself..."
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">{bio.length}/500</p>
          </div>
        </section>

        {/* Height */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Height</h2>
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <label htmlFor="feet" className="block text-xs text-gray-500 mb-1">Feet</label>
              <select
                id="feet"
                value={height.feet}
                onChange={(e) => setHeight({ ...height, feet: e.target.value })}
                className="input-field"
              >
                <option value="">—</option>
                {[3, 4, 5, 6, 7].map((ft) => (
                  <option key={ft} value={ft}>{ft}'</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor="inches" className="block text-xs text-gray-500 mb-1">Inches</label>
              <select
                id="inches"
                value={height.inches}
                onChange={(e) => setHeight({ ...height, inches: e.target.value })}
                className="input-field"
              >
                <option value="">—</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>{i}"</option>
                ))}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={heightVisible}
              onChange={(e) => setHeightVisible(e.target.checked)}
              className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-600">Show height on my profile</span>
          </label>
        </section>

        {/* Religion */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Religion</h2>
          <select
            value={religion}
            onChange={(e) => setReligion(e.target.value)}
            className="input-field mb-3"
          >
            <option value="">Select religion</option>
            {RELIGION_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={religionVisible}
              onChange={(e) => setReligionVisible(e.target.checked)}
              className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-600">Show religion on my profile</span>
          </label>
        </section>

        {/* Political Beliefs */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Political Beliefs</h2>
          <select
            value={politicalBeliefs}
            onChange={(e) => setPoliticalBeliefs(e.target.value)}
            className="input-field mb-3"
          >
            <option value="">Select political leaning</option>
            {POLITICAL_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={politicalBeliefsVisible}
              onChange={(e) => setPoliticalBeliefsVisible(e.target.checked)}
              className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-600">Show political beliefs on my profile</span>
          </label>
        </section>

        {/* Prompts */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Profile Prompts</h2>
          <p className="text-sm text-gray-500 mb-3">Add up to {MAX_PROMPTS} prompts to share more about yourself</p>

          {/* Existing prompts */}
          <div className="space-y-3 mb-4">
            {prompts.map((p, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50 relative group">
                <p className="text-xs font-semibold text-primary-600 uppercase tracking-wide mb-1">{p.prompt}</p>
                <p className="text-sm text-gray-800">{p.answer}</p>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPromptIndex(index);
                      setSelectedPrompt(p.prompt);
                      setPromptAnswer(p.answer);
                      setShowPromptPicker(false);
                    }}
                    className="w-6 h-6 bg-white border border-gray-300 text-gray-500 rounded-full flex items-center justify-center text-xs hover:bg-gray-100"
                    aria-label="Edit prompt"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPrompts(prompts.filter((_, i) => i !== index));
                      if (editingPromptIndex === index) {
                        setEditingPromptIndex(null);
                        setSelectedPrompt('');
                        setPromptAnswer('');
                      }
                    }}
                    className="w-6 h-6 bg-white border border-gray-300 text-red-500 rounded-full flex items-center justify-center text-xs hover:bg-red-50"
                    aria-label="Remove prompt"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Prompt answer editor */}
          {selectedPrompt && !showPromptPicker ? (
            <div className="border-2 border-primary-200 rounded-lg p-4 bg-primary-50/30 mb-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-primary-700">{selectedPrompt}</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPrompt('');
                    setPromptAnswer('');
                    setEditingPromptIndex(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <textarea
                value={promptAnswer}
                onChange={(e) => setPromptAnswer(e.target.value)}
                className="input-field min-h-[80px] resize-none text-sm"
                placeholder="Write your answer..."
                maxLength={200}
                autoFocus
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-400">{promptAnswer.length}/200</span>
                <button
                  type="button"
                  onClick={() => {
                    if (!promptAnswer.trim()) return;
                    if (editingPromptIndex !== null) {
                      const updated = [...prompts];
                      updated[editingPromptIndex] = { prompt: selectedPrompt, answer: promptAnswer.trim() };
                      setPrompts(updated);
                    } else {
                      setPrompts([...prompts, { prompt: selectedPrompt, answer: promptAnswer.trim() }]);
                    }
                    setSelectedPrompt('');
                    setPromptAnswer('');
                    setEditingPromptIndex(null);
                  }}
                  disabled={!promptAnswer.trim()}
                  className="px-4 py-1.5 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingPromptIndex !== null ? 'Save' : 'Add'}
                </button>
              </div>
            </div>
          ) : showPromptPicker ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={promptSearch}
                    onChange={(e) => setPromptSearch(e.target.value)}
                    placeholder="Search prompts..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-52 overflow-y-auto">
                {PROMPT_OPTIONS
                  .filter((p) => {
                    const alreadyUsed = prompts.some((added) => added.prompt === p);
                    const matchesSearch = p.toLowerCase().includes(promptSearch.toLowerCase());
                    return !alreadyUsed && matchesSearch;
                  })
                  .map((promptOption) => (
                    <button
                      key={promptOption}
                      type="button"
                      onClick={() => {
                        setSelectedPrompt(promptOption);
                        setPromptAnswer('');
                        setShowPromptPicker(false);
                        setPromptSearch('');
                        setEditingPromptIndex(null);
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 border-b border-gray-50 last:border-0 transition-colors"
                    >
                      {promptOption}
                    </button>
                  ))}
                {PROMPT_OPTIONS.filter((p) => {
                  const alreadyUsed = prompts.some((added) => added.prompt === p);
                  const matchesSearch = p.toLowerCase().includes(promptSearch.toLowerCase());
                  return !alreadyUsed && matchesSearch;
                }).length === 0 && (
                  <p className="px-4 py-3 text-sm text-gray-400 italic">No matching prompts found</p>
                )}
              </div>
              <div className="p-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setShowPromptPicker(false); setPromptSearch(''); }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 py-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : prompts.length < MAX_PROMPTS ? (
            <button
              type="button"
              onClick={() => setShowPromptPicker(true)}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg py-4 flex flex-col items-center justify-center text-gray-400 hover:border-primary-400 hover:text-primary-500 transition-colors"
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm font-medium">Add a prompt</span>
            </button>
          ) : null}
        </section>

        {/* Location */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Location</h2>
          <p className="text-sm text-gray-500 mb-3">Set your location to find people nearby</p>
          <LocationPicker
            value={location}
            onChange={setLocation}
          />
        </section>

        {/* Interests */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Interests</h2>
          <p className="text-sm text-gray-500 mb-3">Select up to 10 interests</p>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map(interest => (
              <button
                key={interest.id}
                onClick={() => toggleInterest(interest.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  interests.includes(interest.id)
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {interest.name}
              </button>
            ))}
          </div>
        </section>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="btn-primary w-full py-3 mb-4"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>

        {/* Back to Profile View */}
        <button
          onClick={() => navigate('/profile')}
          className="w-full py-3 text-gray-600 hover:text-gray-800 font-medium"
        >
          Back to Profile
        </button>
      </div>
    </div>
  );
}
