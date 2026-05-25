import { useEffect, useMemo, useState } from 'react';
import { HiXMark } from 'react-icons/hi2';
import { supabase } from '../../lib/supabase';
import { PageLoader } from '../../components/ui/Loader';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'requirement_verified', label: 'Requirement verified' },
  { value: 'profiles_shared', label: 'Profiles shared' },
  { value: 'interview_scheduled', label: 'Interview scheduled' },
  { value: 'closed', label: 'Closed' },
  { value: 'lost', label: 'Lost' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

function formatStatusLabel(status) {
  return (status ?? 'new').replace(/_/g, ' ');
}

function hiringSummary(row) {
  const parts = [
    row.number_of_openings != null ? `${row.number_of_openings} opening${row.number_of_openings === 1 ? '' : 's'}` : null,
    row.experience_level,
    row.location_preference,
    row.joining_timeline,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : '—';
}

function statusBadgeClass(status) {
  if (status === 'closed') return 'bg-emerald-100 text-emerald-700';
  if (status === 'lost') return 'bg-slate-100 text-slate-600';
  if (status === 'profiles_shared' || status === 'interview_scheduled') return 'bg-violet-100 text-violet-700';
  if (status === 'requirement_verified') return 'bg-indigo-100 text-indigo-700';
  if (status === 'contacted') return 'bg-amber-100 text-amber-700';
  return 'bg-sky-100 text-sky-700';
}

function priorityBadgeClass(priority) {
  if (priority === 'urgent') return 'bg-red-100 text-red-700';
  if (priority === 'high') return 'bg-orange-100 text-orange-700';
  if (priority === 'low') return 'bg-slate-100 text-slate-600';
  return 'bg-slate-100 text-slate-700';
}

function LeadListItem({ row, onSelect }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(row)}
        className="w-full text-left px-4 py-4 sm:px-5 hover:bg-slate-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-indigo-500"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-base font-semibold text-slate-900">{row.company_name}</span>
              <span className="text-xs text-slate-500">{formatDate(row.created_at)}</span>
            </div>
            <p className="text-sm text-slate-700">
              <span className="font-medium">{row.contact_person}</span>
              <span className="text-slate-400 mx-1.5">·</span>
              <a
                href={`tel:${row.phone}`}
                className="text-indigo-600 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {row.phone}
              </a>
            </p>
            <a
              href={`mailto:${row.work_email}`}
              className="inline-block text-sm text-indigo-600 hover:underline break-all"
              onClick={(e) => e.stopPropagation()}
            >
              {row.work_email}
            </a>
          </div>

          <div className="min-w-0 lg:max-w-[min(100%,22rem)] lg:text-right">
            <p className="text-sm font-medium text-slate-900">{row.role_hiring_for}</p>
            <p className="mt-0.5 text-sm text-slate-600 leading-snug">{hiringSummary(row)}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span
              className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium capitalize ${statusBadgeClass(row.status)}`}
            >
              {formatStatusLabel(row.status)}
            </span>
            <span
              className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium capitalize ${priorityBadgeClass(row.priority)}`}
            >
              {row.priority ?? 'medium'}
            </span>
          </div>
        </div>
      </button>
    </li>
  );
}

function DetailRow({ label, value }) {
  const display = value === null || value === undefined || value === '' ? '—' : value;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-1 sm:gap-3 py-2 border-b border-slate-100 last:border-0">
      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-slate-900 break-words whitespace-pre-wrap">{display}</dd>
    </div>
  );
}

