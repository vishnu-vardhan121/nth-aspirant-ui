import { useAppSelector } from '../../store/hooks';

export default function AdminOverviewPage() {
  const admin = useAppSelector((state) => state.admin.profile);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Admin overview</h1>
      <p className="text-slate-600 mb-6">
        Welcome, {admin?.name ?? admin?.email}. Role: {admin?.role ?? 'admin'}.
      </p>
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-slate-500 text-sm">Admin panel content (users, aspirants, etc.) can go here.</p>
      </div>
    </div>
  );
}
