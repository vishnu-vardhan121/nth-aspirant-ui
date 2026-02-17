import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { supabase } from '../../lib/supabase';
import { HiArrowLeft } from 'react-icons/hi2';

export default function CreateAdminPage() {
  const currentAdmin = useAppSelector((state) => state.admin.profile);
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const ADMIN_ROLES = [
    { value: 'super admin', label: 'Super Admin' },
    { value: 'admin', label: 'Admin' },
    { value: 'assistant admin', label: 'Assistant Admin' },
  ];

  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    role: 'admin',
    type: '',
    contact: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-admin', {
        body: {
          email: form.email.trim(),
          password: form.password,
          name: form.name.trim(),
          role: form.role.trim() || 'admin',
          type: form.type.trim() || null,
          contact: form.contact.trim() || null,
          created_by: currentAdmin?.id ?? null,
        },
      });
      if (data?.error) throw new Error(data.error);
      if (error) throw error;
      setMessage({ type: 'success', text: 'Admin user created. They can sign in now.' });
      navigate('/admin/admins', { replace: true });
    } catch (err) {
      setMessage({ type: 'error', text: err?.message ?? 'Failed to create admin.' });
    }
    setSubmitting(false);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/admin/admins')}
        className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 text-sm mb-6"
      >
        <HiArrowLeft className="w-4 h-4" />
        Back to admins
      </button>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Create admin user</h1>
      <p className="text-slate-600 text-sm mb-6">
        This will create a new auth user (sign up) and add them to admins. They can sign in and use the admin panel right away.
      </p>

      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            placeholder="admin@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            required
            minLength={6}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            placeholder="Full name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
          <select
            value={form.role}
            onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
          >
            {ADMIN_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
          <input
            type="text"
            value={form.type}
            onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Contact</label>
          <input
            type="text"
            value={form.contact}
            onChange={(e) => setForm((p) => ({ ...p, contact: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            placeholder="Phone or other"
          />
        </div>
        {message.text && (
          <p className={message.type === 'error' ? 'text-red-600 text-sm' : 'text-emerald-600 text-sm'}>
            {message.text}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="nth-btn-primary px-4 py-2 font-medium disabled:opacity-50 disabled:transform-none"
        >
          {submitting ? 'Creating…' : 'Create admin user'}
        </button>
      </form>
    </div>
  );
}
