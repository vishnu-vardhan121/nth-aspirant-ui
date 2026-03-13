import { useState, useEffect } from 'react';
import { HiXMark, HiCheckCircle } from 'react-icons/hi2';
import { supabase } from '../../lib/supabase';
import { PageLoader } from '../../components/ui/Loader';

const INSTITUTE_ADS_BUCKET = 'institute-ads';

function SpotlightFormModal({ row, onClose, onSuccess }) {
  const isEdit = !!row?.id;
  const [badge, setBadge] = useState(row?.badge ?? 'Partner spotlight');
  const [title, setTitle] = useState(row?.title ?? '');
  const [instituteName, setInstituteName] = useState(row?.institute_name ?? '');
  const [subtext, setSubtext] = useState(row?.subtext ?? '');
  const [highlight, setHighlight] = useState(row?.highlight ?? '');
  const [ctaLink, setCtaLink] = useState(row?.cta_link ?? '');
  const [ctaLabel, setCtaLabel] = useState(row?.cta_label ?? 'Open link');
  const [leftPanelLabel, setLeftPanelLabel] = useState(row?.left_panel_label ?? 'Featured partner');
  const [imageUrl, setImageUrl] = useState(row?.image_url ?? '');
  const [imageFile, setImageFile] = useState(null);
  const [isActive, setIsActive] = useState(row?.is_active ?? false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const buildPayload = (finalImageUrl) => ({
    badge: badge.trim() || 'Partner spotlight',
    title: title.trim(),
    institute_name: instituteName.trim(),
    subtext: subtext.trim(),
    highlight: highlight.trim() || null,
    cta_link: ctaLink.trim() || null,
    cta_label: ctaLabel.trim() || 'Open link',
    left_panel_label: leftPanelLabel.trim() || 'Featured partner',
    image_url: (finalImageUrl ?? imageUrl).trim() || null,
    is_active: isActive,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    const titleT = title.trim();
    const nameT = instituteName.trim();
    const subT = subtext.trim();
    if (!titleT || titleT.length < 2) {
      setMessage({ type: 'error', text: 'Title is required (at least 2 characters).' });
      return;
    }
    if (!nameT || nameT.length < 2) {
      setMessage({ type: 'error', text: 'Institute name is required (at least 2 characters).' });
      return;
    }
    if (!subT || subT.length < 10) {
      setMessage({ type: 'error', text: 'Subtext is required (at least 10 characters).' });
      return;
    }
    const ctaT = ctaLink.trim();
    if (ctaT && !/^https?:\/\//i.test(ctaT) && !ctaT.startsWith('/')) {
      setMessage({ type: 'error', text: 'CTA link must be a full URL (https://…) or a path starting with /.' });
      return;
    }
    let finalImageUrl = imageUrl.trim();
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `spotlight/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(INSTITUTE_ADS_BUCKET).upload(path, imageFile, { upsert: false });
      if (uploadError) {
        setMessage({ type: 'error', text: uploadError.message ?? 'Image upload failed.' });
        return;
      }
      const { data: urlData } = supabase.storage.from(INSTITUTE_ADS_BUCKET).getPublicUrl(path);
      finalImageUrl = urlData.publicUrl;
    }
    const p = buildPayload(finalImageUrl);
    setSaving(true);
    if (isEdit) {
      const { error } = await supabase.from('landing_institute_spotlight').update(p).eq('id', row.id);
      setSaving(false);
      if (error) {
        setMessage({ type: 'error', text: error.message });
        return;
      }
    } else {
      const { error } = await supabase.from('landing_institute_spotlight').insert(p);
      setSaving(false);
      if (error) {
        setMessage({ type: 'error', text: error.message });
        return;
      }
    }
    onSuccess?.();
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white border border-slate-200 shadow-xl p-4 my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">{isEdit ? 'Edit spotlight' : 'Add spotlight'}</h2>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close">
            <HiXMark className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          {message.text && <p className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message.text}</p>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Badge</label>
            <input value={badge} onChange={(e) => setBadge(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" maxLength={80} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input
              name="spotlight_title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. Best institute in Hyderabad"
              required
              minLength={2}
              maxLength={200}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Institute name *</label>
            <input
              name="spotlight_institute"
              value={instituteName}
              onChange={(e) => setInstituteName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              required
              minLength={2}
              maxLength={150}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subtext *</label>
            <textarea
              name="spotlight_subtext"
              value={subtext}
              onChange={(e) => setSubtext(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm min-h-[80px]"
              required
              minLength={10}
              maxLength={2000}
            />
            <p className="text-xs text-slate-500 mt-0.5">At least 10 characters.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Highlight (optional)</label>
            <input value={highlight} onChange={(e) => setHighlight(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">CTA link (optional)</label>
            <input type="text" value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="https://… or /pricing" />
            <p className="text-xs text-slate-500 mt-1">If empty, no button on landing. External URLs open in new tab; paths like /pricing use in-app navigation.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">CTA button label</label>
            <input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Left panel label</label>
            <input value={leftPanelLabel} onChange={(e) => setLeftPanelLabel(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Left panel image (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setImageFile(f || null);
                if (f) setImageUrl('');
              }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700"
            />
            <p className="text-xs text-slate-500 mt-1">Upload replaces URL. Or paste image URL below if not uploading.</p>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                if (e.target.value) setImageFile(null);
              }}
              className="mt-2 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Or paste image URL"
            />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="spot_active" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-slate-300" />
            <label htmlFor="spot_active" className="text-sm font-medium text-slate-700">Show on landing (only one active)</label>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Saving…' : isEdit ? 'Save' : 'Add'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminInstituteSpotlightPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formModal, setFormModal] = useState(null);

  const load = async () => {
    const { data, error } = await supabase.from('landing_institute_spotlight').select('*').order('created_at', { ascending: false });
    setRows(error ? [] : data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setActive = async (id) => {
    const { error } = await supabase.from('landing_institute_spotlight').update({ is_active: true }).eq('id', id);
    if (!error) load();
  };

  const deleteRow = async (id) => {
    if (!window.confirm('Delete this spotlight?')) return;
    const { error } = await supabase.from('landing_institute_spotlight').delete().eq('id', id);
    if (!error) load();
  };

  if (loading) return <PageLoader size="md" label="Loading…" className="py-12" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Institute spotlight</h1>
          <p className="text-slate-600 text-sm mt-1">Landing block (best institute, etc.). One active at a time. CTA link optional.</p>
        </div>
        <button type="button" onClick={() => setFormModal({})} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">Add</button>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700">Title</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Institute</th>
              <th className="px-4 py-3 font-semibold text-slate-700">CTA</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No spotlights. Add one and set active to show on landing.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900 max-w-[180px] truncate" title={r.title}>{r.title}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-[160px] truncate" title={r.institute_name}>{r.institute_name}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={r.cta_link || ''}>{r.cta_link || '—'}</td>
                  <td className="px-4 py-3">
                    {r.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700"><HiCheckCircle className="w-3.5 h-3.5" /> Active</span>
                    ) : (
                      <span className="text-slate-500 text-xs">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3 flex flex-wrap gap-2">
                    {!r.is_active && <button type="button" onClick={() => setActive(r.id)} className="text-indigo-600 hover:underline text-xs font-medium">Set active</button>}
                    <button type="button" onClick={() => setFormModal(r)} className="text-slate-600 hover:underline text-xs font-medium">Edit</button>
                    <button type="button" onClick={() => deleteRow(r.id)} className="text-red-600 hover:underline text-xs font-medium">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {formModal !== null && (
        <SpotlightFormModal row={formModal?.id ? formModal : undefined} onClose={() => setFormModal(null)} onSuccess={() => { setFormModal(null); load(); }} />
      )}
    </div>
  );
}
