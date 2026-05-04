import { useState, useEffect, useCallback } from 'react';
import { HiXMark } from 'react-icons/hi2';
import { supabase } from '../../lib/supabase';
import { PageLoader, Loader } from '../../components/ui/Loader';

const STATUSES = [
  { value: '', label: 'All statuses' },
  { value: 'new', label: 'New' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'placed', label: 'Placed' },
  { value: 'archived', label: 'Archived' },
];

const WORK_MODES = [
  { value: '', label: 'Any mode' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
  { value: 'any', label: 'Any' },
];

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function statusBadgeClass(status) {
  if (status === 'placed') return 'bg-emerald-100 text-emerald-800';
  if (status === 'shortlisted') return 'bg-violet-100 text-violet-800';
  if (status === 'contacted') return 'bg-amber-100 text-amber-800';
  if (status === 'archived') return 'bg-slate-100 text-slate-600';
  if (status === 'reviewed') return 'bg-sky-100 text-sky-800';
  return 'bg-indigo-50 text-indigo-800';
}

function DetailRow({ label, value }) {
  if (value === null || value === undefined || value === '') value = '—';
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-3 py-2 border-b border-slate-100 last:border-0">
      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-slate-900 break-words whitespace-pre-wrap">{String(value)}</dd>
    </div>
  );
}

function skillsToString(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return '—';
  return arr.join(', ');
}

