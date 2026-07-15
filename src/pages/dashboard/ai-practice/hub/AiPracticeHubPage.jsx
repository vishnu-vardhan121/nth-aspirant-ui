import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageLoader } from '../../../../components/ui/Loader';
import { usePlanModal } from '../../subscription';
import { AI_PRACTICE_CATEGORIES, getTracksByCategory } from '../lib/tracks';
import { useAiPracticeProgress } from '../hooks/useAiPracticeProgress';
import CategoryTabs from './components/CategoryTabs';
import TrackCard from './components/TrackCard';

export default function AiPracticeHubPage() {
  const { openPlanModal } = usePlanModal();
  const { loading, error, subscriptionActive, tracks } = useAiPracticeProgress(null);
  const [categoryId, setCategoryId] = useState('technical');

  const progressByTrack = useMemo(() => {
    const map = {};
    for (const row of tracks) {
      map[row.track] = {
        passedCount: row.passed_count ?? 0,
        trackCompleted: Boolean(row.track_completed),
      };
    }
    return map;
  }, [tracks]);

  const visibleTracks = getTracksByCategory(categoryId);

  if (loading) {
    return <PageLoader size="md" label="Loading AI Practice…" className="py-12" />;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">AI Practice</h1>
        <p className="mt-1 text-slate-600">
          Role-based voice practice. Clear Basic → Medium → Hard (70%+) to complete a track.
        </p>
      </div>

      {!subscriptionActive ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
          <p className="font-semibold text-amber-950">Paid plan required</p>
          <p className="mt-1 text-sm text-amber-900">
            AI Practice is available for active subscribers. Choose a plan to unlock unlimited practice.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openPlanModal()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              View plans
            </button>
            <Link
              to="/dashboard/payments"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              My payments
            </Link>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <CategoryTabs
        categories={AI_PRACTICE_CATEGORIES}
        activeId={categoryId}
        onChange={setCategoryId}
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibleTracks.map((track) => {
          const progress = progressByTrack[track.id] || { passedCount: 0, trackCompleted: false };
          return (
            <TrackCard
              key={track.id}
              track={track}
              passedCount={progress.passedCount}
              trackCompleted={progress.trackCompleted}
            />
          );
        })}
      </div>
    </div>
  );
}
