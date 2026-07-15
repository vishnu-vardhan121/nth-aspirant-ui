import { useState } from 'react';
import { ButtonLoader } from '../../../../components/ui/Loader';

export default function ApiKeyForm({ onSubmit }) {
  const [label, setLabel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [priority, setPriority] = useState('0');
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    const trimmedLabel = label.trim();
    const trimmedKey = apiKey.trim();
    const priorityNum = priority.trim() === '' ? 0 : parseInt(priority, 10);

    if (!trimmedLabel) {
      setLocalError('Label is required.');
      return;
    }
    if (trimmedKey.length < 10) {
      setLocalError('Paste a valid Gemini API key.');
      return;
    }
    if (Number.isNaN(priorityNum)) {
      setLocalError('Priority must be a number.');
      return;
    }

    setSaving(true);
    const ok = await onSubmit({
      label: trimmedLabel,
      apiKey: trimmedKey,
      priority: priorityNum,
    });
    setSaving(false);
    if (ok) {
      setLabel('');
      setApiKey('');
      setPriority('0');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Add key</h3>
      {localError ? <p className="mb-2 text-sm text-red-600">{localError}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Label</span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Production key 1"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            disabled={saving}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Priority</span>
          <input
            type="number"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            disabled={saving}
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium text-slate-700">Gemini API key</span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIza…"
            autoComplete="off"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
            disabled={saving}
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {saving ? <ButtonLoader /> : null}
        {saving ? 'Saving…' : 'Add key'}
      </button>
    </form>
  );
}
