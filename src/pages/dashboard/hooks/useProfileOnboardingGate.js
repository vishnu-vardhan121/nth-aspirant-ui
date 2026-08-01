import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../../store/hooks';
import { isAspirantProfileComplete, getCompleteProfilePath } from '../../../lib/aspirantProfile';

/** Redirect to profile completion when incomplete before gated dashboard actions. */
export function useProfileOnboardingGate() {
  const navigate = useNavigate();
  const profile = useAppSelector((state) => state.aspirant.profile);
  const profileComplete = isAspirantProfileComplete(profile);

  const goToOnboarding = useCallback(() => {
    navigate(getCompleteProfilePath(profile));
  }, [navigate, profile]);

  /** @returns {boolean} true when the action may proceed */
  const requireCompleteProfile = useCallback(() => {
    if (profileComplete) return true;
    goToOnboarding();
    return false;
  }, [profileComplete, goToOnboarding]);

  return { profileComplete, goToOnboarding, requireCompleteProfile };
}
