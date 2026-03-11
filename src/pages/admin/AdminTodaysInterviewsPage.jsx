import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { PageLoader } from '../../components/ui/Loader';
import { HiPencil, HiTrash, HiPlus, HiArrowUpTray } from 'react-icons/hi2';

const LEVELS = ['Fresher', 'Experienced'];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function parseBulkJSON(text) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  try {
    const data = JSON.parse(trimmed);
    const arr = Array.isArray(data) ? data : [data];
    return arr
      .map((row) => {
        const name = (row.name ?? row.Name ?? '').toString().trim();
        const role = (row.role ?? row.Role ?? '').toString().trim();
        let level = (row.level ?? row.Level ?? 'Fresher').toString().trim();
        if (!LEVELS.includes(level)) level = 'Fresher';
        return { name, role, level };
      })
      .filter((r) => r.name || r.role);
  } catch {
    return null;
  }
}

function parseBulkCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  return lines.map((line) => {
    const parts = line.split(',').map((p) => p.trim());
    const name = parts[0] ?? '';
    const role = parts[1] ?? '';
    let level = (parts[2] ?? 'Fresher').trim();
    if (!LEVELS.includes(level)) level = 'Fresher';
    return { name, role, level };
  }).filter((r) => r.name || r.role);
}

export default function AdminTodaysInterviewsPage() {
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', role: '', level: 'Fresher' });
  const [bulkMode, setBulkMode] = useState('json');
  const [bulkText, setBulkText] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', role: '', level: 'Fresher' });

  const fetchList = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('todays_interviews')
      .select('id, name, role, level, display_order')
      .eq('interview_date', selectedDate)
      .order('display_order');
    if (!error) setList(data ?? []);
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const { name, role, level } = addForm;
    if (!name.trim()) {
      showMsg('error', 'Name is required.');
      return;
    }
    setAdding(true);
    const { error } = await supabase.from('todays_interviews').insert({
      interview_date: selectedDate,
      name: name.trim(),
      role: (role || '').trim(),
      level: level || 'Fresher',
      display_order: list.length,
    });
    setAdding(false);
    if (error) {
      showMsg('error', error.message);
      return;
    }
    setAddForm({ name: '', role: '', level: 'Fresher' });
    showMsg('success', 'Added.');
    fetchList();
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setEditForm({ name: row.name, role: row.role, level: row.level });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', role: '', level: 'Fresher' });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingId) return;
    const { name, role, level } = editForm;
    if (!name.trim()) {
      showMsg('error', 'Name is required.');
      return;
    }
    const { error } = await supabase
      .from('todays_interviews')
      .update({
        name: name.trim(),
        role: (role || '').trim(),
        level: level || 'Fresher',
      })
      .eq('id', editingId);
    if (error) {
      showMsg('error', error.message);
      return;
    }
    setEditingId(null);
    setEditForm({ name: '', role: '', level: 'Fresher' });
    showMsg('success', 'Updated.');
    fetchList();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this entry?')) return;
    const { error } = await supabase.from('todays_interviews').delete().eq('id', id);
    if (error) {
      showMsg('error', error.message);
      return;
    }
    showMsg('success', 'Removed.');
    fetchList();
  };

  const handleBulkImport = async (e) => {
    e.preventDefault();
    const text = bulkText.trim();
    if (!text) {
      showMsg('error', 'Paste JSON array or CSV first.');
      return;
    }
    const rows = bulkMode === 'json' ? parseBulkJSON(text) : parseBulkCSV(text);
    if (bulkMode === 'json' && rows === null) {
      showMsg('error', 'Invalid JSON.');
      return;
    }
    if (!rows.length) {
      showMsg('error', 'No valid rows (need name, role, level).');
      return;
    }
    setBulkSaving(true);
    let inserted = 0;
    const nextOrder = list.length;
    for (let i = 0; i < rows.length; i++) {
      const { name, role, level } = rows[i];
      const { error } = await supabase.from('todays_interviews').insert({
        interview_date: selectedDate,
        name: name || '—',
        role: role || '—',
        level: level || 'Fresher',
        display_order: nextOrder + i,
      });
      if (!error) inserted++;
    }
    setBulkSaving(false);
    setBulkText('');
    showMsg('success', `Imported ${inserted} of ${rows.length} rows.`);
    fetchList();
  };

  if (loading && list.length === 0) return <PageLoader size="md" label="Loading…" className="py-12" />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Today&apos;s Interviews (Hero)</h1>
      <p className="text-sm text-slate-600 mb-6">
        Manage the interview ticker by date. Only the selected date is shown on the landing hero when it matches
        &quot;today&quot; (India). No data for that day = ticker hidden.
      </p>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <label className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Date</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      {message.text && (
        <div
          className={`mb-4 px-4 py-2 rounded-lg text-sm ${
            message.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Add one */}
      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3 mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
          <input
            type="text"
            value={addForm.name}
            onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Rahul K"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-40"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
          <input
            type="text"
            value={addForm.role}
            onChange={(e) => setAddForm((p) => ({ ...p, role: e.target.value }))}
            placeholder="Frontend Developer"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-48"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Level</label>
          <select
            value={addForm.level}
            onChange={(e) => setAddForm((p) => ({ ...p, level: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={adding}
          className="nth-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
        >
          <HiPlus className="w-4 h-4" />
          Add one
        </button>
      </form>

      {/* Bulk upload */}
      <div className="mb-8 p-4 rounded-xl bg-white border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2">
          <HiArrowUpTray className="w-5 h-5" />
          Bulk import
        </h2>
        <div className="flex gap-4 mb-3">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="bulkMode"
              checked={bulkMode === 'json'}
              onChange={() => setBulkMode('json')}
            />
            <span className="text-sm">JSON array</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="bulkMode"
              checked={bulkMode === 'csv'}
              onChange={() => setBulkMode('csv')}
            />
            <span className="text-sm">CSV (name, role, level)</span>
          </label>
        </div>
        {bulkMode === 'json' && (
          <p className="text-xs text-slate-500 mb-2">
            e.g. [{' '}
            <code className="bg-slate-100 px-1 rounded">{'{"name":"Rahul K","role":"Frontend Developer","level":"Fresher"}'}</code>
            , ...]
          </p>
        )}
        {bulkMode === 'csv' && (
          <p className="text-xs text-slate-500 mb-2">
            One row per line: Name, Role, Fresher or Experienced
          </p>
        )}
        <textarea
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder={bulkMode === 'json' ? '[{"name":"...","role":"...","level":"Fresher"}, ...]' : 'Rahul K, Frontend Developer, Fresher\n...'}
          rows={5}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
        />
        <button
          type="button"
          onClick={handleBulkImport}
          disabled={bulkSaving}
          className="mt-2 nth-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
        >
          {bulkSaving ? 'Importing…' : 'Import for this date'}
        </button>
      </div>

      {/* List */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700">#</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Name</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Role</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Level</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No entries for this date. Add one or bulk import.
                </td>
              </tr>
            )}
            {list.map((row, idx) => (
              <tr key={row.id} className="border-b border-slate-100">
                <td className="px-4 py-3 text-slate-600">{idx + 1}</td>
                {editingId === row.id ? (
                  <>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                        className="rounded border border-slate-300 px-2 py-1 text-sm w-32"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={editForm.role}
                        onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
                        className="rounded border border-slate-300 px-2 py-1 text-sm w-40"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={editForm.level}
                        onChange={(e) => setEditForm((p) => ({ ...p, level: e.target.value }))}
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      >
                        {LEVELS.map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2 flex gap-2">
                      <button
                        type="button"
                        onClick={handleUpdate}
                        className="text-emerald-600 hover:underline font-medium text-xs"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="text-slate-500 hover:underline text-xs"
                      >
                        Cancel
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 text-slate-900">{row.name}</td>
                    <td className="px-4 py-3 text-slate-600">{row.role}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        row.level === 'Fresher' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {row.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        className="text-slate-600 hover:text-indigo-600"
                        title="Edit"
                      >
                        <HiPencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id)}
                        className="text-slate-600 hover:text-red-600"
                        title="Delete"
                      >
                        <HiTrash className="w-4 h-4" />
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
