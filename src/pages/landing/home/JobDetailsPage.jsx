import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { HiMapPin, HiBriefcase, HiCalendarDays, HiArrowLeft, HiBuildingOffice2 } from 'react-icons/hi2';
import { supabase } from '../../../lib/supabase';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import Seo from '../../../components/Seo';
import SectionContainer from '../../../components/SectionContainer';
import { PageLoader } from '../../../components/ui/Loader';
import FreeJobApplicationForm from './components/FreeJobApplicationForm';

export default function JobDetailsPage() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();
      
      if (!error && data) {
        setJob(data);
      }
      setLoading(false);
    };
    fetchJob();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <PageLoader size="lg" label="Loading job details..." />
        </div>
        <Footer />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Job Not Found</h2>
          <p className="text-slate-600 mb-8">The job you are looking for does not exist or has been removed.</p>
          <Link to="/" className="nth-btn-primary px-6 py-3 rounded-xl font-bold">
            Back to Home
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const isExpired = job.application_deadline && new Date() > new Date(job.application_deadline);

  return (
    <div className="min-h-screen bg-slate-50">
      <Seo 
        title={`${job.title} at ${job.company_name} | NTH`}
        description={`Apply for ${job.title} at ${job.company_name}. ${job.description?.slice(0, 150)}...`}
      />
      <Navbar />

      <main className="py-12 md:py-16">
        <SectionContainer>
          <div className="mb-8">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-medium transition-colors"
            >
              <HiArrowLeft className="w-4 h-4" />
              Back to Jobs
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Job Info */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                  <div className="flex items-start gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0 text-indigo-600">
                      <HiBuildingOffice2 className="w-8 h-8" />
                    </div>
                    <div>
                      <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2 leading-tight">
                        {job.title}
                      </h1>
                      <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-slate-600 font-medium">
                        <p className="text-lg text-indigo-600">{job.company_name}</p>
                        <span className="w-1 h-1 rounded-full bg-slate-300 hidden md:block" />
                        {job.location && job.location !== '—' && (
                          <div className="flex items-center gap-1.5">
                            <HiMapPin className="w-5 h-5 text-slate-400" />
                            {job.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold">
                      {job.job_type || 'Full-time'}
                    </span>
                    {job.salary_range && (
                      <span className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-bold">
                        {job.salary_range}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 py-6 border-y border-slate-100">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Experience</span>
                    <div className="flex items-center gap-2 text-slate-800 font-bold">
                      <HiBriefcase className="w-5 h-5 text-indigo-500" />
                      {job.experience_level || '0-3 Years'}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deadline</span>
                    <div className="flex items-center gap-2 text-slate-800 font-bold">
                      <HiCalendarDays className="w-5 h-5 text-indigo-500" />
                      {job.application_deadline ? new Date(job.application_deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Flexible'}
                    </div>
                  </div>
                  {job.location && job.location !== '—' && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Location</span>
                      <div className="flex items-center gap-2 text-slate-800 font-bold">
                        <HiMapPin className="w-5 h-5 text-indigo-500" />
                        {job.location}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-8">
                  <section>
                    <h2 className="text-xl font-bold text-slate-900 mb-4">Job Description</h2>
                    <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {job.description || 'No description provided.'}
                    </div>
                  </section>

                  {job.requirements && job.requirements.length > 0 && (
                    <section>
                      <h2 className="text-xl font-bold text-slate-900 mb-4">Key Responsibilities / Requirements</h2>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {job.requirements.map((req, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-slate-600">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Apply Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16" />
                  
                  <h3 className="text-lg font-bold text-slate-900 mb-4 relative z-10">Interested in this role?</h3>
                  <p className="text-slate-600 text-sm mb-6 relative z-10">
                    Submit your application today. Our team will review your profile and get back to you if there's a match.
                  </p>

                  {isExpired ? (
                    <div className="w-full text-center px-6 py-4 rounded-2xl bg-slate-100 text-slate-500 font-bold border border-slate-200 cursor-not-allowed">
                      Applications Closed
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowApplyModal(true)}
                      className="w-full nth-btn-primary px-6 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all flex items-center justify-center gap-3 group"
                    >
                      Apply Now
                      <HiArrowLeft className="w-5 h-5 rotate-180 group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}

                  <div className="mt-6 pt-6 border-t border-slate-50 flex flex-col gap-4 text-xs font-medium text-slate-500">
                    <div className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-indigo-500" />
                       Free application for everyone
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-indigo-500" />
                       Direct connection with recruiters
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200/50">
                   <h3 className="text-lg font-bold mb-2">Want to boost your chances?</h3>
                   <p className="text-indigo-100 text-sm mb-6 leading-relaxed">
                     Get direct interview slots and expert mock interview practice with our Premium plans.
                   </p>
                   <Link 
                     to="/pricing"
                     className="block w-full text-center px-6 py-3 rounded-xl bg-white text-indigo-600 font-bold hover:bg-slate-50 transition-colors"
                   >
                     View Pricing
                   </Link>
                </div>
              </div>
            </div>
          </div>
        </SectionContainer>
      </main>

      <Footer />

      {/* Application Modal */}
      {showApplyModal && (
        <FreeJobApplicationForm 
          jobId={job.id} 
          jobTitle={job.title} 
          onClose={() => setShowApplyModal(false)} 
        />
      )}
    </div>
  );
}
