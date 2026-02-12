import { dummyJobs } from '../data/dummyDashboard';
import JobsList from './components/JobsList';

export default function JobsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[rgb(var(--nth-text-primary-light))]">Find Work</h1>
          <p className="text-[rgb(var(--nth-text-secondary-light))] mt-1">
            Browse open positions tailored for you.
          </p>
        </div>
      </div>

      <JobsList jobs={dummyJobs} />
    </div>
  );
}
