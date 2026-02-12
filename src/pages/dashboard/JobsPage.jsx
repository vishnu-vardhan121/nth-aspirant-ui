import { dummyJobs } from './data/dummyDashboard';
import JobsTable from './components/JobsTable';

export default function JobsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Jobs</h1>
      <JobsTable jobs={dummyJobs} />
    </div>
  );
}
