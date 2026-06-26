import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import ChoosePlanModal from '../components/ChoosePlanModal';

const PlanModalContext = createContext(null);

export function PlanModalProvider({ children }) {
  const [open, setOpen] = useState(false);

  const openPlanModal = useCallback(() => {
    setOpen(true);
  }, []);

  const closePlanModal = useCallback(() => {
    setOpen(false);
  }, []);

  const value = useMemo(
    () => ({ openPlanModal, closePlanModal, isPlanModalOpen: open }),
    [openPlanModal, closePlanModal, open],
  );

  return (
    <PlanModalContext.Provider value={value}>
      {children}
      <ChoosePlanModal open={open} onClose={closePlanModal} />
    </PlanModalContext.Provider>
  );
}

export function usePlanModal() {
  const ctx = useContext(PlanModalContext);
  if (!ctx) {
    throw new Error('usePlanModal must be used within PlanModalProvider (dashboard layout).');
  }
  return ctx;
}
