import { useAppSelector } from '../../store/hooks';

export default function InterviewerOverviewPage() {
  const interviewer = useAppSelector((state) => state.interviewer.profile);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-600">
          Welcome, <span className="font-semibold text-slate-900">{interviewer?.name ?? interviewer?.email}</span>.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Use <strong>My Slots</strong> to see your availability and booked applications. Use <strong>My Mocks</strong> to
          conduct interviews and submit feedback (scores). When you submit feedback, the mock is marked completed and
          the aspirant sees their results.
        </p>
      </div>
    </div>
  );
}
