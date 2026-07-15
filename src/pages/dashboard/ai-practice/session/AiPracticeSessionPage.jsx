import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageLoader } from '../../../../components/ui/Loader';
import { supabase } from '../../../../lib/supabase';
import { getLevelMeta, getTrackById, isValidLevel, isValidTrackId } from '../lib/tracks';
import { getSessionTiming } from '../lib/sessionTiming';
import { evaluatePracticeSession } from '../lib/api';
import GeminiLiveSession from './components/GeminiLiveSession';
import EvaluatingOverlay from './components/EvaluatingOverlay';
import PracticeResult from './components/PracticeResult';

export default function AiPracticeSessionPage() {
  const { trackId, sessionId } = useParams();
  const navigate = useNavigate();

  const track = getTrackById(trackId);
  const [phase, setPhase] = useState('loading'); // loading | live | evaluating | result | error
  const [error, setError] = useState('');
  const [liveTiming, setLiveTiming] = useState(null);
  const [level, setLevel] = useState(null);
  const [result, setResult] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [bootKey, setBootKey] = useState(0);
  const liveTimingRef = useRef(null);

  const validParams = isValidTrackId(trackId) && Boolean(sessionId);

  useEffect(() => {
    liveTimingRef.current = liveTiming;
  }, [liveTiming]);

  useEffect(() => {
    if (!validParams) {
      setError('Invalid session link');
      setPhase('error');
      return undefined;
    }

    let cancelled = false;

    (async () => {
      if (liveTimingRef.current) {
        setPhase('live');
        return;
      }

      setPhase('loading');
      setError('');
      setResult(null);

      const { data: session, error: sessionError } = await supabase
        .from('ai_practice_sessions')
        .select('id, track, level, status')
        .eq('id', sessionId)
        .maybeSingle();

      if (cancelled) return;

      if (sessionError || !session) {
        setError(sessionError?.message || 'Session not found');
        setPhase('error');
        return;
      }

      if (String(session.track).toLowerCase() !== String(trackId).toLowerCase()) {
        setError('Session does not match this track');
        setPhase('error');
        return;
      }

      if (!isValidLevel(session.level)) {
        setError('Invalid session level');
        setPhase('error');
        return;
      }

      setLevel(Number(session.level));

      if (session.status === 'completed') {
        const { data: full } = await supabase
          .from('ai_practice_sessions')
          .select('overall_percent, passed, area_scores')
          .eq('id', sessionId)
          .maybeSingle();
        if (cancelled) return;
        setResult({
          overall_percent: full?.overall_percent ?? null,
          passed: Boolean(full?.passed),
          areas: Array.isArray(full?.area_scores) ? full.area_scores : [],
          unlocked_level: null,
          track_completed: false,
        });
        setPhase('result');
        return;
      }

      if (session.status === 'evaluating') {
        setPhase('evaluating');
        const evalRes = await evaluatePracticeSession(sessionId);
        if (cancelled) return;
        if (!evalRes.ok) {
          setError(evalRes.error);
          setPhase('error');
          return;
        }
        setResult(evalRes);
        setPhase('result');
        return;
      }

      if (session.status !== 'in_progress') {
        setError(`Session is ${session.status} and cannot be continued`);
        setPhase('error');
        return;
      }

      const timing = getSessionTiming(session.level);
      const nextTiming = {
        minMs: timing?.minMs ?? 0,
        maxMs: timing?.maxMs ?? 0,
      };
      liveTimingRef.current = nextTiming;
      setLiveTiming(nextTiming);
      setPhase('live');
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, trackId, validParams, bootKey]);

  const handleSessionEnd = async ({ transcript, durationSeconds }) => {
    setPhase('evaluating');
    setError('');

    const { data, error: completeError } = await supabase.rpc('complete_ai_practice_session', {
      p_session_id: sessionId,
      p_transcript: transcript || '',
      p_duration_seconds: durationSeconds ?? null,
    });

    if (completeError || !data?.ok) {
      setError(data?.error || completeError?.message || 'Failed to save transcript');
      setPhase('error');
      return;
    }

    const evalRes = await evaluatePracticeSession(sessionId);
    if (!evalRes.ok) {
      setError(evalRes.error);
      setPhase('error');
      return;
    }

    setResult(evalRes);
    setPhase('result');
  };

  const handleRetry = async () => {
    if (!level) return;
    setRetrying(true);
    setError('');
    const { data, error: rpcError } = await supabase.rpc('start_ai_practice_session', {
      p_track: trackId,
      p_level: level,
    });
    setRetrying(false);
    if (rpcError || !data?.ok) {
      setError(data?.error || rpcError?.message || 'Could not start a new session');
      return;
    }
    navigate(`/dashboard/ai-practice/${trackId}/session/${data.session_id}`, { replace: true });
  };

  const handleBootRetry = () => {
    liveTimingRef.current = null;
    setLiveTiming(null);
    setBootKey((k) => k + 1);
  };

  if (!validParams || !track) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-slate-700">Invalid AI Practice session.</p>
        <Link to="/dashboard/ai-practice" className="mt-3 inline-block text-sm font-semibold text-indigo-700">
          Back to AI Practice
        </Link>
      </div>
    );
  }

  const levelMeta = getLevelMeta(level);
  const title = `${track.label} · Level ${level ?? '—'} — ${levelMeta?.label || ''}`;

  if (phase === 'loading') {
    return <PageLoader size="md" label="Preparing session…" className="py-12" />;
  }

  if (phase === 'error') {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6">
        <h1 className="text-lg font-semibold text-red-900">Could not run session</h1>
        <p className="mt-2 text-sm text-red-800">{error || 'Unknown error'}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleBootRetry}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Try again
          </button>
          <Link
            to={`/dashboard/ai-practice/${trackId}`}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
          >
            Back to track
          </Link>
        </div>
      </div>
    );
  }

  if (phase === 'result' && result) {
    return (
      <div>
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {retrying ? <PageLoader size="sm" label="Starting new session…" className="py-6" /> : null}
        <PracticeResult
          trackId={trackId}
          trackLabel={track.label}
          level={level}
          levelLabel={levelMeta?.label || ''}
          result={result}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  return (
    <div>
      <EvaluatingOverlay visible={phase === 'evaluating'} />
      {phase === 'live' && liveTiming ? (
        <GeminiLiveSession
          sessionId={sessionId}
          minMs={liveTiming.minMs}
          maxMs={liveTiming.maxMs}
          title={title}
          onSessionEnd={handleSessionEnd}
        />
      ) : null}
      {phase === 'evaluating' && !liveTiming ? (
        <PageLoader size="md" label="Evaluating…" className="py-12" />
      ) : null}
    </div>
  );
}
