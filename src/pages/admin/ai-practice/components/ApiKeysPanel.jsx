import { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { ButtonLoader } from '../../../../components/ui/Loader';
import ApiKeyTable from './ApiKeyTable';
import ApiKeyForm from './ApiKeyForm';

export default function ApiKeysPanel({ open, onClose, onChanged }) {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [busyId, setBusyId] = useState(null);

  const loadKeys = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    const { data, error } = await supabase.rpc('admin_list_ai_gemini_keys');
    setLoading(false);
    if (error || !data?.ok) {
      setMessage({ type: 'error', text: data?.error || error?.message || 'Failed to load keys' });
      setKeys([]);
      return;
    }
    setKeys(Array.isArray(data.keys) ? data.keys : []);
  };

  useEffect(() => {
    if (!open) return;
    loadKeys();
  }, [open]);

  if (!open) return null;

  const handleAdd = async ({ label, apiKey, priority }) => {
    setMessage({ type: '', text: '' });
    const { data, error } = await supabase.rpc('admin_add_ai_gemini_key', {
      p_label: label,
      p_api_key: apiKey,
      p_priority: priority,
    });
    if (error || !data?.ok) {
      setMessage({ type: 'error', text: data?.error || error?.message || 'Failed to add key' });
      return false;
    }
    setMessage({ type: 'success', text: 'API key added.' });
    await loadKeys();
    onChanged?.();
    return true;
  };

  const handleToggle = async (id, isActive) => {
    setBusyId(id);
    setMessage({ type: '', text: '' });
    const { data, error } = await supabase.rpc('admin_set_ai_gemini_key_active', {
      p_id: id,
      p_is_active: isActive,
    });
    setBusyId(null);
    if (error || !data?.ok) {
      setMessage({ type: 'error', text: data?.error || error?.message || 'Failed to update key' });
      return;
    }
    await loadKeys();
    onChanged?.();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this API key? Sessions already linked keep history; new sessions cannot use it.')) {
      return;
    }
    setBusyId(id);
    setMessage({ type: '', text: '' });
    const { data, error } = await supabase.rpc('admin_delete_ai_gemini_key', { p_id: id });
    setBusyId(null);
    if (error || !data?.ok) {
      setMessage({ type: 'error', text: data?.error || error?.message || 'Failed to delete key' });
      return;
    }
    setMessage({ type: 'success', text: 'API key deleted.' });
    await loadKeys();
    onChanged?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-practice-keys-title"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="ai-practice-keys-title" className="text-lg font-semibold text-slate-900">
              Manage API Keys
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Add multiple Gemini keys. The system rotates them for AI Practice sessions. Full keys are never shown again after save.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        {message.text ? (
          <div
            className={`mb-4 rounded-lg px-3 py-2 text-sm ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <ApiKeyForm onSubmit={handleAdd} />

        <div className="mt-5">
          {loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-slate-600">
              <ButtonLoader /> Loading keys…
            </div>
          ) : (
            <ApiKeyTable
              keys={keys}
              busyId={busyId}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          )}
        </div>
      </div>
    </div>
  );
}
