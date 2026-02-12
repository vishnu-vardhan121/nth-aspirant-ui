import { Link } from 'react-router-dom';
import {
  dummyJobs,
  dummyApplications,
  dummyStats,
} from '../data/dummyDashboard';
import StatCard from '../components/StatCard';
import RecentJobsList from './components/RecentJobsList';
import RecentApplicationsList from './components/RecentApplicationsList';

export default function OverviewPage() {
  const recentJobs = dummyJobs.slice(0, 5);
  const recentApplications = dummyApplications.slice(0, 5);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Overview</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Applications sent" value={dummyStats.totalApplications} />
        <StatCard label="Shortlisted" value={dummyStats.shortlisted} />
        <StatCard label="Profile viewed" value={dummyStats.viewed} />
        <StatCard label="Jobs open" value={dummyStats.jobsOpen} />
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent jobs</h2>
          <Link
            to="/dashboard/jobs"
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            View all
          </Link>
        </div>
        <RecentJobsList jobs={recentJobs} />
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent applications</h2>
          <Link
            to="/dashboard/applications"
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            View all
          </Link>
        </div>
        <RecentApplicationsList applications={recentApplications} />
      </section>
    </div>
  );
}
