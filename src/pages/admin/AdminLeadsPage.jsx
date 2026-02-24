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

function EditLeadStatusModal({ lead, onClose, onSuccess }) {
  const [status, setStatus] = useState(lead?.status || 'new');
  const [adminNotes, setAdminNotes] = useState(lead?.admin_notes ?? '');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
    onClose?.();
  };

  if (!lead) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white border border-slate-200 shadow-xl p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Lead status — {lead.email}</h2>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close">
            <HiXMark className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex-1 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createFromLead, setCreateFromLead] = useState(null);
  const [editLead, setEditLead] = useState(null);

  const loadLeads = async () => {
    const { data } = await supabase.rpc('get_admin_pricing_leads');
    setLeads(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { loadLeads(); }, []);

  if (loading) return <PageLoader size="md" label="Loading leads…" className="py-12" />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Pricing leads</h1>
      <p className="text-slate-600 text-sm mb-6">
        Leads captured when users select a plan on the pricing page (no sign up).
      </p>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700">Date</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Plan</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Track</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Name</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Role</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Email</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Contact</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Graduation</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Company</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Exp</th>
                <th className="px-4 py-3 font-semibold text-slate-700">CTC</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Message</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-8 text-center text-slate-500">
                    No leads yet.
                  </td>
                </tr>
              ) : (
                leads.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(row.created_at)}</td>
                    <td className="px-4 py-3 text-slate-900 font-medium">{row.plan_id}</td>
                    <td className="px-4 py-3 text-slate-600">{row.track}</td>
                    <td className="px-4 py-3 text-slate-600">{row.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[140px] truncate" title={row.looking_for_role ?? ''}>{row.looking_for_role ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-900">{row.email}</td>
                    <td className="px-4 py-3 text-slate-600">{row.contact_number}</td>
                    <td className="px-4 py-3 text-slate-600">{row.graduation_pass ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{row.current_company ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{row.experience_years ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{row.current_ctc ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[220px] text-xs whitespace-pre-wrap">{row.message ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${
                        row.status === 'converted' ? 'bg-emerald-100 text-emerald-700' :
                        row.status === 'contacted' ? 'bg-amber-100 text-amber-700' :
                        row.status === 'rejected' ? 'bg-slate-100 text-slate-600' :
                        'bg-sky-100 text-sky-700'
                      }`}>
                        {row.status ?? 'new'}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setEditLead(row)}
                        className="text-slate-600 hover:underline text-xs font-medium"
                      >
                        Status / notes
                      </button>
                      <button
                        type="button"
                        onClick={() => setCreateFromLead(leadToInitialValues(row))}
                        className="text-indigo-600 hover:underline text-xs font-medium"
                      >
                        Create aspirant
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {createFromLead && (
        <CreateAspirantModal
          initialValues={createFromLead}
          onClose={() => setCreateFromLead(null)}
          onSuccess={() => { setCreateFromLead(null); loadLeads(); }}
        />
      )}

      {editLead && (
        <EditLeadStatusModal
          lead={editLead}
          onClose={() => setEditLead(null)}
          onSuccess={() => { setEditLead(null); loadLeads(); }}
        />
      )}
    </div>
  );
}
