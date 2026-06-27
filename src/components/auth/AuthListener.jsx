import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../../store/hooks';
import { store } from '../../store';
import { supabase } from '../../lib/supabase';
import { setAuth } from '../../store/slices/authSlice';
import { setTrack, setPlan } from '../../store/slices/appSlice';
import { fetchAspirantProfile, clearAspirantProfile } from '../../store/slices/aspirantSlice';
import { fetchAdminProfile, clearAdminProfile } from '../../store/slices/adminSlice';
import { fetchInterviewerProfile, clearInterviewerProfile } from '../../store/slices/interviewerSlice';

function loadUserProfiles(dispatch, userId) {
  dispatch(fetchAspirantProfile(userId));
  dispatch(fetchAdminProfile(userId));
  dispatch(fetchInterviewerProfile(userId));
}

/** Only refetch role profiles when the user actually signs in or updates account — not on tab focus token refresh. */
function shouldReloadProfiles(event) {
  if (event === 'SIGNED_IN' || event === 'USER_UPDATED') return true;
  if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') return false;

  const { aspirant, admin, interviewer } = store.getState();
  const resolved =
    !aspirant.loading && !admin.loading && !interviewer.loading;
  return !resolved;
}

/**
 * Auth: login via Supabase, then load aspirant + admin + interviewer profiles.
 * Route guards prefer staff (admin/interviewer) over a stray aspirants row.
 */
export default function AuthListener() {
  const dispatch = useDispatch();
  const aspirantProfile = useAppSelector((state) => state.aspirant.profile);
  const adminProfile = useAppSelector((state) => state.admin.profile);

  useEffect(() => {
    let subscription;
    try {
      supabase.auth.getSession().then(({ data: { session } }) => {
        dispatch(setAuth({ session, user: session?.user ?? null }));
        if (session?.user?.id) {
          loadUserProfiles(dispatch, session.user.id);
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
        // Tab focus / token refresh must not refetch profiles (unmounts dashboard modals mid-form).
        if (!shouldReloadProfiles(event)) return;
        loadUserProfiles(dispatch, session.user.id);
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

  // Sync aspirant track/plan only for non-staff users (admins may have a legacy aspirants row).
  useEffect(() => {
    const isStaff = Boolean(adminProfile);
    if (aspirantProfile && !isStaff) {
      dispatch(setTrack(aspirantProfile.track ?? null));
      dispatch(setPlan(aspirantProfile.plan ?? null));
    } else if (!aspirantProfile || isStaff) {
      dispatch(setPlan(null));
      dispatch(setTrack(null));
    }
  }, [aspirantProfile, adminProfile, dispatch]);

  return null;
}
