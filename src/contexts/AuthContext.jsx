import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

// Custom hook to access auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from database
  const fetchProfile = async (userId, userEmail = null, userMetadata = null) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      // PGRST116 means no rows found - profile doesn't exist yet
      if (error.code === 'PGRST116') {
        console.log('Profile not found, creating one...');
        // Build profile with location from user metadata if available
        const profileData = { id: userId, email: userEmail };
        if (userMetadata?.location) {
          profileData.location = userMetadata.location;
          profileData.location_lat = userMetadata.location_lat || null;
          profileData.location_lng = userMetadata.location_lng || null;
        }
        // Create the profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert(profileData)
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          return null;
        }
        return newProfile;
      }
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  };

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;

    // Listen for auth changes - set up FIRST to catch any auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        if (session?.user) {
          setUser(session.user);
          // Fetch profile in the background, don't block auth state
          fetchProfile(session.user.id, session.user.email, session.user.user_metadata).then((userProfile) => {
            if (isMounted) setProfile(userProfile);
          });
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // Get initial session
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        }
        
        if (isMounted) {
          if (session?.user) {
            setUser(session.user);
            const userProfile = await fetchProfile(session.user.id, session.user.email, session.user.user_metadata);
            if (isMounted) setProfile(userProfile);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Sign up with email and password
  const signUp = async (email, password, metadata = {}) => {
    // Validate location is provided
    if (!metadata.location || !metadata.location_lat || !metadata.location_lng) {
      return { data: null, error: { message: 'Location is required to create an account' } };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    return { data, error };
  };

  // Sign in with email and password
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  // Sign in with OAuth provider (Google, etc.)
  const signInWithProvider = async (provider) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/discover`,
      },
    });
    return { data, error };
  };

  // Sign out
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setProfile(null);
    }
    return { error };
  };

  // Refresh profile data
  const refreshProfile = async () => {
    if (user) {
      const userProfile = await fetchProfile(user.id, user.email);
      setProfile(userProfile);
      return userProfile;
    }
    return null;
  };

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signInWithProvider,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
