import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthChange, syncLocalMirror, clearLocalMirror } from '../services/api';

/**
 * Keeps the localStorage session mirror (rm_auth / rm_onboarded) in step with
 * the real Supabase session — e.g. after a Google redirect, after a token
 * refresh fails, or when the user signs out in another tab. In demo mode
 * onAuthChange is a no-op.
 *
 * The work is deferred with setTimeout: supabase-js can deadlock if you call
 * back into it from inside an onAuthStateChange callback.
 */
export default function AuthSync() {
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthChange((event, session) => {
      setTimeout(async () => {
        if (event === 'SIGNED_OUT') {
          clearLocalMirror();
          navigate('/login', { replace: true });
        } else if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          const { onboarded } = await syncLocalMirror(session.user);
          // Returning from Google while sitting on the login screen: move on.
          if (window.location.pathname === '/login') {
            navigate(onboarded ? '/home' : '/onboarding', { replace: true });
          }
        }
      }, 0);
    });
    return unsubscribe;
  }, [navigate]);

  return null;
}