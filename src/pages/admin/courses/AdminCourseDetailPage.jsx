import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  HiArrowLeft,
  HiCheckCircle,
  HiDocumentArrowUp,
  HiMagnifyingGlass,
  HiUserGroup,
  HiUsers,
  HiXMark,
} from 'react-icons/hi2';
import { PageLoader } from '../../../components/ui/Loader';
import {
  adminAddCourseInvites,
  adminGetCourse,
  adminListCourseJoinRequests,
  adminListCourseMembers,
  adminReviewCourseJoin,
  adminUpdateCourse,
  extractEmailsFromSpreadsheet,
  formatCourseDate,
  parseEmailList,
} from '../../../lib/courses';

function StatPill({ label, value, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-800',
    indigo: 'bg-indigo-50 text-indigo-800',
    amber: 'bg-amber-50 text-amber-900',
    emerald: 'bg-emerald-50 text-emerald-800',
  };
  return (
    <div className={`rounded-xl px-4 py-3 ${tones[tone] || tones.slate}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export default function AdminCourseDetailPage() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [invites, setInvites] = useState([]);
  const [requests, setRequests] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [inviteText, setInviteText] = useState('');
  const [inviteMsg, setInviteMsg] = useState({ type: '', text: '' });
  const [inviteBusy, setInviteBusy] = useState(false);
  const [parseBusy, setParseBusy] = useState(false);

  /** @type {null | { emails: string[], sourceLabel: string, fileName?: string }} */
  const [pendingImport, setPendingImport] = useState(null);
  const [previewQuery, setPreviewQuery] = useState('');
  const [selected, setSelected] = useState(() => new Set());

  const [reviewBusyId, setReviewBusyId] = useState(null);
  const [toggleBusy, setToggleBusy] = useState(false);
  const [tab, setTab] = useState('invites'); // invites | requests | members

  const existingInviteSet = useMemo(
    () => new Set(invites.map((i) => String(i.email || '').toLowerCase())),
    [invites]
  );

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    const [courseRes, reqRes, memRes] = await Promise.all([
      adminGetCourse(id),
      adminListCourseJoinRequests(id),
      adminListCourseMembers(id, 'free'),
    ]);
    setLoading(false);
    if (!courseRes.ok) {
      setError(courseRes.error || 'Failed to load course');
      return;
    }
    setCourse(courseRes.course);
    setInvites(courseRes.invites || []);
    setRequests(reqRes.ok ? reqRes.requests || [] : []);
    setMembers(memRes.ok ? memRes.members || [] : []);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const openPreview = (emails, sourceLabel, fileName) => {
    const unique = [...new Set(emails.map((e) => e.toLowerCase().trim()).filter(Boolean))];
    if (!unique.length) {
      setInviteMsg({ type: 'error', text: 'No valid emails found to review.' });
      setPendingImport(null);
      return;
    }
    setPendingImport({ emails: unique, sourceLabel, fileName });
    setSelected(new Set(unique.filter((e) => !existingInviteSet.has(e))));
    setPreviewQuery('');
    setInviteMsg({ type: '', text: '' });
    setTab('invites');
  };

  const filteredPreview = useMemo(() => {
    if (!pendingImport) return [];
    const q = previewQuery.trim().toLowerCase();
    if (!q) return pendingImport.emails;
    return pendingImport.emails.filter((e) => e.includes(q));
  }, [pendingImport, previewQuery]);

  const previewStats = useMemo(() => {
    if (!pendingImport) return { total: 0, newCount: 0, already: 0, selectedCount: 0 };
    let already = 0;
    let newCount = 0;
    for (const e of pendingImport.emails) {
      if (existingInviteSet.has(e)) already += 1;
      else newCount += 1;
    }
    return {
      total: pendingImport.emails.length,
      newCount,
      already,
      selectedCount: selected.size,
    };
  }, [pendingImport, existingInviteSet, selected]);

  const toggleEmail = (email) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const selectAllNew = () => {
    if (!pendingImport) return;
    setSelected(new Set(pendingImport.emails.filter((e) => !existingInviteSet.has(e))));
  };

  const clearSelection = () => setSelected(new Set());

  const cancelPreview = () => {
    setPendingImport(null);
    setSelected(new Set());
    setPreviewQuery('');
  };

  const confirmImport = async () => {
    const emails = [...selected];
    if (!emails.length) {
      setInviteMsg({ type: 'error', text: 'Select at least one email to import.' });
      return;
    }
    setInviteBusy(true);
    setInviteMsg({ type: '', text: '' });
    const res = await adminAddCourseInvites(id, emails);
    setInviteBusy(false);
    if (!res.ok) {
      setInviteMsg({ type: 'error', text: res.error || 'Failed to add invites' });
      return;
    }
    setInviteMsg({
      type: 'success',
      text: `Imported ${res.added ?? 0} new invite(s). Skipped duplicates: ${res.duplicates ?? 0}. Total on course: ${res.invite_count ?? 0}.`,
    });
    setPendingImport(null);
    setSelected(new Set());
    setInviteText('');
    load();
  };

  const handleFilePick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setParseBusy(true);
    setInviteMsg({ type: '', text: '' });
    const parsed = await extractEmailsFromSpreadsheet(file);
    setParseBusy(false);
    if (!parsed.ok) {
      setInviteMsg({ type: 'error', text: parsed.error });
      return;
    }
    const label = parsed.column
      ? `Excel · column "${parsed.column}" · ${parsed.rowCount} rows`
      : `Excel · ${parsed.rowCount} rows`;
    openPreview(parsed.emails, label, file.name);
  };

  const handlePastePreview = (e) => {
    e.preventDefault();
    openPreview(parseEmailList(inviteText), 'Pasted list');
  };

  const handleReview = async (memberId, approve) => {
    setReviewBusyId(memberId);
    const res = await adminReviewCourseJoin(memberId, approve);
    setReviewBusyId(null);
    if (!res.ok) {
      window.alert(res.error || 'Review failed');
      return;
    }
    load();
  };

  const handleToggleActive = async () => {
    if (!course) return;
    setToggleBusy(true);
    const res = await adminUpdateCourse(course.id, { isActive: !course.is_active });
    setToggleBusy(false);
    if (!res.ok) {
      window.alert(res.error || 'Update failed');
      return;
    }
    load();
  };

  if (loading) {
    return <PageLoader size="md" label="Loading…" className="py-10" />;
  }

  if (error || !course) {
    return (
      <div className="space-y-3">
        <Link to="/admin/courses" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
          <HiArrowLeft className="h-4 w-4" /> Back to courses
        </Link>
        <p className="text-sm text-red-600">{error || 'Course not found'}</p>
      </div>
    );
  }

  const tabs = [
    { id: 'invites', label: 'Invites', count: invites.length },
    { id: 'requests', label: 'Requests', count: requests.length },
    { id: 'members', label: 'Joined', count: members.length },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <Link to="/admin/courses" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
          <HiArrowLeft className="h-4 w-4" /> Back to courses
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{course.title}</h1>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  course.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {course.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Code <span className="font-mono font-medium">{course.code}</span>
              {' · '}
              Starts {formatCourseDate(course.free_starts_at)}
              {course.free_ends_at ? ` · Ends ${formatCourseDate(course.free_ends_at)}` : ''}
            </p>
          </div>
          <button
            type="button"
            disabled={toggleBusy}
            onClick={handleToggleActive}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {course.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatPill label="Invites" value={invites.length} tone="indigo" />
        <StatPill label="Pending requests" value={requests.length} tone="amber" />
        <StatPill label="Joined" value={members.length} tone="emerald" />
        <StatPill label="Status" value={course.is_active ? 'Open' : 'Closed'} tone="slate" />
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 -mx-1 px-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
            <span className="ml-1.5 tabular-nums text-xs opacity-70">({t.count})</span>
          </button>
        ))}
      </div>

      {tab === 'invites' ? (
        <div className="space-y-5">
          {!pendingImport ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <HiDocumentArrowUp className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Import invite emails</h2>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Choose a file or paste emails → review the list → then confirm import. Nothing is saved until you confirm.
                  </p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-5">
                <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-5 space-y-3">
                  <p className="text-sm font-semibold text-slate-800">1. Upload Excel / CSV</p>
                  <p className="text-xs text-slate-600">
                    Google Form exports work — we read the <span className="font-medium">email</span> column.
                  </p>
                  <label className="block">
                    <span className="sr-only">Choose spreadsheet</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                      disabled={parseBusy || inviteBusy}
                      onChange={handleFilePick}
                      className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-700 disabled:opacity-60"
                    />
                  </label>
                  {parseBusy ? <p className="text-sm text-indigo-700">Reading file…</p> : null}
                </div>

                <form onSubmit={handlePastePreview} className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-3">
                  <p className="text-sm font-semibold text-slate-800">2. Or paste emails</p>
                  <p className="text-xs text-slate-600">One per line is fine — commas not required.</p>
                  <textarea
                    value={inviteText}
                    onChange={(e) => setInviteText(e.target.value)}
                    rows={6}
                    placeholder={'satish25geesala@gmail.com\nkpravalikareddy68@gmail.com'}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-mono"
                  />
                  <button
                    type="submit"
                    disabled={parseBusy || inviteBusy || !inviteText.trim()}
                    className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
                  >
                    Preview pasted emails
                  </button>
                </form>
              </div>

              {inviteMsg.text ? (
                <p
                  className={`text-sm rounded-lg px-3 py-2 ${
                    inviteMsg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'
                  }`}
                >
                  {inviteMsg.text}
                </p>
              ) : null}

              {invites.length > 0 ? (
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-sm font-medium text-slate-800 mb-2">
                    Current invites ({invites.length})
                  </p>
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                    <ul className="columns-1 sm:columns-2 lg:columns-3 gap-x-6 text-xs font-mono text-slate-700">
                      {invites.map((inv) => (
                        <li key={inv.id} className="break-all py-0.5">
                          {inv.email}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No invites on this course yet.</p>
              )}
            </section>
          ) : (
            <section className="rounded-2xl border border-indigo-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-indigo-600 px-5 py-4 text-white flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-100">Review before import</p>
                  <h2 className="text-lg font-semibold mt-0.5">
                    {pendingImport.fileName || pendingImport.sourceLabel}
                  </h2>
                  <p className="text-sm text-indigo-100 mt-1">{pendingImport.sourceLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={cancelPreview}
                  className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
                >
                  <HiXMark className="h-4 w-4" /> Cancel
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 border-b border-slate-100">
                <StatPill label="In file" value={previewStats.total} />
                <StatPill label="New" value={previewStats.newCount} tone="emerald" />
                <StatPill label="Already invited" value={previewStats.already} tone="amber" />
                <StatPill label="Selected" value={previewStats.selectedCount} tone="indigo" />
              </div>

              <div className="px-3 py-3 sm:px-5 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 border-b border-slate-100 bg-slate-50/80">
                <div className="relative flex-1 min-w-0">
                  <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    value={previewQuery}
                    onChange={(e) => setPreviewQuery(e.target.value)}
                    placeholder="Search emails…"
                    className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2.5 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <button
                    type="button"
                    onClick={selectAllNew}
                    className="px-3 py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-white"
                  >
                    Select all new
                  </button>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="px-3 py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-white"
                  >
                    Clear selection
                  </button>
                </div>
              </div>

              <div className="max-h-[360px] overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-white border-b border-slate-200 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-2 w-10" />
                      <th className="px-4 py-2 font-medium">Email</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPreview.map((email) => {
                      const already = existingInviteSet.has(email);
                      const isOn = selected.has(email);
                      return (
                        <tr
                          key={email}
                          className={`border-t border-slate-100 ${already ? 'bg-amber-50/40' : isOn ? 'bg-indigo-50/40' : ''}`}
                        >
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              checked={isOn}
                              disabled={already}
                              onChange={() => toggleEmail(email)}
                              className="h-4 w-4 rounded border-slate-300"
                            />
                          </td>
                          <td className="px-4 py-2 font-mono text-xs sm:text-sm text-slate-800 break-all">{email}</td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {already ? (
                              <span className="text-xs font-medium text-amber-700">Already invited</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                                <HiCheckCircle className="h-3.5 w-3.5" /> New
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredPreview.length === 0 ? (
                  <p className="p-6 text-sm text-slate-500 text-center">No emails match your search.</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
                {inviteMsg.text ? (
                  <p className={`text-sm ${inviteMsg.type === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>
                    {inviteMsg.text}
                  </p>
                ) : (
                  <p className="text-sm text-slate-600">
                    {previewStats.selectedCount} email(s) will be imported. Already-invited rows stay unchecked.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
                  <button
                    type="button"
                    onClick={cancelPreview}
                    disabled={inviteBusy}
                    className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmImport}
                    disabled={inviteBusy || selected.size === 0}
                    className="px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {inviteBusy ? 'Importing…' : `Confirm (${selected.size})`}
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      ) : null}

      {tab === 'requests' ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <HiUsers className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-slate-900">Join requests</h2>
          </div>
          {requests.length === 0 ? (
            <p className="text-sm text-slate-600">No pending requests.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Aspirant</th>
                    <th className="px-4 py-3 font-medium">Reason</th>
                    <th className="px-4 py-3 font-medium">Requested</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{r.aspirant_name || '—'}</div>
                        <div className="text-xs text-slate-500">{r.aspirant_email}</div>
                        <div className="text-xs text-slate-500">
                          {r.aspirant_track || '—'} · {r.aspirant_plan || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 max-w-md whitespace-pre-wrap">{r.reason || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatCourseDate(r.created_at)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-right space-x-2">
                        <button
                          type="button"
                          disabled={reviewBusyId === r.id}
                          onClick={() => handleReview(r.id, true)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={reviewBusyId === r.id}
                          onClick={() => handleReview(r.id, false)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {tab === 'members' ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <HiUserGroup className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-900">Joined members ({members.length})</h2>
          </div>
          {members.length === 0 ? (
            <p className="text-sm text-slate-600">No one has joined yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-900">{m.aspirant_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{m.aspirant_email}</td>
                      <td className="px-4 py-3 text-slate-500">{formatCourseDate(m.joined_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
