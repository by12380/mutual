import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LocationPicker from '../components/LocationPicker';

export default function SignUp() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [location, setLocation] = useState(null);
  const [height, setHeight] = useState({ feet: '', inches: '' });
  const [heightVisible, setHeightVisible] = useState(true);
  const [religion, setReligion] = useState('');
  const [religionVisible, setReligionVisible] = useState(true);
  const [politicalBeliefs, setPoliticalBeliefs] = useState('');
  const [politicalBeliefsVisible, setPoliticalBeliefsVisible] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const totalSteps = 5;

  const religionOptions = [
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

  const politicalOptions = [
    'Liberal',
    'Conservative',
    'Moderate',
    'Libertarian',
    'Progressive',
    'Apolitical',
    'Other',
    'Prefer not to say',
  ];

  const handleNextStep = (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setStep(2);
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    // Build user metadata
    const metadata = {
      location: location.name,
      location_lat: location.lat,
      location_lng: location.lng,
    };

    // Add optional fields if provided
    if (height.feet) {
      metadata.height_feet = parseInt(height.feet, 10);
      metadata.height_inches = height.inches ? parseInt(height.inches, 10) : 0;
      metadata.height_visible = heightVisible;
    }

    if (religion) {
      metadata.religion = religion;
      metadata.religion_visible = religionVisible;
    }

    if (politicalBeliefs) {
      metadata.political_beliefs = politicalBeliefs;
      metadata.political_beliefs_visible = politicalBeliefsVisible;
    }

    const { data, error } = await signUp(email, password, metadata);
    
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Check if email confirmation is required
    if (data?.user?.identities?.length === 0) {
      setError('An account with this email already exists');
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-400 to-primary-600 px-4">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-2">Check your email</h2>
            <p className="text-gray-600 mb-6">
              We've sent a confirmation link to <strong>{email}</strong>. 
              Click the link to activate your account.
            </p>
            <Link to="/login" className="btn-primary inline-block">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-400 to-primary-600 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Mutual</h1>
          <p className="text-primary-100">One conversation at a time</p>
        </div>

        {/* Sign Up Card */}
        <div className="card p-8">
          <h2 className="text-2xl font-semibold text-center mb-2">Create account</h2>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-1.5 mb-6">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div key={i} className="flex items-center">
                <div className={`w-2 h-2 rounded-full transition-colors ${step >= i + 1 ? 'bg-primary-500' : 'bg-gray-300'}`} />
                {i < totalSteps - 1 && (
                  <div className={`w-6 h-0.5 ml-1.5 ${step >= i + 2 ? 'bg-primary-500' : 'bg-gray-300'}`} />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Email & Password */}
          {step === 1 && (
            <form onSubmit={handleNextStep} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-primary w-full py-3"
              >
                Next
              </button>
            </form>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Location <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Your location is required to find people nearby. You can change it later.
                </p>
                <LocationPicker
                  value={location}
                  onChange={setLocation}
                  compact
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    if (!location || !location.name || !location.lat || !location.lng) {
                      setError('Please select your location to continue');
                      return;
                    }
                    setStep(3);
                  }}
                  disabled={!location}
                  className="btn-primary flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Height (Optional) */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Height
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Optional. Add your height to your profile.
                </p>
                <div className="flex gap-3">
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

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => { setError(''); setStep(4); }}
                  className="btn-primary flex-1 py-3"
                >
                  Next
                </button>
              </div>
              <button
                type="button"
                onClick={() => { setHeight({ feet: '', inches: '' }); setError(''); setStep(4); }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Skip
              </button>
            </div>
          )}

          {/* Step 4: Religion (Optional) */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Religion
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Optional. Select the religion that best describes you.
                </p>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {religionOptions.map((option) => (
                    <label
                      key={option}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        religion === option
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="religion"
                        value={option}
                        checked={religion === option}
                        onChange={(e) => setReligion(e.target.value)}
                        className="w-4 h-4 text-primary-500 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={religionVisible}
                  onChange={(e) => setReligionVisible(e.target.checked)}
                  className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-600">Show religion on my profile</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => { setError(''); setStep(5); }}
                  className="btn-primary flex-1 py-3"
                >
                  Next
                </button>
              </div>
              <button
                type="button"
                onClick={() => { setReligion(''); setError(''); setStep(5); }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Skip
              </button>
            </div>
          )}

          {/* Step 5: Political Beliefs (Optional) */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Political Beliefs
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Optional. Select the political leaning that best describes you.
                </p>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {politicalOptions.map((option) => (
                    <label
                      key={option}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        politicalBeliefs === option
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="politicalBeliefs"
                        value={option}
                        checked={politicalBeliefs === option}
                        onChange={(e) => setPoliticalBeliefs(e.target.value)}
                        className="w-4 h-4 text-primary-500 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={politicalBeliefsVisible}
                  onChange={(e) => setPoliticalBeliefsVisible(e.target.checked)}
                  className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-600">Show political beliefs on my profile</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn-primary flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating account...' : 'Create account'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => { setPoliticalBeliefs(''); handleSubmit(); }}
                disabled={loading}
                className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
              >
                Skip & create account
              </button>
            </div>
          )}

          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
