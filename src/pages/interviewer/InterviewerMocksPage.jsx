import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PageLoader, ButtonLoader } from '../../components/ui/Loader';

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const SCORE_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function InterviewerMocksPage() {
  const [mocks, setMocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState({
    technical_score: 5,
    communication_score: 5,
    problem_solving_score: 5,
    overall_score: 5,
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState({ type: '', text: '' });

  const showFlash = (type, text) => {
    setFlash({ type, text });
    setTimeout(() => setFlash({ type: '', text: '' }), 4000);
  };

  const loadMocks = () => {
    setLoading(true);
    supabase
      .rpc('get_interviewer_mocks', { p_status: statusFilter || null })
      .then(({ data }) => setMocks(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMocks();
  }, [statusFilter]);

  const openFeedback = (m) => {
    setFeedbackModal(m);
    setFeedbackForm({
      technical_score: 5,
      communication_score: 5,
      problem_solving_score: 5,
      overall_score: 5,
      notes: '',
    });
  };

  const submitFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackModal) return;
    setSubmitting(true);
    const { data } = await supabase.rpc('submit_mock_feedback', {
      p_registration_id: feedbackModal.id,
      p_technical_score: feedbackForm.technical_score,
      p_communication_score: feedbackForm.communication_score,
      p_problem_solving_score: feedbackForm.problem_solving_score,
      p_overall_score: feedbackForm.overall_score,
      p_notes: feedbackForm.notes || null,
    });
    setSubmitting(false);
    if (data?.ok) {
      setFeedbackModal(null);
      showFlash('success', 'Feedback submitted. Mock marked as completed.');
      loadMocks();
    } else {
      showFlash('error', data?.error ?? 'Failed to submit.');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">My Mocks</h1>
      <p className="text-sm text-slate-600">
        Conduct the mock (join via Meet link), then use &quot;Complete &amp; submit feedback&quot; to record scores and mark the mock
        as completed.
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          Status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="">All</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <button
          type="button"
          onClick={loadMocks}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Refresh
        </button>
      </div>

      {flash.text && (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            flash.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {flash.text}
        </div>
      )}

      {loading ? (
        <PageLoader size="md" label="Loading mocks…" className="py-8" />
      ) : mocks.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          No mocks in this list. Booked slots will appear here once aspirants book your slots.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Aspirant</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Scheduled</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Scores</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {mocks.map((m) => (
                <tr key={m.id} className="bg-white">
                  <td className="px-4 py-3 text-sm">
                    <span className="font-medium text-slate-900">{m.aspirant_name}</span>
                    {m.aspirant_email && <span className="block text-xs text-slate-500">{m.aspirant_email}</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{formatDateTime(m.scheduled_at)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        m.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {m.status === 'completed' ? (
                      <>T:{m.technical_score} C:{m.communication_score} P:{m.problem_solving_score} O:{m.overall_score}</>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {m.meet_link && (
                      <a href={m.meet_link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline mr-2">
                        Join
                      </a>
                    )}
                    {m.status === 'scheduled' && (
                      <button
                        type="button"
                        onClick={() => openFeedback(m)}
                        className="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                      >
                        Complete &amp; submit feedback
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {feedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Submit feedback – {feedbackModal.aspirant_name}</h2>
            <form onSubmit={submitFeedback} className="mt-4 space-y-4">
              {['technical_score', 'communication_score', 'problem_solving_score', 'overall_score'].map((key, i) => (
                <label key={key} className="block">
                  <span className="text-sm font-medium text-slate-700">
                    {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} (0–10)
                  </span>
                  <select
                    value={feedbackForm[key]}
                    onChange={(e) => setFeedbackForm((f) => ({ ...f, [key]: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {SCORE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Notes (optional)</span>
                <textarea
                  value={feedbackForm.notes}
                  onChange={(e) => setFeedbackForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? <ButtonLoader className="inline h-4 w-4 text-white" /> : 'Submit'}
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackModal(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
