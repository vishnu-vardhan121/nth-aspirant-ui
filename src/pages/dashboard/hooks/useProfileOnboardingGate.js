import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../../store/hooks';
import { isAspirantProfileComplete, ONBOARDING_PATH } from '../../../lib/aspirantProfile';

/** Redirect to onboarding when profile is incomplete before gated dashboard actions. */
export function useProfileOnboardingGate() {
  const navigate = useNavigate();
  const profile = useAppSelector((state) => state.aspirant.profile);
  const profileComplete = isAspirantProfileComplete(profile);

  const goToOnboarding = useCallback(() => {
    navigate(ONBOARDING_PATH);
  }, [navigate]);

  /** @returns {boolean} true when the action may proceed */
  const requireCompleteProfile = useCallback(() => {
    if (profileComplete) return true;
    goToOnboarding();
    return false;
  }, [profileComplete, goToOnboarding]);

  return { profileComplete, goToOnboarding, requireCompleteProfile };
}
