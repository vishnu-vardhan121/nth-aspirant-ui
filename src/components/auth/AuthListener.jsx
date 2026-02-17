import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../../store/hooks';
import { supabase } from '../../lib/supabase';
import { setAuth } from '../../store/slices/authSlice';
import { setTrack, setPlan } from '../../store/slices/appSlice';
import { fetchAspirantProfile, clearAspirantProfile } from '../../store/slices/aspirantSlice';
import { fetchAdminProfile, clearAdminProfile } from '../../store/slices/adminSlice';

/**
 * Auth: login via Supabase. Then fetch aspirant; if no aspirant, fetch admin.
 * Aspirant → aspirant dashboard. Admin → admin panel.
 */
export default function AuthListener() {
  const dispatch = useDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const aspirantLoading = useAppSelector((state) => state.aspirant.loading);
  const aspirantProfile = useAppSelector((state) => state.aspirant.profile);

  useEffect(() => {
    let subscription;
    try {
      supabase.auth.getSession().then(({ data: { session } }) => {
        dispatch(setAuth({ session, user: session?.user ?? null }));
        if (session?.user?.id) {
          dispatch(fetchAspirantProfile(session.user.id));
        } else {
          dispatch(clearAspirantProfile());
          dispatch(clearAdminProfile());
        }
      }).catch((err) => {
        console.warn('Auth getSession failed:', err);
        dispatch(setAuth({ session: null, user: null }));
        dispatch(clearAspirantProfile());
        dispatch(clearAdminProfile());
      });

      const result = supabase.auth.onAuthStateChange((_event, session) => {
        dispatch(setAuth({ session, user: session?.user ?? null }));
        if (session?.user?.id) {
          dispatch(fetchAspirantProfile(session.user.id));
        } else {
          dispatch(clearAspirantProfile());
          dispatch(clearAdminProfile());
        }
      });
      subscription = result?.data?.subscription;
    } catch (err) {
      console.warn('Auth listener init failed:', err);
      dispatch(setAuth({ session: null, user: null }));
      dispatch(clearAspirantProfile());
      dispatch(clearAdminProfile());
    }
    return () => subscription?.unsubscribe?.();
  }, [dispatch]);

  // When aspirant is done and null, fetch admin (so admin users get their profile)
  useEffect(() => {
    if (!user?.id || aspirantLoading || aspirantProfile) return;
    dispatch(fetchAdminProfile(user.id));
  }, [user?.id, aspirantLoading, aspirantProfile, dispatch]);

  // Sync aspirant track/plan from profile to app slice (for jobs visibility)
  useEffect(() => {
    if (aspirantProfile) {
      if (aspirantProfile.track) dispatch(setTrack(aspirantProfile.track));
      if (aspirantProfile.plan) dispatch(setPlan(aspirantProfile.plan));
    }
  }, [aspirantProfile?.track, aspirantProfile?.plan, dispatch]);

  return null;
}
