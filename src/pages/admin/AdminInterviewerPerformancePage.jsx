import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { supabase } from '../../lib/supabase';
import { PageLoader } from '../../components/ui/Loader';
import { HiChartBar, HiUserGroup } from 'react-icons/hi2';

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

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatScore(value) {
  if (value == null || value === '') return '—';
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(1) : '—';
}

export default function AdminInterviewerPerformancePage() {
  const adminProfile = useAppSelector((state) => state.admin.profile);
  const isSuperAdmin = adminProfile?.role === 'super admin';

  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(defaultToDate);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_admin_interviewer_stats', {
      p_from_date: fromDate || null,
      p_to_date: toDate || null,
    });
    if (!error && data && typeof data === 'object') {
      setReport(data);
    } else {
      setReport({ interviewers: [] });
    }
    setLoading(false);
  }, [fromDate, toDate]);

  useEffect(() => {
    if (isSuperAdmin) fetchReport();
  }, [fetchReport, isSuperAdmin]);

  if (!isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (loading && !report) {
    return <PageLoader />;
  }

  const rows = Array.isArray(report?.interviewers) ? report.interviewers : [];
  const totalCompleted = rows.reduce((sum, r) => sum + (r.completed_count ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <HiChartBar className="w-7 h-7 text-indigo-600" />
          Interviewer performance
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Compare mock activity and average scores across all interviewers. Super admin only.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <HiUserGroup className="w-4 h-4" />
            Interviewers
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{rows.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Completed (range)</p>
          <p className="mt-1 text-2xl font-bold text-indigo-600">{totalCompleted}</p>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/80">
          <h2 className="text-lg font-semibold text-slate-900">Stats by interviewer</h2>
          <p className="text-sm text-slate-600 mt-0.5">Filter by completed / scheduled date in range.</p>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap items-end gap-4 mb-4">
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
              onClick={fetchReport}
              disabled={loading}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? 'Loading…' : 'Apply'}
            </button>
            {report?.from_date && report?.to_date && (
              <p className="text-xs text-slate-500 pb-2">
                {formatDate(report.from_date)} – {formatDate(report.to_date)}
              </p>
            )}
          </div>

          <div className="overflow-auto max-h-[520px] rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm min-w-[900px]">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-4 py-2.5 font-semibold text-slate-700">Interviewer</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-700 text-right">Completed</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-700 text-right">Scheduled</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-700 text-right">No-show</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-700 text-right">Cancelled</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-700 text-right">Avg overall</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-700 text-right">Avg comm.</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-700 text-right">Avg technical</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-700">Last completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                      No interviewers or no activity in this range.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.interviewer_id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-slate-900">{row.interviewer_name ?? '—'}</p>
                        <p className="text-xs text-slate-500">{row.interviewer_email ?? ''}</p>
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-indigo-600">
                        {row.completed_count ?? 0}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{row.scheduled_count ?? 0}</td>
                      <td className="px-4 py-2.5 text-right text-amber-700">{row.no_show_count ?? 0}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{row.cancelled_count ?? 0}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">
                        {formatScore(row.avg_overall_score)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600">
                        {formatScore(row.avg_communication_score)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600">
                        {formatScore(row.avg_technical_score)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                        {formatDateTime(row.last_completed_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
