import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { supabase } from '../../lib/supabase';
import { setAuth } from '../../store/slices/authSlice';

/**
 * Subscribes to Supabase auth state and syncs to Redux. Mount once inside Provider.
 */
export default function AuthListener() {
  const dispatch = useDispatch();

  useEffect(() => {
    let subscription;
    try {
      supabase.auth.getSession().then(({ data: { session } }) => {
        dispatch(setAuth({ session, user: session?.user ?? null }));
      }).catch((err) => {
        console.warn('Auth getSession failed:', err);
        dispatch(setAuth({ session: null, user: null }));
      });

      const result = supabase.auth.onAuthStateChange((_event, session) => {
        dispatch(setAuth({ session, user: session?.user ?? null }));
      });
      subscription = result?.data?.subscription;
    } catch (err) {
      console.warn('Auth listener init failed:', err);
      dispatch(setAuth({ session: null, user: null }));
    }
    return () => subscription?.unsubscribe?.();
  }, [dispatch]);

  return null;
}
