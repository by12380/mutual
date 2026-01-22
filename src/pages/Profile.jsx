import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
];

const INTEREST_SUGGESTIONS = [
  'Travel', 'Music', 'Movies', 'Fitness', 'Cooking', 'Reading',
  'Gaming', 'Photography', 'Art', 'Sports', 'Hiking', 'Dancing',
  'Coffee', 'Wine', 'Dogs', 'Cats', 'Yoga', 'Meditation',
];

export default function Profile() {
  const { profile, signOut } = useAuth();
  const { updateProfile, uploadPhoto, addPhoto, removePhoto, loading } = useProfile();
  const fileInputRef = useRef(null);

  // Form state
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState([]);
  const [photos, setPhotos] = useState([]);
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

  const toggleInterest = (interest) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest));
    } else if (interests.length < 10) {
      setInterests([...interests, interest]);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>

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

        {/* Interests */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Interests</h2>
          <p className="text-sm text-gray-500 mb-3">Select up to 10 interests</p>
          <div className="flex flex-wrap gap-2">
            {INTEREST_SUGGESTIONS.map(interest => (
              <button
                key={interest}
                onClick={() => toggleInterest(interest)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  interests.includes(interest)
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {interest}
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

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="w-full py-3 text-gray-600 hover:text-gray-800 font-medium"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
