import { useState, useEffect } from 'react';
import { HiXMark, HiPencil, HiCheckCircle } from 'react-icons/hi2';
import { supabase } from '../../lib/supabase';
import { PageLoader } from '../../components/ui/Loader';

const INSTITUTE_ADS_BUCKET = 'institute-ads';

function AdFormModal({ ad, onClose, onSuccess }) {
  const isEdit = !!ad?.id;
  const [instituteName, setInstituteName] = useState(ad?.institute_name ?? '');
  const [imageUrl, setImageUrl] = useState(ad?.image_url ?? '');
  const [imageFile, setImageFile] = useState(null);
  const [linkUrl, setLinkUrl] = useState(ad?.link_url ?? '');
  const [isActive, setIsActive] = useState(ad?.is_active ?? false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    const name = instituteName.trim();
    let finalImageUrl = imageUrl.trim();
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(INSTITUTE_ADS_BUCKET).upload(path, imageFile, { upsert: false });
      if (uploadError) {
        setMessage({ type: 'error', text: uploadError.message ?? 'Image upload failed.' });
        return;
      }
      const { data: urlData } = supabase.storage.from(INSTITUTE_ADS_BUCKET).getPublicUrl(path);
      finalImageUrl = urlData.publicUrl;
    }
    if (!name || !finalImageUrl) {
      setMessage({ type: 'error', text: 'Institute name and poster image (upload or URL) are required.' });
      return;
    }
    setSaving(true);
    if (isEdit) {
      const { error } = await supabase
        .from('institute_ads')
        .update({
          institute_name: name,
          image_url: finalImageUrl,
          link_url: linkUrl.trim() || null,
          is_active: isActive,
        })
        .eq('id', ad.id);
      setSaving(false);
      if (error) {
        setMessage({ type: 'error', text: error.message });
        return;
      }
    } else {
      const { error } = await supabase.from('institute_ads').insert({
        institute_name: name,
        image_url: finalImageUrl,
        link_url: linkUrl.trim() || null,
        is_active: isActive,
      });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white border border-slate-200 shadow-xl p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">{isEdit ? 'Edit institute ad' : 'Add institute ad'}</h2>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close">
            <HiXMark className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {message.text && (
            <p className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message.text}</p>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Institute name</label>
            <input
              type="text"
              value={instituteName}
              onChange={(e) => setInstituteName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. ABC Training"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Poster image</label>
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
            <p className="text-xs text-slate-500 mt-1">Or paste image URL below. Modal shows at ~80% screen; image scales to fit.</p>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => { setImageUrl(e.target.value); if (e.target.value) setImageFile(null); }}
              className="mt-2 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Or paste image URL (if not uploading)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Link URL (optional)</label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Click-through URL"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-300"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-slate-700">Show on landing (only one ad can be active)</label>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving…' : isEdit ? 'Save' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminInstituteAdsPage() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formModal, setFormModal] = useState(null);

  const loadAds = async () => {
    const { data, error } = await supabase
      .from('institute_ads')
      .select('*')
      .order('created_at', { ascending: false });
    setAds(error ? [] : data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadAds();
  }, []);

  const setActive = async (id) => {
    const { error } = await supabase.from('institute_ads').update({ is_active: true }).eq('id', id);
    if (!error) loadAds();
  };

  const deleteAd = async (id) => {
    if (!window.confirm('Delete this institute ad?')) return;
    const { error } = await supabase.from('institute_ads').delete().eq('id', id);
    if (!error) loadAds();
  };

  if (loading) return <PageLoader size="md" label="Loading institute ads…" className="py-12" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Institute ads</h1>
          <p className="text-slate-600 text-sm mt-1">
            One active ad is shown in the landing page modal ~5s after each page load/refresh. Only one can be active.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormModal({})}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Add ad
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700">Institute</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Image URL</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Link</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No institute ads. Add one to show on the landing page.
                  </td>
                </tr>
              ) : (
                ads.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.institute_name}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={row.image_url}>{row.image_url || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[160px] truncate" title={row.link_url || ''}>{row.link_url || '—'}</td>
                    <td className="px-4 py-3">
                      {row.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                          <HiCheckCircle className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 flex flex-wrap gap-2">
                      {!row.is_active && (
                        <button
                          type="button"
                          onClick={() => setActive(row.id)}
                          className="text-indigo-600 hover:underline text-xs font-medium"
                        >
                          Set active
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setFormModal(row)}
                        className="text-slate-600 hover:underline text-xs font-medium"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteAd(row.id)}
                        className="text-red-600 hover:underline text-xs font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {formModal !== null && (
        <AdFormModal
          ad={formModal?.id ? formModal : undefined}
          onClose={() => setFormModal(null)}
          onSuccess={() => { setFormModal(null); loadAds(); }}
        />
      )}
    </div>
  );
}
