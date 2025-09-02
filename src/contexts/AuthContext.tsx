import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import Snackbar from '../components/Snackbar';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  role: 'customer' | 'admin' | 'super_admin';
  email: string;
  created_at: string;
  updated_at: string;
}

interface SnackbarState {
  isVisible: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: { first_name: string; last_name: string }) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  snackbar: SnackbarState;
  showSnackbar: (message: string, type: 'success' | 'error' | 'info') => void;
  hideSnackbar: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ isVisible: false, message: '', type: 'info' });

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Check if this is a new OAuth user (Google Sign-In)
        if (event === 'SIGNED_IN' && session.user.app_metadata.provider === 'google') {
          await handleOAuthUser(session.user);
        }
        fetchProfile(session.user.id);
        showSnackbar('Signed in successfully', 'success');
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        
        // Handle case where profile doesn't exist (user deleted from profiles table)
        if (error.code === 'PGRST116' || error.message?.includes('No rows returned')) {
          console.log('Profile not found - user may have been deleted from profiles table');
          // Sign out the user since their profile no longer exists
          await supabase.auth.signOut();
          setProfile(null);
          setUser(null);
          return;
        }
        
        // If RLS is blocking the fetch, try a different approach
        if (error.code === 'PGRST116') {
          console.log('RLS policy blocked profile fetch, trying alternative method');
          // Try to fetch just the role to check admin status
          const { data: roleData, error: roleError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();
          
          if (roleError) {
            console.error('Error fetching role:', roleError);
            // If we still can't fetch the role, sign out the user
            await supabase.auth.signOut();
            setProfile(null);
            setUser(null);
            return;
          } else {
            console.log('Successfully fetched role:', roleData);
            // Create a minimal profile with just the role
            setProfile({
              id: userId,
              first_name: '',
              last_name: '',
              role: roleData.role,
              email: user?.email || '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        } else {
          setProfile(null);
        }
      } else {
        console.log('Successfully fetched profile:', data);
        setProfile(data as Profile);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      // On any unexpected error, sign out the user for security
      await supabase.auth.signOut();
      setProfile(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthUser = async (user: User) => {
    console.log('=== OAUTH USER HANDLER START ===');
    console.log('User ID:', user.id);
    console.log('User Email:', user.email);
    console.log('Provider:', user.app_metadata?.provider);
    console.log('Full user object:', JSON.stringify(user, null, 2));
    
    try {
      console.log('Google user metadata:', user.user_metadata);
      console.log('Google user app_metadata:', user.app_metadata);
      
      // Check if profile already exists
      console.log('Checking if profile exists for user ID:', user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      console.log('Profile check result:', { data, error });

      let shouldCreateProfile = false;
      
      if (error) {
        if (error.code === '42P17') {
          console.log('RLS recursion detected during profile check - this is expected, continuing...');
          shouldCreateProfile = true; // Assume no profile exists due to recursion
        } else if (error.code !== 'PGRST116') {
          console.error('Error checking for existing profile:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          return;
        } else {
          // PGRST116 means no rows found - profile doesn't exist
          shouldCreateProfile = true;
        }
      } else if (!data) {
        // No error and no data means profile doesn't exist
        shouldCreateProfile = true;
      } else {
        // Profile exists
        console.log('Profile already exists for OAuth user:', data);
        return;
      }

      if (!shouldCreateProfile) {
        return;
      }

      // Enhanced name parsing logic
      const parseGoogleName = (userMetadata: any) => {
        console.log('Parsing names from metadata:', userMetadata);
        
        // Try to get individual names first
        let firstName = userMetadata.given_name || '';
        let lastName = userMetadata.family_name || '';
        
        console.log('Individual names from Google:', { firstName, lastName });
        
        // If we don't have individual names, parse the full name
        if (!firstName && !lastName) {
          const fullName = userMetadata.full_name || userMetadata.name || '';
          console.log('Full name from Google:', fullName);
          
          if (fullName) {
            const nameParts = fullName.trim().split(/\s+/);
            firstName = nameParts[0] || '';
            lastName = nameParts.length > 1 ? nameParts[1] : '';
            console.log('Parsed names from full name:', { firstName, lastName, nameParts });
          }
        }
        
        // If we still don't have a first name, use email prefix as fallback
        if (!firstName && user.email) {
          firstName = user.email.split('@')[0];
          console.log('Using email prefix as firstName:', firstName);
        }
        
        return { firstName, lastName };
      };
      
      const { firstName, lastName } = parseGoogleName(user.user_metadata);
      
      const profileData = {
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        role: 'customer',
        email: user.email,
      };
      
      console.log('Profile data to insert:', profileData);
      console.log('Creating new profile for OAuth user:', {
        id: user.id,
        email: user.email,
        firstName,
        lastName,
        provider: user.app_metadata.provider
      });

      const { data: insertData, error: profileError } = await supabase
        .from('profiles')
        .insert([profileData])
        .select()
        .single();
      
      console.log('Profile insertion result:', { insertData, profileError });
      
      if (profileError) {
        console.error('=== PROFILE CREATION FAILED ===');
        console.error('Error creating profile:', profileError);
        console.error('Profile error details:', {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint
        });
        console.error('Profile data that failed:', profileData);
        
        // Check if it's a permissions issue
        if (profileError.code === '42501') {
          console.error('PERMISSION DENIED: Check RLS policies on profiles table');
        }
        
        // Check if it's a constraint violation
        if (profileError.code === '23505') {
          console.error('UNIQUE CONSTRAINT VIOLATION: Profile may already exist');
        }
        
        throw profileError;
      } else {
        console.log('=== PROFILE CREATION SUCCESS ===');
        console.log('Successfully created profile for OAuth user:', insertData);
      }
    } catch (error) {
      console.error('=== OAUTH USER HANDLER ERROR ===');
      console.error('Error in handleOAuthUser:', error);
      console.error('Error type:', typeof error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Don't throw the error to prevent auth flow interruption
      // The user will still be authenticated, just without a profile initially
    }
    
    console.log('=== OAUTH USER HANDLER END ===');
  };

  const signUp = async (email: string, password: string, userData: { first_name: string; last_name: string }) => {
    console.log('=== SIGN UP START ===');
    console.log('Email:', email);
    console.log('User data:', userData);
    
    // Sign up with user metadata that the database trigger will use
    const { data: { user }, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          first_name: userData.first_name,
          last_name: userData.last_name,
          full_name: `${userData.first_name} ${userData.last_name}`.trim()
        }
      }
    });
    
    if (error) {
      console.error('Sign up error:', error);
      showSnackbar('Error signing up', 'error');
      throw error;
    }

    if (user) {
      console.log('User created successfully:', user.id);
      console.log('User metadata stored:', user.user_metadata);
      
      // The database trigger will automatically create the profile
      // We don't need to manually create it here anymore
      
      // Wait a moment for the trigger to complete, then try to fetch the profile
      console.log('Waiting for database trigger to create profile...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try to fetch the created profile with retries
      let attempts = 0;
      const maxAttempts = 5;
      
      while (attempts < maxAttempts) {
        attempts++;
        console.log(`Attempt ${attempts}/${maxAttempts} to fetch created profile`);
        
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (profile && !profileError) {
            console.log('Profile found after registration:', profile);
            setProfile(profile);
            showSnackbar('Registration successful', 'success');
            break;
          } else if (profileError && profileError.code !== 'PGRST116') {
            console.log('Profile fetch error (will retry):', profileError);
          } else {
            console.log('Profile not found yet, retrying...');
          }
        } catch (fetchError) {
          console.log('Profile fetch attempt failed:', fetchError);
        }
        
        // Wait before next attempt
        if (attempts < maxAttempts) {
          const delay = Math.min(500 * attempts, 2000);
          console.log(`Waiting ${delay}ms before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      console.log('=== SIGN UP SUCCESS ===');
      console.log('User will be logged in automatically');
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Sign in error:', error);
      showSnackbar('Error signing in', 'error');
      throw error;
    } else {
      showSnackbar('Signed in successfully', 'success');
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) {
      console.error('Google sign in error:', error);
      showSnackbar('Error signing in with Google', 'error');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Get current path before signing out
      const currentPath = window.location.pathname;
      const isOnProfilePage = currentPath.includes('/profile') || currentPath.includes('/account');
      
      console.log('Signing out from path:', currentPath);
      console.log('Is on profile page:', isOnProfilePage);
      
      // Clear local state first
      setUser(null);
      setProfile(null);
      
      // Sign out from Supabase with scope 'global' to clear all sessions
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        console.error('Error signing out:', error);
        // Even if signOut fails, clear local storage manually
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.removeItem('supabase.auth.token');
      }
      
      // Handle redirect logic
      if (isOnProfilePage) {
        // If on profile page, redirect to home page
        console.log('Redirecting from profile page to home');
        window.location.href = '/';
      } else {
        // If on any other page, reload to stay on same page but logged out
        console.log('Reloading current page after sign out');
        window.location.reload();
      }
      
      showSnackbar('Signed out successfully', 'success');
      
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
      // Force clear everything on error and redirect to home
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    }
  };

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const isSuperAdmin = profile?.role === 'super_admin';

  const showSnackbar = (message: string, type: 'success' | 'error' | 'info') => {
    setSnackbar({ isVisible: true, message, type });
    setTimeout(() => {
      setSnackbar({ isVisible: false, message: '', type: 'info' });
    }, 3000);
  };

  const hideSnackbar = () => {
    setSnackbar({ isVisible: false, message: '', type: 'info' });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      signIn, 
      signUp, 
      signInWithGoogle, 
      signOut, 
      loading,
      isAdmin,
      isSuperAdmin,
      snackbar,
      showSnackbar,
      hideSnackbar
    }}>
      {children}
      {snackbar.isVisible && <Snackbar 
        message={snackbar.message} 
        type={snackbar.type} 
        isVisible={snackbar.isVisible}
        onClose={hideSnackbar}
      />}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
