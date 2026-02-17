import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { PageLoader } from '../../components/ui/Loader';
import { HiUserPlus } from 'react-icons/hi2';

export default function AdminAdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdmins = async () => {
      const { data, error } = await supabase.from('admins').select('*').order('created_at', { ascending: false });
      if (!error) setAdmins(data ?? []);
      setLoading(false);
    };
    fetchAdmins();
  }, []);

  if (loading) return <PageLoader size="md" label="Loading admins…" className="py-12" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Admins</h1>
        <Link
          to="/admin/admins/create"
          className="nth-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium"
        >
          <HiUserPlus className="w-5 h-5" />
          Add admin
        </Link>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700">Name</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Email</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Role / Type</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Created by</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id} className="border-b border-slate-100">
                <td className="px-4 py-3 text-slate-900">{a.name}</td>
                <td className="px-4 py-3 text-slate-600">{a.email}</td>
                <td className="px-4 py-3 text-slate-600">{a.role} {a.type ? ` / ${a.type}` : ''}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{a.created_by ? String(a.created_by).slice(0, 8) + '…' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {admins.length === 0 && (
          <p className="px-4 py-8 text-center text-slate-500">No admins yet. Create one to get started.</p>
        )}
      </div>
    </div>
  );
}
