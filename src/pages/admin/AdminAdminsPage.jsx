import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { PageLoader } from '../../components/ui/Loader';

const ROLES = [
  { value: 'super admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'assistant admin', label: 'Assistant Admin' },
  { value: 'interviewer', label: 'Interviewer' },
];

function RoleSelect({ admin, onUpdate }) {
  const [updating, setUpdating] = useState(false);
  const handleChange = async (e) => {
    const newRole = e.target.value;
    if (newRole === (admin.role || '')) return;
    setUpdating(true);
    const { error } = await supabase.from('admins').update({ role: newRole }).eq('id', admin.id);
    setUpdating(false);
    if (!error) onUpdate();
  };
  return (
    <select
      value={admin.role || 'admin'}
      onChange={handleChange}
      disabled={updating}
      className="text-sm border border-slate-300 rounded px-2 py-1 bg-white min-w-[120px]"
    >
      {ROLES.map((r) => (
        <option key={r.value} value={r.value}>{r.label}</option>
      ))}
    </select>
  );
}

export default function AdminAdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAdmins = useCallback(async () => {
    const { data, error } = await supabase.from('admins').select('*').order('created_at', { ascending: false });
    if (!error) setAdmins(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  if (loading) return <PageLoader size="md" label="Loading admins…" className="py-12" />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Admins</h1>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700">Name</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Email</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Role</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Type</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Created by</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id} className="border-b border-slate-100">
                <td className="px-4 py-3 text-slate-900">{a.name}</td>
                <td className="px-4 py-3 text-slate-600">{a.email}</td>
                <td className="px-4 py-3">
                  <RoleSelect admin={a} onUpdate={loadAdmins} />
                </td>
                <td className="px-4 py-3 text-slate-600">{a.type || '—'}</td>
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
