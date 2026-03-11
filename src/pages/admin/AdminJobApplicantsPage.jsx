import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader, PageLoader } from '../../components/ui/Loader';
import {
  HiArrowLeft,
  HiXMark,
  HiUser,
  HiEnvelope,
  HiPhone,
  HiMapPin,
  HiAcademicCap,
  HiTag,
  HiDocumentArrowDown,
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

export default function AdminJobApplicantsPage() {
  const { id: jobId } = useParams();
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [profileApplicant, setProfileApplicant] = useState(null);

  useEffect(() => {
    if (!jobId) return;
    const fetchJob = async () => {
      const { data } = await supabase.from('jobs').select('id, title, company_name').eq('id', jobId).single();
      setJob(data ?? null);
    };
    fetchJob();
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

  const handleSetStatus = async (appId, status) => {
    setUpdatingId(appId);
    const { data } = await supabase.rpc('set_application_status', {
      p_application_id: appId,
      p_status: status,
    });
    setUpdatingId(null);
    if (data?.ok) {
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status } : a))
      );
    }
  };

  if (!jobId) return null;
  if (loading) return <PageLoader size="lg" label="Loading applicants…" className="py-12" variant="dots" />;

  return (
    <div>
      <Link
        to="/admin/jobs"
        className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 text-sm mb-4"
      >
        <HiArrowLeft className="w-4 h-4" />
        Back to jobs
      </Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Applicants</h1>
      <p className="text-slate-600 mb-6">
        {job?.title} at {job?.company_name}. Shortlist or reject based on skills. Rejected applications refund the student’s monthly limit.
      </p>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
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

      {profileApplicant && (
        <ApplicantProfileModal
          applicant={profileApplicant}
          onClose={() => setProfileApplicant(null)}
        />
      )}
    </div>
  );
}
