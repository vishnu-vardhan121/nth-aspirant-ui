import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader, PageLoader } from '../../components/ui/Loader';
import {
  HiXMark,
  HiUser,
  HiEnvelope,
  HiPhone,
  HiMapPin,
  HiAcademicCap,
  HiTag,
  HiDocumentArrowDown,
  HiChatBubbleLeftRight,
  HiGlobeAlt,
  HiTrash,
} from 'react-icons/hi2';

function formatDate(createdAt) {
  if (!createdAt) return '—';
  const d = new Date(createdAt);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ApplicantProfileModal({ applicant, onClose }) {
  const [resumeSignedUrl, setResumeSignedUrl] = useState(null);

  useEffect(() => {
    if (!applicant?.aspirant_resume_url) {
      setResumeSignedUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.storage
        .from('resumes')
        .createSignedUrl(applicant.aspirant_resume_url, 3600);
      if (!cancelled && !error && data?.signedUrl) setResumeSignedUrl(data.signedUrl);
      else if (!cancelled) setResumeSignedUrl(null);
    })();
    return () => { cancelled = true; };
  }, [applicant?.aspirant_resume_url]);

  if (!applicant) return null;

  const edu = applicant.aspirant_education || {};
  const skills = Array.isArray(applicant.aspirant_skills) ? applicant.aspirant_skills : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60" aria-hidden onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Applicant profile</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Close"
          >
            <HiXMark className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Contact */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
              <HiUser className="h-4 w-4 text-indigo-600" />
              Contact
            </h3>
            <dl className="grid grid-cols-1 gap-2 text-sm">
              <div>
                <dt className="text-slate-500">Name</dt>
                <dd className="font-medium text-slate-900">{applicant.aspirant_name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500 flex items-center gap-1">
                  <HiEnvelope className="h-3.5 w-3" /> Email
                </dt>
                <dd>
                  <a
                    href={`mailto:${applicant.aspirant_email ?? ''}`}
                    className="text-indigo-600 hover:underline"
                  >
                    {applicant.aspirant_email ?? '—'}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 flex items-center gap-1">
                  <HiPhone className="h-3.5 w-3" /> Phone
                </dt>
                <dd className="text-slate-900">{applicant.aspirant_phone || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500 flex items-center gap-1">
                  <HiMapPin className="h-3.5 w-3" /> City
                </dt>
                <dd className="text-slate-900">{applicant.aspirant_city ?? '—'}</dd>
              </div>
            </dl>
          </section>

          {/* Education */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
              <HiAcademicCap className="h-4 w-4 text-indigo-600" />
              Education
            </h3>
            <dl className="space-y-2 text-sm">
              {edu.tenth && (edu.tenth.marks || edu.tenth.year) && (
                <div className="p-3 rounded-lg bg-slate-50">
                  <dt className="text-slate-500 text-xs font-medium uppercase tracking-wide">10th</dt>
                  <dd>
                    {[edu.tenth.marks, edu.tenth.year].filter(Boolean).join(' · ') || '—'}
                  </dd>
                </div>
              )}
              {edu.twelfth && (edu.twelfth.marks || edu.twelfth.year) && (
                <div className="p-3 rounded-lg bg-slate-50">
                  <dt className="text-slate-500 text-xs font-medium uppercase tracking-wide">12th</dt>
                  <dd>
                    {[edu.twelfth.marks, edu.twelfth.year].filter(Boolean).join(' · ') || '—'}
                  </dd>
                </div>
              )}
              {edu.graduation && (edu.graduation.type || edu.graduation.branch || edu.graduation.year) && (
                <div className="p-3 rounded-lg bg-slate-50">
                  <dt className="text-slate-500 text-xs font-medium uppercase tracking-wide">Graduation</dt>
                  <dd>
                    {[edu.graduation.type, edu.graduation.branch, edu.graduation.year].filter(Boolean).join(' · ') || '—'}
                  </dd>
                </div>
              )}
              {!edu.tenth?.marks && !edu.twelfth?.marks && !edu.graduation?.type && (
                <p className="text-slate-500 text-sm">No education details provided.</p>
              )}
            </dl>
          </section>

          {/* Skills */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
              <HiTag className="h-4 w-4 text-indigo-600" />
              Skills
            </h3>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 text-sm font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No skills listed.</p>
            )}
          </section>

          {/* Resume */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
              <HiDocumentArrowDown className="h-4 w-4 text-indigo-600" />
              Resume
            </h3>
            {applicant.aspirant_resume_url ? (
              <div className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 bg-slate-50">
                <HiDocumentArrowDown className="h-8 w-8 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  {resumeSignedUrl ? (
                    <a
                      href={resumeSignedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 font-medium hover:underline"
                    >
                      View resume →
                    </a>
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
      </div>
    </div>
  );
}

/** Public apply from job page (no account) — stored in free_job_leads */
function FreeLeadDetailModal({ lead, onClose, onSetStatus, statusUpdatingId }) {
  const [resumeSignedUrl, setResumeSignedUrl] = useState(null);

  useEffect(() => {
    if (!lead?.resume_url) {
      setResumeSignedUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.storage
        .from('resumes')
        .createSignedUrl(lead.resume_url, 3600);
      if (!cancelled && !error && data?.signedUrl) setResumeSignedUrl(data.signedUrl);
      else if (!cancelled) setResumeSignedUrl(null);
    })();
    return () => { cancelled = true; };
  }, [lead?.resume_url]);

  if (!lead) return null;

  const st = lead.status ?? 'applied';
  const busy = statusUpdatingId === lead.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60" aria-hidden onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-amber-50 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Public application</h2>
            <p className="text-xs text-amber-800 mt-0.5">Applied from job page without logging in — not a platform user yet.</p>
            <span
              className={`mt-2 inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                st === 'shortlisted'
                  ? 'bg-emerald-100 text-emerald-800'
                  : st === 'rejected'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-slate-100 text-slate-700'
              }`}
            >
              {st}
            </span>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:bg-white/80" aria-label="Close">
            <HiXMark className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4 text-sm">
          <dl className="grid gap-2">
            <div><dt className="text-slate-500">Name</dt><dd className="font-medium text-slate-900">{lead.name}</dd></div>
            <div><dt className="text-slate-500">Email</dt><dd><a href={`mailto:${lead.email}`} className="text-indigo-600 hover:underline">{lead.email}</a></dd></div>
            <div><dt className="text-slate-500">Phone</dt><dd>{lead.contact_number}</dd></div>
            <div>
              <dt className="text-slate-500">Current location</dt>
              <dd className="font-medium text-slate-900">{lead.current_location?.trim() || '—'}</dd>
            </div>
            <div><dt className="text-slate-500">Track</dt><dd className="capitalize">{lead.track}</dd></div>
            <div><dt className="text-slate-500">Skills</dt><dd>{lead.skills}</dd></div>
            {lead.experience_years && <div><dt className="text-slate-500">Experience</dt><dd>{lead.experience_years}</dd></div>}
            {lead.previous_company && <div><dt className="text-slate-500">Previous company</dt><dd>{lead.previous_company}</dd></div>}
            {lead.extra_note && <div><dt className="text-slate-500">Note</dt><dd className="whitespace-pre-wrap">{lead.extra_note}</dd></div>}
          </dl>
          {resumeSignedUrl ? (
            <a href={resumeSignedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700">
              <HiDocumentArrowDown className="w-4 h-4" /> Download resume
            </a>
          ) : lead.resume_url ? (
            <span className="text-slate-500 text-xs">Loading resume link…</span>
          ) : null}

          {onSetStatus ? (
            <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              {busy ? (
                <span className="inline-flex items-center gap-2 text-slate-500 text-sm">
                  <Loader size="xs" /> Updating…
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onSetStatus(lead.id, 'shortlisted')}
                    disabled={st === 'shortlisted'}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Shortlist
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetStatus(lead.id, 'rejected')}
                    disabled={st === 'rejected'}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-800 hover:bg-red-100 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  {st !== 'applied' && (
                    <button
                      type="button"
                      onClick={() => onSetStatus(lead.id, 'applied')}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Reset to applied
                    </button>
                  )}
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function AdminJobApplicantsPage() {
  const { id: jobId } = useParams();
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [freeLeads, setFreeLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [freeLeadsLoading, setFreeLeadsLoading] = useState(true);
  const [freeLeadDetail, setFreeLeadDetail] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [freeLeadUpdatingId, setFreeLeadUpdatingId] = useState(null);
  const [profileApplicant, setProfileApplicant] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [spotlightForm, setSpotlightForm] = useState({
    show_on_landing: false,
    hiring_spotlight: false,
    hiring_spotlight_order: 100,
  });
  const [spotlightSaving, setSpotlightSaving] = useState(false);
  const [spotlightMessage, setSpotlightMessage] = useState({ type: '', text: '' });
  const [landingNotices, setLandingNotices] = useState([]);
  const [noticeBody, setNoticeBody] = useState('');
  const [noticeBusy, setNoticeBusy] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState({ type: '', text: '' });
  const [spotlightModalOpen, setSpotlightModalOpen] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    const fetchJob = async () => {
      const { data } = await supabase
        .from('jobs')
        .select('id, title, company_name, status, show_on_landing, hiring_spotlight, hiring_spotlight_order')
        .eq('id', jobId)
        .single();
      setJob(data ?? null);
      if (data) {
        setSpotlightForm({
          show_on_landing: data.show_on_landing ?? false,
          hiring_spotlight: data.hiring_spotlight ?? false,
          hiring_spotlight_order:
            data.hiring_spotlight_order != null ? Number(data.hiring_spotlight_order) : 100,
        });
      }
    };
    fetchJob();
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;
    (async () => {
      const { data } = await supabase
        .from('job_landing_notices')
        .select('id, body, created_at')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });
      setLandingNotices(data ?? []);
    })();
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;
    const fetchApplications = async () => {
      const { data, error } = await supabase.rpc('get_job_applications', { p_job_id: jobId });
      if (!error && data) setApplications(Array.isArray(data) ? data : []);
      setLoading(false);
    };
    fetchApplications();
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;
    const fetchFreeLeads = async () => {
      setFreeLeadsLoading(true);
      const { data, error } = await supabase
        .from('free_job_leads')
        .select('id, name, email, contact_number, current_location, skills, track, created_at, resume_url, status')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });
      if (!error && data) setFreeLeads(data);
      else setFreeLeads([]);
      setFreeLeadsLoading(false);
    };
    fetchFreeLeads();
  }, [jobId]);

  const handleSetStatus = async (appId, status) => {
    setActionError(null);
    setUpdatingId(appId);
    const { data, error } = await supabase.rpc('set_application_status', {
      p_application_id: appId,
      p_status: status,
    });
    setUpdatingId(null);
    if (error) {
      setActionError(error.message ?? 'Could not update application.');
      return;
    }
    if (data?.ok) {
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status } : a))
      );
    } else {
      setActionError(data?.error ?? 'Could not update application.');
    }
  };

  const leadStatus = (row) => row.status ?? 'applied';

  const handleSetFreeLeadStatus = async (leadId, status) => {
    setActionError(null);
    setFreeLeadUpdatingId(leadId);
    const { data, error } = await supabase.rpc('set_free_job_lead_status', {
      p_lead_id: leadId,
      p_status: status,
    });
    setFreeLeadUpdatingId(null);
    if (error) {
      setActionError(error.message ?? 'Could not update public lead.');
      return;
    }
    if (data?.ok) {
      setFreeLeads((prev) =>
        prev.map((r) => (r.id === leadId ? { ...r, status } : r))
      );
      setFreeLeadDetail((cur) => (cur?.id === leadId ? { ...cur, status } : cur));
    } else {
      setActionError(data?.error ?? 'Could not update public lead.');
    }
  };

  const saveSpotlightSettings = async () => {
    if (!jobId) return;
    setSpotlightMessage({ type: '', text: '' });
    setSpotlightSaving(true);
    const { data, error } = await supabase
      .from('jobs')
      .update({
        show_on_landing: spotlightForm.show_on_landing,
        hiring_spotlight: spotlightForm.hiring_spotlight,
        hiring_spotlight_order: Number.isFinite(Number(spotlightForm.hiring_spotlight_order))
          ? Number(spotlightForm.hiring_spotlight_order)
          : 100,
      })
      .eq('id', jobId)
      .select('id, title, company_name, status, show_on_landing, hiring_spotlight, hiring_spotlight_order')
      .single();
    setSpotlightSaving(false);
    if (error) {
      setSpotlightMessage({ type: 'error', text: error.message ?? 'Could not save spotlight settings.' });
      return;
    }
    if (data) {
      setJob(data);
      setSpotlightForm({
        show_on_landing: data.show_on_landing ?? false,
        hiring_spotlight: data.hiring_spotlight ?? false,
        hiring_spotlight_order:
          data.hiring_spotlight_order != null ? Number(data.hiring_spotlight_order) : 100,
      });
    }
    setSpotlightMessage({ type: 'success', text: 'Spotlight settings updated.' });
  };

  const addLandingNotice = async () => {
    const t = noticeBody.trim();
    if (!t || !jobId) return;
    setNoticeMessage({ type: '', text: '' });
    setNoticeBusy(true);
    const { data, error } = await supabase
      .from('job_landing_notices')
      .insert({ job_id: jobId, body: t })
      .select('id, body, created_at')
      .single();
    setNoticeBusy(false);
    if (error) {
      setNoticeMessage({ type: 'error', text: error.message ?? 'Could not post notice.' });
      return;
    }
    if (data) {
      setLandingNotices((prev) => [data, ...prev]);
      setNoticeBody('');
      setNoticeMessage({ type: 'success', text: 'Notice posted.' });
    }
  };

  const deleteLandingNotice = async (noticeId) => {
    if (!jobId) return;
    setNoticeMessage({ type: '', text: '' });
    const { error } = await supabase.from('job_landing_notices').delete().eq('id', noticeId);
    if (error) {
      setNoticeMessage({ type: 'error', text: error.message ?? 'Could not delete notice.' });
      return;
    }
    setLandingNotices((prev) => prev.filter((n) => n.id !== noticeId));
  };

  if (!jobId) return null;
  if (loading) return <PageLoader size="lg" label="Loading applicants…" className="py-12" variant="dots" />;

  return (
    <div>
      <Link
        to="/admin/jobs"
        className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 text-sm mb-4"
      >
        Back to jobs
      </Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Applicants</h1>
      <p className="text-slate-600 mb-2">
        {job?.title} at {job?.company_name}.
      </p>
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setSpotlightModalOpen(true)}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Home page spotlight controls
        </button>
      </div>
      {actionError ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {actionError}
        </div>
      ) : null}

      <h2 className="text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2">
        <span className="inline-flex items-center rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">Platform</span>
        Registered applicants
      </h2>
      <p className="text-slate-600 text-sm mb-3">Shortlist or reject based on skills. Rejected applications refund the student’s monthly limit.</p>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden mb-10">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700">Student</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Email</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Applied at</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No applicants yet for this job.
                </td>
              </tr>
            ) : (
              applications.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-900">{a.aspirant_name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{a.aspirant_email ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(a.created_at)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        a.status === 'shortlisted'
                          ? 'bg-emerald-100 text-emerald-700'
                          : a.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {a.status === 'shortlisted' && (
                        <Link
                          to="/admin/messages"
                          state={{ openAspirantId: a.aspirant_id, openAspirantName: a.aspirant_name }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 transition-colors"
                        >
                          <HiChatBubbleLeftRight className="w-3.5 h-3.5" />
                          Send message
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => setProfileApplicant(a)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors"
                      >
                        View profile
                      </button>
                      {updatingId === a.id ? (
                        <span className="inline-flex items-center gap-1.5 text-slate-400 text-xs"><Loader size="xs" /> Updating…</span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSetStatus(a.id, 'shortlisted')}
                            disabled={a.status === 'shortlisted'}
                            className="text-emerald-600 hover:underline font-medium disabled:opacity-50 disabled:no-underline text-xs"
                          >
                            Shortlist
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetStatus(a.id, 'rejected')}
                            disabled={a.status === 'rejected'}
                            className="text-red-600 hover:underline font-medium disabled:opacity-50 disabled:no-underline text-xs"
                          >
                            Reject
                          </button>
                          {a.status !== 'applied' && (
                            <button
                              type="button"
                              onClick={() => handleSetStatus(a.id, 'applied')}
                              className="text-slate-600 hover:underline font-medium text-xs"
                            >
                              Reset
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 className="text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
          <HiGlobeAlt className="w-3.5 h-3.5" /> Public
        </span>
        Job page applications (no account)
      </h2>
      <p className="text-slate-600 text-sm mb-3">
        These leads applied via the free apply form on the public job page. Shortlist standout candidates; they are not in your users list until they sign up.
      </p>
      <div className="rounded-xl border border-amber-200 bg-white overflow-hidden">
        {freeLeadsLoading ? (
          <div className="px-4 py-8 flex justify-center"><Loader size="sm" /></div>
        ) : freeLeads.length === 0 ? (
          <p className="px-4 py-8 text-center text-slate-500 text-sm">No public applications for this job yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-amber-50/80 border-b border-amber-100">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700">Name</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Email</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Phone</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Location</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Track</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Applied</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {freeLeads.map((row) => {
                const st = leadStatus(row);
                return (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-amber-50/30">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                    <td className="px-4 py-3 text-slate-600">{row.email}</td>
                    <td className="px-4 py-3 text-slate-600">{row.contact_number}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[10rem] truncate" title={row.current_location || ''}>
                      {row.current_location?.trim() || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{row.track}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(row.created_at)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          st === 'shortlisted'
                            ? 'bg-emerald-100 text-emerald-700'
                            : st === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {st}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFreeLeadDetail(row)}
                          className="text-indigo-600 hover:underline font-medium text-xs"
                        >
                          View
                        </button>
                        {freeLeadUpdatingId === row.id ? (
                          <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
                            <Loader size="xs" /> Updating…
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSetFreeLeadStatus(row.id, 'shortlisted')}
                              disabled={st === 'shortlisted'}
                              className="text-emerald-600 hover:underline font-medium disabled:opacity-50 disabled:no-underline text-xs"
                            >
                              Shortlist
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetFreeLeadStatus(row.id, 'rejected')}
                              disabled={st === 'rejected'}
                              className="text-red-600 hover:underline font-medium disabled:opacity-50 disabled:no-underline text-xs"
                            >
                              Reject
                            </button>
                            {st !== 'applied' && (
                              <button
                                type="button"
                                onClick={() => handleSetFreeLeadStatus(row.id, 'applied')}
                                className="text-slate-600 hover:underline font-medium text-xs"
                              >
                                Reset
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {profileApplicant && (
        <ApplicantProfileModal
          applicant={profileApplicant}
          onClose={() => setProfileApplicant(null)}
        />
      )}
      {freeLeadDetail && (
        <FreeLeadDetailModal
          lead={freeLeadDetail}
          onClose={() => setFreeLeadDetail(null)}
          onSetStatus={handleSetFreeLeadStatus}
          statusUpdatingId={freeLeadUpdatingId}
        />
      )}
      {spotlightModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60" aria-hidden onClick={() => setSpotlightModalOpen(false)} />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Home page spotlight controls</h2>
              <button
                type="button"
                onClick={() => setSpotlightModalOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close spotlight controls"
              >
                <HiXMark className="h-5 w-5" />
              </button>
            </div>
            {job?.status !== 'open' ? (
              <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                This job is currently <strong>{job?.status ?? 'unknown'}</strong>. Spotlight only appears for <strong>open</strong> jobs.
              </p>
            ) : null}
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-slate-200 bg-white p-4">
                <input
                  type="checkbox"
                  checked={spotlightForm.show_on_landing}
                  onChange={(e) => setSpotlightForm((p) => ({ ...p, show_on_landing: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0"
                />
                <span className="text-sm font-semibold text-slate-900">Show on landing page (job listings)</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-slate-200 bg-white p-4">
                <input
                  type="checkbox"
                  checked={spotlightForm.hiring_spotlight}
                  onChange={(e) => setSpotlightForm((p) => ({ ...p, hiring_spotlight: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0"
                />
                <span className="text-sm font-semibold text-slate-900">Hiring spotlight on home page (updates block)</span>
              </label>
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">Spotlight sort order</label>
                <input
                  type="number"
                  value={spotlightForm.hiring_spotlight_order}
                  onChange={(e) => setSpotlightForm((p) => ({ ...p, hiring_spotlight_order: e.target.value }))}
                  className="w-full max-w-48 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/12 outline-none transition"
                  placeholder="100"
                />
              </div>
              {spotlightMessage.text ? (
                <p className={`text-sm font-semibold ${spotlightMessage.type === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>
                  {spotlightMessage.text}
                </p>
              ) : null}
              <button
                type="button"
                onClick={saveSpotlightSettings}
                disabled={spotlightSaving}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {spotlightSaving ? 'Saving…' : 'Save spotlight settings'}
              </button>
            </div>
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">Landing notices (public)</h3>
              <div className="mt-3 space-y-3">
                {noticeMessage.text ? (
                  <p className={`text-sm font-semibold ${noticeMessage.type === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>
                    {noticeMessage.text}
                  </p>
                ) : null}
                <textarea
                  value={noticeBody}
                  onChange={(e) => setNoticeBody(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/12 outline-none transition resize-y min-h-20"
                  placeholder="e.g. Interviews moved to 25 Mar; bring ID proof."
                />
                <button
                  type="button"
                  onClick={addLandingNotice}
                  disabled={noticeBusy || !noticeBody.trim()}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {noticeBusy ? 'Posting…' : 'Post notice'}
                </button>
              </div>
              {landingNotices.length > 0 ? (
                <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-100">
                  {landingNotices.map((n) => (
                    <li key={n.id} className="flex gap-3 p-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="text-slate-900 whitespace-pre-wrap">{n.body}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {new Date(n.created_at).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteLandingNotice(n.id)}
                        className="shrink-0 self-start rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Delete notice"
                      >
                        <HiTrash className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-slate-500">No notices yet for this job.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
