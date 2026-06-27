import { useState, useEffect, useCallback } from 'react';
import { useAppSelector } from '../../store/hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { HiXMark, HiPlus } from 'react-icons/hi2';
import { supabase } from '../../lib/supabase';
import { getEdgeFunctionErrorMessage } from '../../lib/edgeFunctionError';
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

function AddAdminModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin',
    type: '',
    contact: '',
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    if (!form.name?.trim() || !form.email?.trim() || !form.password) {
      setMessage({ type: 'error', text: 'Name, email, and password are required.' });
      return;
    }
    if (form.password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    setSubmitting(true);
    const { data: sessionData } = await supabase.auth.getSession();
    let token = sessionData?.session?.access_token;
    if (!token) {
      const { data: refreshData } = await supabase.auth.refreshSession();
      token = refreshData?.session?.access_token;
    }
    if (!token) {
      setSubmitting(false);
      setMessage({ type: 'error', text: 'Session expired. Please sign out and sign in again, then try Add Admin.' });
      return;
    }
    const { data, error } = await supabase.functions.invoke('create-admin', {
      body: {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role || 'admin',
        type: form.type?.trim() || null,
        contact: form.contact?.trim() || null,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setSubmitting(false);
    const serverError = data?.error != null ? String(data.error) : null;
    if (serverError || error) {
      setMessage({
        type: 'error',
        text: getEdgeFunctionErrorMessage({
          error,
          data,
          fallback: 'Failed to create admin.',
        }),
      });
      return;
    }
    onSuccess?.();
    onClose?.();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Add Admin</h2>
            <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close">
              <HiXMark className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {message.text && (
              <p className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message.text}</p>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Full name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                placeholder="admin@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Min 6 characters"
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type (optional)</label>
              <input
                type="text"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                placeholder="e.g. HR, Tech"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact (optional)</label>
              <input
                type="text"
                value={form.contact}
                onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Phone or other"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-3 py-2 text-sm font-medium text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? 'Creating…' : 'Create Admin'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function AdminAdminsPage() {
  const adminProfile = useAppSelector((state) => state.admin.profile);
  const isSuperAdmin = adminProfile?.role === 'super admin';
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Admins</h1>
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            <HiPlus className="w-4 h-4" />
            Add Admin
          </button>
        )}
      </div>
      {showAddModal && (
        <AddAdminModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { loadAdmins(); }}
        />
      )}
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
