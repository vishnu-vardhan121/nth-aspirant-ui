import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PageLoader } from '../../components/ui/Loader';
import MockFeedbackModal, { createEmptyMockFeedbackForm } from '../../components/mock/MockFeedbackModal';
import { formatFeedbackSummary, submitMockFeedback } from '../../lib/mockFeedback';

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function mockSortTime(m) {
  const t = m.completed_at || m.scheduled_at || m.created_at;
  return t ? new Date(t).getTime() : 0;
}

function sortMocksLatestFirst(list, statusFilter) {
  const rows = [...list];
  if (statusFilter === 'scheduled') {
    return rows.sort((a, b) => mockSortTime(a) - mockSortTime(b));
  }
  return rows.sort((a, b) => mockSortTime(b) - mockSortTime(a));
}

export default function InterviewerMocksPage() {
  const [mocks, setMocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState(() => createEmptyMockFeedbackForm());
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
      .then(({ data }) => setMocks(sortMocksLatestFirst(Array.isArray(data) ? data : [], statusFilter)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMocks();
  }, [statusFilter]);

  const openFeedback = (m) => {
    setFeedbackModal(m);
    setFeedbackForm(createEmptyMockFeedbackForm());
  };

  const submitFeedback = async (form) => {
    if (!feedbackModal) return;
    setSubmitting(true);
    const result = await submitMockFeedback(supabase, feedbackModal.id, form);
    setSubmitting(false);
    if (result?.ok) {
      setFeedbackModal(null);
      showFlash('success', 'Feedback submitted. Mock marked as completed.');
      loadMocks();
    } else {
      showFlash('error', result?.error ?? 'Failed to submit.');
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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Feedback</th>
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
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-xs">
                    {m.status === 'completed' ? formatFeedbackSummary(m) : '—'}
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

      <MockFeedbackModal
        open={!!feedbackModal}
        registration={feedbackModal}
        value={feedbackForm}
        onChange={setFeedbackForm}
        onSubmit={submitFeedback}
        submitting={submitting}
        onClose={() => setFeedbackModal(null)}
        title="Submit mock feedback"
        submitLabel="Submit & mark completed"
      />
    </div>
  );
}
