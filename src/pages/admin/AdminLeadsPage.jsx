import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PageLoader } from '../../components/ui/Loader';

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.rpc('get_admin_pricing_leads');
      setLeads(Array.isArray(data) ? data : []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <PageLoader size="md" label="Loading leads…" className="py-12" />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Pricing leads</h1>
      <p className="text-slate-600 text-sm mb-6">
        Leads captured when users select a plan on the pricing page (no sign up).
      </p>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700">Date</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Plan</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Track</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Name</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Role</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Email</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Contact</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Graduation</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Company</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Exp</th>
                <th className="px-4 py-3 font-semibold text-slate-700">CTC</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-slate-500">
                    No leads yet.
                  </td>
                </tr>
              ) : (
                leads.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(row.created_at)}</td>
                    <td className="px-4 py-3 text-slate-900 font-medium">{row.plan_id}</td>
                    <td className="px-4 py-3 text-slate-600">{row.track}</td>
                    <td className="px-4 py-3 text-slate-600">{row.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[140px] truncate" title={row.looking_for_role ?? ''}>{row.looking_for_role ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-900">{row.email}</td>
                    <td className="px-4 py-3 text-slate-600">{row.contact_number}</td>
                    <td className="px-4 py-3 text-slate-600">{row.graduation_pass ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{row.current_company ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{row.experience_years ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{row.current_ctc ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[220px] text-xs whitespace-pre-wrap">{row.message ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