function CandidateDetailModal({ row, onClose, onSaved }) {
  const [status, setStatus] = useState(row?.status || 'new');
  const [adminNotes, setAdminNotes] = useState(row?.admin_notes ?? '');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);
  const [resumeSignedUrl, setResumeSignedUrl] = useState(null);

  useEffect(() => {
    if (row) {
      setStatus(row.status || 'new');
      setAdminNotes(row.admin_notes ?? '');
      setMessage({ type: '', text: '' });
    }
  }, [row?.id]);

  useEffect(() => {
    if (!row?.resume_url) {
      setResumeSignedUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.storage.from('resumes').createSignedUrl(row.resume_url, 3600);
      if (!cancelled && !error && data?.signedUrl) setResumeSignedUrl(data.signedUrl);
      else if (!cancelled) setResumeSignedUrl(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [row?.resume_url]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!row) return;
    setMessage({ type: '', text: '' });
    setSubmitting(true);
    const { data, error } = await supabase.rpc('update_talent_pool_candidate_admin', {
      p_id: row.id,
      p_status: status,
      p_admin_notes: adminNotes || null,
    });
    setSubmitting(false);
    if (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update.' });
      return;
    }
    const result = data;
    if (result && typeof result === 'object' && result.ok === false) {
      setMessage({ type: 'error', text: result.error || 'Failed to update.' });
      return;
    }
    onSaved?.();
    setMessage({ type: 'ok', text: 'Saved.' });
  };

  if (!row) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] rounded-xl bg-white border border-slate-200 shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-200">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900 truncate">{row.full_name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{formatDate(row.created_at)}</p>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close">
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
          <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 mb-4">
            <DetailRow label="Email" value={row.email} />
            <DetailRow label="Phone" value={row.phone} />
            <DetailRow label="City" value={row.city} />
            <DetailRow label="Country" value={row.country} />
            <DetailRow label="Relocate" value={row.willing_to_relocate ? 'Yes' : 'No'} />
            <DetailRow label="Fresher" value={row.is_fresher ? 'Yes' : 'No'} />
            <DetailRow label="Years exp." value={row.years_experience} />
            <DetailRow label="Employment" value={row.employment_status} />
            <DetailRow label="Primary role" value={row.primary_role} />
            <DetailRow label="Work mode" value={row.work_mode} />
            <DetailRow label="Available from" value={row.available_from} />
            <DetailRow
              label="Current salary (annual)"
              value={row.current_salary_annual != null ? row.current_salary_annual : '—'}
            />
            <DetailRow
              label="Expected salary (from — up to)"
              value={[row.expected_salary_min, row.expected_salary_max].filter((x) => x != null).join(' — ') || '—'}
            />
            <DetailRow label="Primary skills" value={skillsToString(row.primary_skills)} />
            <DetailRow label="Secondary skills" value={skillsToString(row.secondary_skills)} />
            <DetailRow label="Communication (1–10)" value={row.communication_level} />
            <DetailRow label="LinkedIn" value={row.linkedin_url} />
            <DetailRow label="Portfolio" value={row.portfolio_url} />
            <DetailRow label="Source" value={row.source} />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 mb-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Resume</h3>
            {row.resume_url ? (
              resumeSignedUrl ? (
                <a href={resumeSignedUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-medium text-sm hover:underline">
                  Open resume →
                </a>
              ) : (
                <span className="inline-flex items-center gap-2 text-slate-500 text-sm">
                  <Loader size="xs" /> Preparing link…
                </span>
              )
            ) : (
              <p className="text-sm text-slate-500">—</p>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-3">
            {message.text ? (
              <p className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message.text}</p>
            ) : null}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                {STATUSES.filter((s) => s.value !== '').map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Admin notes</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm min-h-[80px]"
                placeholder="Internal notes…"
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? 'Saving…' : 'Save'}
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

/** Comma-separated skills; tokens may contain spaces (quoted in PG array literal). */
function sanitizeSkillTokens(raw) {
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((s) => s.replace(/[{}]/g, ''))
    .filter(Boolean);
}

function pgTextArrayLiteral(arr) {
  return (
    '{' +
    arr
      .map((s) => {
        if (/^[a-z0-9_]+$/i.test(s)) return s;
        return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
      })
      .join(',') +
    '}'
  );
}

export default function AdminTalentPoolPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [workModeFilter, setWorkModeFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [skillsFilter, setSkillsFilter] = useState('');
  const [yearsMin, setYearsMin] = useState('');
  const [yearsMax, setYearsMax] = useState('');
  const [commMin, setCommMin] = useState('');
  const [searchText, setSearchText] = useState('');

  const loadRows = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('talent_pool_candidates').select('*').order('created_at', { ascending: false }).limit(500);

    if (statusFilter) q = q.eq('status', statusFilter);
    if (workModeFilter) q = q.eq('work_mode', workModeFilter);
    if (cityFilter.trim()) q = q.ilike('city', `%${cityFilter.trim()}%`);

    const yMin = yearsMin.trim() === '' ? null : Number(yearsMin);
    const yMax = yearsMax.trim() === '' ? null : Number(yearsMax);
    if (yMin !== null && Number.isFinite(yMin)) q = q.gte('years_experience', yMin);
    if (yMax !== null && Number.isFinite(yMax)) q = q.lte('years_experience', yMax);

    const cMin = commMin.trim() === '' ? null : Number(commMin);
    if (cMin !== null && Number.isFinite(cMin)) q = q.gte('communication_level', cMin);

    const st = searchText.trim();
    if (st) {
      const safe = st.replace(/,/g, ' ');
      const pattern = `%${safe}%`;
      q = q.or(`full_name.ilike.${pattern},email.ilike.${pattern},primary_role.ilike.${pattern}`);
    }

    const tokens = sanitizeSkillTokens(skillsFilter);
    if (tokens.length > 0) {
      const lit = pgTextArrayLiteral(tokens);
      q = q.or(`primary_skills.ov.${lit},secondary_skills.ov.${lit}`);
    }

    const { data, error } = await q;
    const list = error ? [] : data ?? [];
    if (error) console.error(error);
    setRows(list);
    setLoading(false);
    setSelected((prev) => (prev ? list.find((r) => r.id === prev.id) ?? prev : null));
  }, [statusFilter, workModeFilter, cityFilter, skillsFilter, yearsMin, yearsMax, commMin, searchText]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  if (loading) return <PageLoader size="md" label="Loading talent pool…" className="py-12" />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Talent pool</h1>
      <p className="text-slate-600 text-sm mb-6">
        Candidates who joined from the landing page. Newest first. Filter by skills (comma-separated), experience, communication, and more.
      </p>

      <div className="rounded-xl border border-slate-200 bg-white p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Search name / email / role</label>
          <input
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="e.g. java or @gmail"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Skills (any match)</label>
          <input
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            value={skillsFilter}
            onChange={(e) => setSkillsFilter(e.target.value)}
            placeholder="java, spring boot"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
          <select
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s.value || 'all'} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Work mode</label>
          <select
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            value={workModeFilter}
            onChange={(e) => setWorkModeFilter(e.target.value)}
          >
            {WORK_MODES.map((s) => (
              <option key={s.value || 'any-mode'} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">City contains</label>
          <input
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            placeholder="Hyderabad"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Years min</label>
          <input
            type="number"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            value={yearsMin}
            onChange={(e) => setYearsMin(e.target.value)}
            placeholder="0"
            min={0}
            step={0.25}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Years max</label>
          <input
            type="number"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            value={yearsMax}
            onChange={(e) => setYearsMax(e.target.value)}
            placeholder="20"
            min={0}
            step={0.25}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Communication min (1–10)</label>
          <input
            type="number"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            value={commMin}
            onChange={(e) => setCommMin(e.target.value)}
            placeholder="7"
            min={1}
            max={10}
          />
        </div>
      </div>

      <p className="text-xs text-slate-500 mb-2">Showing up to 500 rows · sorted by newest first</p>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">Submitted</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Name</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Email</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Skills</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Yrs</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Comm</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No candidates match these filters.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-100 hover:bg-slate-50/80 cursor-pointer"
                    onClick={() => setSelected(r)}
                  >
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(r.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{r.full_name}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate" title={r.email}>
                      {r.email}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[220px] truncate" title={skillsToString(r.primary_skills)}>
                      {skillsToString(r.primary_skills)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 tabular-nums">{r.years_experience ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600 tabular-nums">{r.communication_level}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${statusBadgeClass(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CandidateDetailModal row={selected} onClose={() => setSelected(null)} onSaved={loadRows} />
    </div>
  );
}
