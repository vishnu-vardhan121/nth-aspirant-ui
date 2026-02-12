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
    supabase.auth.getSession().then(({ data: { session } }) => {
      dispatch(setAuth({ session, user: session?.user ?? null }));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch(setAuth({ session, user: session?.user ?? null }));
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  return null;
}
