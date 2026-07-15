import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageLoader } from '../../../../components/ui/Loader';
import { supabase } from '../../../../lib/supabase';
import { usePlanModal } from '../../subscription';
import { getTrackById, isValidTrackId } from '../lib/tracks';
import { useAiPracticeProgress } from '../hooks/useAiPracticeProgress';
import LevelProgressRow from './components/LevelProgressRow';

export default function AiPracticeTrackPage() {
  const { trackId } = useParams();
  const navigate = useNavigate();
  const { openPlanModal } = usePlanModal();
  const track = getTrackById(trackId);
  const valid = isValidTrackId(trackId);

  const {
    loading,
    error,
    subscriptionActive,
    levels,
    trackCompleted,
    refresh,
  } = useAiPracticeProgress(valid ? trackId : null);

  const [startingLevel, setStartingLevel] = useState(null);
  const [startError, setStartError] = useState('');

  const handleStart = async (level) => {
    setStartError('');
    if (!subscriptionActive) {
      openPlanModal();
      return;
    }
    setStartingLevel(level);
    const { data, error: rpcError } = await supabase.rpc('start_ai_practice_session', {
      p_track: trackId,
      p_level: level,
    });
    setStartingLevel(null);

    if (rpcError || !data?.ok) {
      setStartError(data?.error || rpcError?.message || 'Could not start session');
      await refresh();
      return;
    }

    navigate(`/dashboard/ai-practice/${trackId}/session/${data.session_id}`);
  };

  if (!valid || !track) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-slate-700">Track not found.</p>
        <Link to="/dashboard/ai-practice" className="mt-3 inline-block text-sm font-semibold text-indigo-700">
          Back to AI Practice
        </Link>
      </div>
    );
  }

  if (loading) {
    return <PageLoader size="md" label="Loading track…" className="py-12" />;
  }

  const orderedLevels = [1, 2, 3].map((lvl) => {
    const found = levels.find((l) => Number(l.level) === lvl);
    return found || { level: lvl, status: lvl === 1 ? 'available' : 'locked', attempts: 0 };
  });

  return (
    <div>
      <div className="mb-6">
        <Link to="/dashboard/ai-practice" className="text-sm font-medium text-indigo-700 hover:underline">
          ← All tracks
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">{track.label}</h1>
          {trackCompleted ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              Track completed
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-slate-600">
          Clear each level with 70%+ to unlock the next. Unlimited retries.
        </p>
      </div>

      {!subscriptionActive ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Active subscription required.{' '}
          <button type="button" onClick={() => openPlanModal()} className="font-semibold underline">
            View plans
          </button>
        </div>
      ) : null}

      {(error || startError) ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {startError || error}
        </div>
      ) : null}

      <div className="space-y-3">
        {orderedLevels.map((row) => (
          <LevelProgressRow
            key={row.level}
            levelRow={row}
            starting={startingLevel === row.level}
            onStart={handleStart}
            subscriptionActive={subscriptionActive}
          />
        ))}
      </div>
    </div>
  );
}
