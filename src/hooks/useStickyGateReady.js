import { useEffect, useState } from 'react';

/**
 * Once a loading gate has cleared, keep showing children even if loading flickers
 * again (background auth/profile refresh). Prevents modals/forms from unmounting.
 */
export function useStickyGateReady(loading) {
  const [hasBeenReady, setHasBeenReady] = useState(!loading);

  useEffect(() => {
    if (!loading) setHasBeenReady(true);
  }, [loading]);

  return hasBeenReady;
}
