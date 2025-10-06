import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingState {
  showWelcome: boolean;
  showPersonalInfo: boolean;
  user: any;
  profile: any;
}

export const useOnboarding = () => {
  const [state, setState] = useState<OnboardingState>({
    showWelcome: false,
    showPersonalInfo: false,
    user: null,
    profile: null,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndOnboarding();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await handleUserSignIn(session.user);
        } else if (event === 'SIGNED_OUT') {
          resetOnboardingState();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkAuthAndOnboarding = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        await handleUserSignIn(session.user);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      setLoading(false);
    }
  };

  const handleUserSignIn = async (user: any) => {
    try {
      // Check if user has profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        setLoading(false);
        return;
      }

      // Create profile if it doesn't exist
      if (!profile) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || '',
            onboarding_completed: false,
            welcome_shown: false,
          });

        if (insertError) {
          console.error('Error creating profile:', insertError);
        }
      }

      const currentProfile = profile || {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || '',
        onboarding_completed: false,
        welcome_shown: false,
      };

      // Check onboarding status
      const welcomeShown = await checkWelcomeShown(user.id);
      const onboardingDismissed = await checkOnboardingDismissed(user.id);

      setState({
        user,
        profile: currentProfile,
        showWelcome: !welcomeShown && !currentProfile.welcome_shown,
        showPersonalInfo: false,
      });

      // If onboarding was dismissed, don't show anything
      if (onboardingDismissed || currentProfile.onboarding_completed) {
        setState(prev => ({
          ...prev,
          showWelcome: false,
          showPersonalInfo: false,
        }));
      }

    } catch (error) {
      console.error('Error handling user sign in:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkWelcomeShown = async (userId: string): Promise<boolean> => {
    try {
      const key = `welcome_shown_${userId}`;
      const shown = await AsyncStorage.getItem(key);
      return shown === 'true';
    } catch (error) {
      console.error('Error checking welcome shown:', error);
      return false;
    }
  };

  const checkOnboardingDismissed = async (userId: string): Promise<boolean> => {
    try {
      const key = `onboarding_dismissed_${userId}`;
      const dismissed = await AsyncStorage.getItem(key);
      return dismissed === 'true';
    } catch (error) {
      console.error('Error checking onboarding dismissed:', error);
      return false;
    }
  };

  const completeWelcome = async () => {
    if (state.user) {
      try {
        await AsyncStorage.setItem(`welcome_shown_${state.user.id}`, 'true');
        
        // Update profile in database
        await supabase
          .from('profiles')
          .update({ welcome_shown: true })
          .eq('id', state.user.id);

        setState(prev => ({
          ...prev,
          showWelcome: false,
          showPersonalInfo: true,
        }));
      } catch (error) {
        console.error('Error completing welcome:', error);
      }
    }
  };

  const closePersonalInfo = () => {
    setState(prev => ({
      ...prev,
      showPersonalInfo: false,
    }));
  };

  const resetOnboardingState = () => {
    setState({
      showWelcome: false,
      showPersonalInfo: false,
      user: null,
      profile: null,
    });
    setLoading(false);
  };

  const refreshProfile = async () => {
    if (state.user) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', state.user.id)
          .single();

        if (profile) {
          setState(prev => ({
            ...prev,
            profile,
          }));
        }
      } catch (error) {
        console.error('Error refreshing profile:', error);
      }
    }
  };

  return {
    ...state,
    loading,
    completeWelcome,
    closePersonalInfo,
    refreshProfile,
  };
};
