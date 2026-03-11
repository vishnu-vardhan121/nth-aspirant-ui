import { useState, useEffect } from 'react';
import { useAppSelector } from '../../store/hooks';
import { supabase } from '../../lib/supabase';

export default function InterviewerOverviewPage() {
  const interviewer = useAppSelector((state) => state.interviewer.profile);
  const [mockStats, setMockStats] = useState({ total: 0, completed: 0 });

  useEffect(() => {
    supabase.rpc('get_interviewer_mocks', { p_status: null }).then(({ data }) => {
      const list = Array.isArray(data) ? data : [];
      const completed = list.filter((m) => m.status === 'completed').length;
      setMockStats({ total: list.length, completed });
    });
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-600">
          Welcome, <span className="font-semibold text-slate-900">{interviewer?.name ?? interviewer?.email}</span>.
        </p>
        <p className="mt-3 text-sm font-medium text-slate-700">
          Mocks: <span className="text-indigo-600">{mockStats.completed} out of {mockStats.total}</span> completed
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Use <strong>My Slots</strong> to see your availability and booked mocks. Use <strong>My Mocks</strong> to
          conduct interviews and submit feedback (scores). When you submit feedback, the mock is marked completed and
          the aspirant sees their results.
        </p>
      </div>
    </div>
  );
}
