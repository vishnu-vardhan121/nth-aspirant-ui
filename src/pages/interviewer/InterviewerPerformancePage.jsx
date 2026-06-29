import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { PageLoader } from '../../components/ui/Loader';
import {
  HiAcademicCap,
  HiCalendarDays,
  HiCheckCircle,
  HiXCircle,
  HiClock,
  HiChartBar,
} from 'react-icons/hi2';

function defaultFromDate() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function defaultToDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatScore(value) {
  if (value == null || value === '') return '—';
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(1) : '—';
}

function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${accent ?? 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

export default function InterviewerPerformancePage() {
  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(defaultToDate);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_interviewer_performance', {
      p_from_date: fromDate || null,
      p_to_date: toDate || null,
    });
    if (!error && data && typeof data === 'object') {
      setStats(data);
    } else {
      setStats(null);
    }
    setLoading(false);
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading && !stats) {
    return <PageLoader />;
  }

  const completed = stats?.completed_count ?? 0;
  const noShow = stats?.no_show_count ?? 0;
  const completionDenom = completed + noShow;
  const completionRate =
    completionDenom > 0 ? `${Math.round((completed / completionDenom) * 100)}%` : '—';
  const recent = Array.isArray(stats?.recent_completed) ? stats.recent_completed : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My performance</h1>
        <p className="mt-1 text-sm text-slate-600">
          Mocks you conducted and feedback scores for the selected date range.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
            />
          </div>
          <button
            type="button"
            onClick={fetchStats}
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? 'Loading…' : 'Apply'}
          </button>
          {stats?.from_date && stats?.to_date && (
            <p className="text-xs text-slate-500 pb-2">
              Showing {formatDate(stats.from_date)} – {formatDate(stats.to_date)}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard label="Completed" value={completed} icon={HiCheckCircle} accent="text-indigo-600" />
        <StatCard label="Scheduled" value={stats?.scheduled_count ?? 0} icon={HiCalendarDays} />
        <StatCard label="No-show" value={noShow} icon={HiXCircle} accent="text-amber-600" />
        <StatCard label="Cancelled" value={stats?.cancelled_count ?? 0} icon={HiClock} />
        <StatCard label="Avg overall" value={formatScore(stats?.avg_overall_score)} icon={HiChartBar} />
        <StatCard label="Avg communication" value={formatScore(stats?.avg_communication_score)} icon={HiChartBar} />
        <StatCard label="Avg technical" value={formatScore(stats?.avg_technical_score)} icon={HiChartBar} />
        <StatCard label="Completion rate" value={completionRate} icon={HiAcademicCap} />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/80">
          <h2 className="text-lg font-semibold text-slate-900">Recent completed mocks</h2>
          <p className="text-sm text-slate-600 mt-0.5">Up to 25 mocks in this date range.</p>
        </div>
        <div className="overflow-auto max-h-[420px]">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="px-4 py-2.5 font-semibold text-slate-700">Date</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700">Aspirant</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700">Overall</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700">Communication</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700">Technical</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No completed mocks in this range.
                  </td>
                </tr>
              ) : (
                recent.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                      {formatDate(row.completed_at ?? row.scheduled_at)}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-900">
                      {row.aspirant_name ?? row.aspirant_email ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{formatScore(row.overall_score)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{formatScore(row.communication_score)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{formatScore(row.technical_score)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
