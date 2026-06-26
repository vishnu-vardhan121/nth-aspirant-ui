import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../../store/hooks';
import { supabase } from '../../lib/supabase';
import { setAuth } from '../../store/slices/authSlice';
import { setTrack, setPlan } from '../../store/slices/appSlice';
import { fetchAspirantProfile, clearAspirantProfile } from '../../store/slices/aspirantSlice';
import { fetchAdminProfile, clearAdminProfile } from '../../store/slices/adminSlice';
import { fetchInterviewerProfile, clearInterviewerProfile } from '../../store/slices/interviewerSlice';

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
          dispatch(clearInterviewerProfile());
          dispatch(setPlan(null));
          dispatch(setTrack(null));
        }
      }).catch((err) => {
        console.warn('Auth getSession failed:', err);
        dispatch(setAuth({ session: null, user: null }));
        dispatch(clearAspirantProfile());
        dispatch(clearAdminProfile());
        dispatch(clearInterviewerProfile());
      });

      const result = supabase.auth.onAuthStateChange((event, session) => {
        dispatch(setAuth({ session, user: session?.user ?? null }));
        if (!session?.user?.id) {
          dispatch(clearAspirantProfile());
          dispatch(clearAdminProfile());
          dispatch(clearInterviewerProfile());
          dispatch(setPlan(null));
          dispatch(setTrack(null));
          return;
        }
        // TOKEN_REFRESHED fires when tab regains focus / background refresh. Refetching
        // profile sets aspirant/admin loading=true → Require* wrappers show full-page
        // loader and feels like a reload. Session is already updated above; skip refetch.
        if (event === 'TOKEN_REFRESHED') return;
        dispatch(fetchAspirantProfile(session.user.id));
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

  // When aspirant is done and null, fetch admin and interviewer (so admin/interviewer users get their profile)
  useEffect(() => {
    if (!user?.id || aspirantLoading || aspirantProfile) return;
    dispatch(fetchAdminProfile(user.id));
    dispatch(fetchInterviewerProfile(user.id));
  }, [user?.id, aspirantLoading, aspirantProfile, dispatch]);

  // Sync aspirant track/plan from profile to app slice (clear when null — no default "base")
  useEffect(() => {
    if (aspirantProfile) {
      dispatch(setTrack(aspirantProfile.track ?? null));
      dispatch(setPlan(aspirantProfile.plan ?? null));
    }
  }, [aspirantProfile, dispatch]);

  return null;
}
