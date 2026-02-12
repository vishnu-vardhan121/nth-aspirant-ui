import { dummyApplications } from '../data/dummyDashboard';
import ApplicationsList from './components/ApplicationsList';

export default function ApplicationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">My Applications</h1>
      <ApplicationsList applications={dummyApplications} />
    </div>
  );
}