function LeadDetailModal({ lead, onClose, onSaved }) {
  const [status, setStatus] = useState(lead?.status || 'new');
  const [priority, setPriority] = useState(lead?.priority || 'medium');
  const [assignedTo, setAssignedTo] = useState(lead?.assigned_to ?? '');
  const [adminNotes, setAdminNotes] = useState(lead?.admin_notes ?? '');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (lead) {
      setStatus(lead.status || 'new');
      setPriority(lead.priority || 'medium');
      setAssignedTo(lead.assigned_to ?? '');
      setAdminNotes(lead.admin_notes ?? '');
      setMessage({ type: '', text: '' });
    }
  }, [lead?.id]);

  const handleSave = async (event) => {
    event.preventDefault();
    if (!lead) return;
    setMessage({ type: '', text: '' });
    setSubmitting(true);
    const { data, error } = await supabase.rpc('update_nexa_hiring_lead', {
      p_lead_id: lead.id,
      p_status: status,
      p_priority: priority,
      p_assigned_to: assignedTo,
      p_admin_notes: adminNotes,
    });
    setSubmitting(false);
    if (error || !data?.ok) {
      setMessage({ type: 'error', text: data?.error || error?.message || 'Failed to save changes.' });
      return;
    }
    setMessage({ type: 'success', text: 'Lead updated.' });
    onSaved?.();
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
            <h2 className="text-lg font-semibold text-slate-900 truncate">{lead.company_name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{formatDate(lead.created_at)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
          <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 mb-4">
            <DetailRow label="Contact person" value={lead.contact_person} />
            <DetailRow label="Work email" value={lead.work_email} />
            <DetailRow label="Phone" value={lead.phone} />
            <DetailRow label="Role hiring for" value={lead.role_hiring_for} />
            <DetailRow label="Openings" value={lead.number_of_openings} />
            <DetailRow label="Experience" value={lead.experience_level} />
            <DetailRow label="Location" value={lead.location_preference} />
            <DetailRow label="Joining timeline" value={lead.joining_timeline} />
            <DetailRow label="Source" value={lead.source} />
            <DetailRow label="Requirement details" value={lead.requirement_details} />
            <DetailRow label="Updated at" value={formatDate(lead.updated_at)} />
          </div>

          <form onSubmit={handleSave} className="space-y-3">
            {message.text && (
              <p className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                {message.text}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Assigned to</label>
              <input
                type="text"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Team member name or email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Admin notes</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm min-h-[88px]"
                placeholder="Follow-up, profiles shared, etc."
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AdminNexaHiringLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);

  const loadLeads = async () => {
    setLoading(true);
    setLoadError('');
    const { data, error } = await supabase.rpc('get_admin_nexa_hiring_leads', {
      p_status: statusFilter === 'all' ? null : statusFilter,
      p_priority: priorityFilter === 'all' ? null : priorityFilter,
      p_search: query.trim() || null,
    });
    const list = error ? [] : Array.isArray(data) ? data : [];
    if (error) {
      console.error('[NEXA hiring leads]', error);
      setLoadError('Unable to load NEXA hiring leads. Please try again.');
    }
    setLeads(list);
    setLoading(false);
    setSelectedLead((prev) => (prev ? list.find((l) => l.id === prev.id) ?? null : null));
  };

  useEffect(() => {
    loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, priorityFilter]);

  const filteredCount = useMemo(() => leads.length, [leads]);

  const handleSearch = (event) => {
    event.preventDefault();
    loadLeads();
  };

  if (loading && leads.length === 0 && !loadError) {
    return <PageLoader size="md" label="Loading NEXA hiring leads…" className="py-12" />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">NEXA Hiring Leads</h1>
      <p className="text-slate-600 text-sm mb-6">
        Company hiring requirements from NEXA Talent Hire. Click a lead for full details, notes, and status updates.
      </p>

      <form onSubmit={handleSearch} className="flex flex-col gap-3 mb-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Search</label>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Company, contact, email, phone, role…"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[10rem]"
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Priority</label>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[10rem]"
          >
            <option value="all">All priorities</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
        >
          Apply filters
        </button>
      </form>

      {loadError ? (
        <p className="text-sm text-red-600 mb-4">{loadError}</p>
      ) : null}

      <p className="text-xs text-slate-500 mb-3">{filteredCount} lead{filteredCount === 1 ? '' : 's'}</p>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {leads.length === 0 ? (
          <p className="px-4 py-10 text-center text-slate-500">
            {loadError ? '—' : 'No NEXA hiring leads yet.'}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {leads.map((row) => (
              <LeadListItem key={row.id} row={row} onSelect={setSelectedLead} />
            ))}
          </ul>
        )}
      </div>

      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onSaved={loadLeads}
        />
      )}
    </div>
  );
}
