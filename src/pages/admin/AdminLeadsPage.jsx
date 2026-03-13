import { useState, useEffect } from 'react';
import { HiXMark } from 'react-icons/hi2';
import { supabase } from '../../lib/supabase';
import { PageLoader } from '../../components/ui/Loader';
import CreateAspirantModal from './CreateAspirantModal';

const LEAD_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'converted', label: 'Converted' },
  { value: 'rejected', label: 'Rejected' },
];

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function leadToInitialValues(row) {
  const plan = (row.plan_id || 'base').toLowerCase();
  return {
    full_name: row.name ?? '',
    email: row.email ?? '',
    password: '',
    track: row.track === 'experienced' ? 'experienced' : 'fresher',
    plan: ['base', 'silver', 'gold'].includes(plan) ? plan : 'base',
    phone: row.contact_number ?? '',
    city: '',
  };
}

function statusBadgeClass(status) {
  if (status === 'converted') return 'bg-emerald-100 text-emerald-700';
  if (status === 'contacted') return 'bg-amber-100 text-amber-700';
  if (status === 'rejected') return 'bg-slate-100 text-slate-600';
  return 'bg-sky-100 text-sky-700';
}

function DetailRow({ label, value }) {
  if (value === null || value === undefined || value === '') value = '—';
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-3 py-2 border-b border-slate-100 last:border-0">
      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-slate-900 break-words whitespace-pre-wrap">{value}</dd>
    </div>
  );
}

function LeadDetailModal({ lead, onClose, onSuccess, onCreateAspirant }) {
  const [status, setStatus] = useState(lead?.status || 'new');
  const [adminNotes, setAdminNotes] = useState(lead?.admin_notes ?? '');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (lead) {
      setStatus(lead.status || 'new');
      setAdminNotes(lead.admin_notes ?? '');
      setMessage({ type: '', text: '' });
    }
  }, [lead?.id]);

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!lead) return;
    setMessage({ type: '', text: '' });
    setSubmitting(true);
    const { data, error } = await supabase.rpc('update_pricing_lead_status', {
      p_lead_id: lead.id,
      p_status: status,
      p_admin_notes: adminNotes || null,
    });
    setSubmitting(false);
    const result = typeof data === 'string' ? JSON.parse(data) : data;
    if (error || !result?.ok) {
      setMessage({ type: 'error', text: result?.error || error?.message || 'Failed to update.' });
      return;
    }
    onSuccess?.();
  };

  if (!lead) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] rounded-xl bg-white border border-slate-200 shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-200">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900 truncate">{lead.email}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{formatDate(lead.created_at)}</p>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close">
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
          <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 mb-4">
            <DetailRow label="Plan" value={lead.plan_id} />
            <DetailRow label="Track" value={lead.track} />
            <DetailRow label="Name" value={lead.name} />
            <DetailRow label="Looking for role" value={lead.looking_for_role} />
            <DetailRow label="Contact" value={lead.contact_number} />
            <DetailRow label="Graduation" value={lead.graduation_pass} />
            <DetailRow label="Company" value={lead.current_company} />
            <DetailRow label="Experience" value={lead.experience_years} />
            <DetailRow label="CTC" value={lead.current_ctc} />
            <DetailRow label="Message" value={lead.message} />
          </div>

          <form onSubmit={handleSaveStatus} className="space-y-3">
            {message.text && (
              <p className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message.text}</p>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                {LEAD_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Admin notes</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm min-h-[80px]"
                placeholder="Payment received, follow-up, etc."
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? 'Saving…' : 'Save status / notes'}
              </button>
              <button
                type="button"
                onClick={() => onCreateAspirant?.(lead)}
                className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100"
              >
                Create aspirant
              </button>
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">
                Close
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [createFromLead, setCreateFromLead] = useState(null);

  const loadLeads = async () => {
    const { data } = await supabase.rpc('get_admin_pricing_leads');
    const list = Array.isArray(data) ? data : [];
    setLeads(list);
    setLoading(false);
    setSelectedLead((prev) => (prev ? list.find((l) => l.id === prev.id) ?? prev : null));
  };

  useEffect(() => { loadLeads(); }, []);

  if (loading) return <PageLoader size="md" label="Loading leads…" className="py-12" />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Pricing leads</h1>
      <p className="text-slate-600 text-sm mb-6">
        Leads from the pricing page. Click a row to view full details, update status, or create an aspirant.
      </p>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700">Date</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Plan / track</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Name</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Email</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Contact</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No leads yet.
                  </td>
                </tr>
              ) : (
                leads.map((row) => (
                  <tr
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedLead(row)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedLead(row);
                      }
                    }}
                    className="border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(row.created_at)}</td>
                    <td className="px-4 py-3 text-slate-900">
                      <span className="font-medium">{row.plan_id}</span>
                      <span className="text-slate-400 mx-1">·</span>
                      <span className="text-slate-600">{row.track}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[140px] truncate" title={row.name ?? ''}>{row.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-900 font-medium truncate max-w-[200px]" title={row.email}>{row.email}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row.contact_number ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${statusBadgeClass(row.status)}`}>
                        {row.status ?? 'new'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onSuccess={loadLeads}
          onCreateAspirant={(lead) => {
            setSelectedLead(null);
            setCreateFromLead(leadToInitialValues(lead));
          }}
        />
      )}

      {createFromLead && (
        <CreateAspirantModal
          initialValues={createFromLead}
          onClose={() => setCreateFromLead(null)}
          onSuccess={() => { setCreateFromLead(null); loadLeads(); }}
        />
      )}
    </div>
  );
}
