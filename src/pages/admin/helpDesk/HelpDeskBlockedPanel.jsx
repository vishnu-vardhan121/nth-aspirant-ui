import { useEffect, useState } from 'react';
import { HiNoSymbol } from 'react-icons/hi2';
import {
  fetchHelpDeskBlockedList,
  formatHelpDeskTime,
  unblockHelpDeskUser,
} from '../../../lib/helpDesk';

export default function HelpDeskBlockedPanel({ flash, setFlash, onChanged }) {
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await fetchHelpDeskBlockedList();
    setBlocked(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleUnblock = async (rowEmail) => {
    setFlash({ type: '', text: '' });
    setSaving(true);
    const { data, error } = await unblockHelpDeskUser(rowEmail);
    setSaving(false);
    if (error || !data?.ok) {
      setFlash({ type: 'error', text: data?.error || error?.message || 'Failed to unblock.' });
      return;
    }
    setFlash({ type: 'success', text: 'User unblocked.' });
    await load();
    onChanged?.();
  };

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/30 p-4">
      <div className="flex items-center gap-2">
        <HiNoSymbol className="h-5 w-5 text-red-600" />
        <h2 className="text-sm font-semibold text-slate-900">Blocked users</h2>
      </div>
      <p className="mt-1 text-xs text-slate-600">
        Block from a ticket with <span className="font-medium">Move to blocked inbox</span>. Unblock here to return them to the main inbox.
      </p>

      {flash.text ? (
        <p className={`mt-3 text-sm ${flash.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>{flash.text}</p>
      ) : null}

      <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <p className="px-3 py-4 text-sm text-slate-500">Loading…</p>
        ) : !blocked.length ? (
          <p className="px-3 py-4 text-sm text-slate-500">No blocked users.</p>
        ) : (
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Reason</th>
                <th className="px-3 py-2">Blocked</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {blocked.map((row) => (
                <tr key={row.id} className="border-b border-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-800">{row.email}</td>
                  <td className="px-3 py-2 text-slate-600">{row.reason || '—'}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{formatHelpDeskTime(row.created_at)}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleUnblock(row.email)}
                      className="text-xs font-semibold text-indigo-700 hover:underline disabled:opacity-60"
                    >
                      Unblock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
