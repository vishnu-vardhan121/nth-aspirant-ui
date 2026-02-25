import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader, LoaderPulse, PageLoader, TableSkeleton } from '../../components/ui/Loader';
import {
  HiXMark,
  HiUser,
  HiEnvelope,
  HiPhone,
  HiMapPin,
  HiAcademicCap,
  HiTag,
  HiDocumentArrowDown,
  HiBriefcase,
  HiClipboardDocumentCheck,
} from 'react-icons/hi2';

const PAGE_SIZE = 50;

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function UserProfileModal({ aspirantId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [resumeSignedUrl, setResumeSignedUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!aspirantId) return;
    setLoading(true);
    setProfile(null);
    setResumeSignedUrl(null);
    (async () => {
      const { data, error } = await supabase.rpc('get_aspirant_profile_for_admin', { p_aspirant_id: aspirantId });
      if (!error && data) setProfile(typeof data === 'string' ? JSON.parse(data) : data);
      setLoading(false);
    })();
  }, [aspirantId]);

  useEffect(() => {
    if (!profile?.resume_url) {
      setResumeSignedUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.storage.from('resumes').createSignedUrl(profile.resume_url, 3600);
      if (!cancelled && !error && data?.signedUrl) setResumeSignedUrl(data.signedUrl);
      else if (!cancelled) setResumeSignedUrl(null);
    })();
    return () => { cancelled = true; };
  }, [profile?.resume_url]);

  if (!aspirantId) return null;

  const edu = profile?.education || {};
  const skills = Array.isArray(profile?.skills) ? profile.skills : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60" aria-hidden onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">User profile</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Close"
          >
            <HiXMark className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <LoaderPulse size="md" /> Loading…
            </div>
          ) : !profile ? (
            <p className="text-slate-500 text-sm">Could not load profile.</p>
          ) : (
            <div className="space-y-6">
              <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                  <HiUser className="h-4 w-4 text-indigo-600" /> Contact
                </h3>
                <dl className="grid grid-cols-1 gap-2 text-sm">
                  <div>
                    <dt className="text-slate-500">Name</dt>
                    <dd className="font-medium text-slate-900">{profile.full_name ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 flex items-center gap-1"><HiEnvelope className="h-3.5 w-3" /> Email</dt>
                    <dd>
                      <a href={`mailto:${profile.email ?? ''}`} className="text-indigo-600 hover:underline">{profile.email ?? '—'}</a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 flex items-center gap-1"><HiPhone className="h-3.5 w-3" /> Phone</dt>
                    <dd className="text-slate-900">{profile.phone || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 flex items-center gap-1"><HiMapPin className="h-3.5 w-3" /> City</dt>
                    <dd className="text-slate-900">{profile.city ?? '—'}</dd>
                  </div>
                </dl>
              </section>
              <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                  <HiAcademicCap className="h-4 w-4 text-indigo-600" /> Education
                </h3>
                <dl className="space-y-2 text-sm">
                  {edu.tenth && (edu.tenth.marks || edu.tenth.year) && (
                    <div className="p-3 rounded-lg bg-slate-50">
                      <dt className="text-slate-500 text-xs font-medium uppercase tracking-wide">10th</dt>
                      <dd>{[edu.tenth.marks, edu.tenth.year].filter(Boolean).join(' · ') || '—'}</dd>
                    </div>
                  )}
                  {edu.twelfth && (edu.twelfth.marks || edu.twelfth.year) && (
                    <div className="p-3 rounded-lg bg-slate-50">
                      <dt className="text-slate-500 text-xs font-medium uppercase tracking-wide">12th</dt>
                      <dd>{[edu.twelfth.marks, edu.twelfth.year].filter(Boolean).join(' · ') || '—'}</dd>
                    </div>
                  )}
                  {edu.graduation && (edu.graduation.type || edu.graduation.branch || edu.graduation.year) && (
                    <div className="p-3 rounded-lg bg-slate-50">
                      <dt className="text-slate-500 text-xs font-medium uppercase tracking-wide">Graduation</dt>
                      <dd>{[edu.graduation.type, edu.graduation.branch, edu.graduation.year].filter(Boolean).join(' · ') || '—'}</dd>
                    </div>
                  )}
                  {!edu.tenth?.marks && !edu.twelfth?.marks && !edu.graduation?.type && (
                    <p className="text-slate-500 text-sm">No education details provided.</p>
                  )}
                </dl>
              </section>
              <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                  <HiTag className="h-4 w-4 text-indigo-600" /> Skills
                </h3>
                {skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s) => (
                      <span key={s} className="inline-flex px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 text-sm font-medium">{s}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">No skills listed.</p>
                )}
              </section>
              <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                  <HiDocumentArrowDown className="h-4 w-4 text-indigo-600" /> Resume
                </h3>
                {profile.resume_url ? (
                  <div className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 bg-slate-50">
                    <HiDocumentArrowDown className="h-8 w-8 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      {resumeSignedUrl ? (
                        <a href={resumeSignedUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-medium hover:underline">View resume →</a>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-slate-500 text-sm"><Loader size="xs" /> Loading link…</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">No resume uploaded.</p>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [planFilter, setPlanFilter] = useState('');
  const [trackFilter, setTrackFilter] = useState('');
  const [page, setPage] = useState(0);
  const [profileUserId, setProfileUserId] = useState(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc('get_admin_users_summary');
      if (!error && data) setSummary(data);
    })();
  }, []);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.rpc('get_admin_users_list', {
        p_plan: planFilter || null,
        p_track: trackFilter || null,
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      });
      if (!error && data) setUsers(Array.isArray(data) ? data : []);
      setLoading(false);
    })();
  }, [planFilter, trackFilter, page]);

  const byPlan = summary?.by_plan || {};
  const byTrack = summary?.by_track || {};

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Users</h1>
      <p className="text-slate-600 mb-6">
        All aspirants, subscription status, jobs and mocks. Track admin targets: pending and completed mocks by fresher vs experienced.
      </p>

      {/* Summary: Users */}
      {summary && (
        <>
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Users</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard label="Total users" value={summary.total_users ?? 0} />
              <StatCard label="Active users" value={summary.active_users ?? 0} />
              <StatCard label="Paid users" value={summary.paid_users ?? 0} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs text-slate-500">By plan:</span>
              <span className="inline-flex px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs">Base {byPlan.base ?? 0}</span>
              <span className="inline-flex px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs">Silver {byPlan.silver ?? 0}</span>
              <span className="inline-flex px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs">Gold {byPlan.gold ?? 0}</span>
              <span className="text-xs text-slate-500 ml-2">By track:</span>
              <span className="inline-flex px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs">Fresher {byTrack.fresher ?? 0}</span>
              <span className="inline-flex px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs">Experienced {byTrack.experienced ?? 0}</span>
            </div>
          </section>

          {/* Summary: Jobs (applications) for active users */}
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <HiBriefcase className="h-4 w-4 text-indigo-600" /> Jobs (applications this month)
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="All users" value={summary.applications_this_month ?? 0} />
              <StatCard label="Active users only" value={summary.applications_this_month_active ?? 0} />
            </div>
          </section>

          {/* Summary: Admin mock targets – pending & completed */}
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <HiClipboardDocumentCheck className="h-4 w-4 text-indigo-600" /> Admin mock targets
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard label="Pending (fresher)" value={summary.pending_mocks_fresher ?? 0} />
              <StatCard label="Pending (experienced)" value={summary.pending_mocks_experienced ?? 0} />
              <StatCard label="Pending (total)" value={summary.pending_mocks_total ?? 0} />
              <StatCard label="Completed (fresher)" value={summary.completed_mocks_fresher ?? 0} />
              <StatCard label="Completed (experienced)" value={summary.completed_mocks_experienced ?? 0} />
              <StatCard label="Completed (total)" value={summary.completed_mocks_total ?? 0} />
            </div>
          </section>
        </>
      )}

      {/* Filters and table */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center gap-4">
          <h2 className="text-sm font-semibold text-slate-700">User list</h2>
          <select
            value={planFilter}
            onChange={(e) => { setPlanFilter(e.target.value); setPage(0); }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 bg-white"
          >
            <option value="">All plans</option>
            <option value="base">Base</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
          </select>
          <select
            value={trackFilter}
            onChange={(e) => { setTrackFilter(e.target.value); setPage(0); }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 bg-white"
          >
            <option value="">All tracks</option>
            <option value="fresher">Fresher</option>
            <option value="experienced">Experienced</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700">Name</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Email</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Plan</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Track</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Days to expire</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Apps</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Mocks</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6">
                    <TableSkeleton rows={6} cols={9} className="px-4" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">No users match the filters.</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-900 font-medium">{u.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{u.email ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{u.plan ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{u.track ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {u.days_until_expiry != null ? String(u.days_until_expiry) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {u.applications_this_month ?? 0} / {u.application_limit == null || u.application_limit < 0 ? '∞' : u.application_limit}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {u.mocks_conducted_in_period ?? 0} / {u.mocks_pending_in_period ?? 0} / {u.mock_limit == null ? '—' : u.mock_limit}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {u.is_active ? 'Active' : 'Expired'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setProfileUserId(u.id)}
                        className="text-indigo-600 hover:underline text-xs font-medium"
                      >
                        View profile
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">Page {page + 1}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={users.length < PAGE_SIZE}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {profileUserId && (
        <UserProfileModal aspirantId={profileUserId} onClose={() => setProfileUserId(null)} />
      )}
    </div>
  );
}
