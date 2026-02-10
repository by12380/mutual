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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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

    // Validate location is provided
    if (!location || !location.name || !location.lat || !location.lng) {
      setError('Please select your location to continue');
      return;
    }

    setLoading(true);

    // Build user metadata with location
    const metadata = {
      location: location.name,
      location_lat: location.lat,
      location_lng: location.lng,
    };

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
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className={`w-2 h-2 rounded-full transition-colors ${step >= 1 ? 'bg-primary-500' : 'bg-gray-300'}`} />
            <div className={`w-8 h-0.5 ${step >= 2 ? 'bg-primary-500' : 'bg-gray-300'}`} />
            <div className={`w-2 h-2 rounded-full transition-colors ${step >= 2 ? 'bg-primary-500' : 'bg-gray-300'}`} />
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
                  onClick={handleSubmit}
                  disabled={loading || !location}
                  className="btn-primary flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating account...' : 'Create account'}
                </button>
              </div>
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
