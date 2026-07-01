import { HiSparkles } from 'react-icons/hi2';

/** Shown when interviewer marked the aspirant placement-ready after a mock. */
export default function PlacementReadyBanner({ profile }) {
  const placed = profile?.profile_status === 'inactive';
  const ready = profile?.placement_pipeline_status === 'ready';

  if (!ready || placed) return null;

  return (
    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 shadow-sm">
      <p className="flex items-center gap-2 font-semibold">
        <HiSparkles className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
        You are placement-ready
      </p>
      <p className="mt-1.5 leading-relaxed text-emerald-900/90">
        Based on your latest mock interview, you have been moved to our placement-ready pool. Our team will reach out
        with suitable opportunities.
      </p>
    </div>
  );
}
