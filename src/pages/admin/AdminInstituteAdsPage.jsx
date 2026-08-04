import { useState, useEffect } from 'react';
import { HiXMark, HiPencil, HiCheckCircle } from 'react-icons/hi2';
import { supabase } from '../../lib/supabase';
import { PageLoader } from '../../components/ui/Loader';
import { hasPromoContent, isValidPromoLink } from '../../lib/promoAds';

const INSTITUTE_ADS_BUCKET = 'institute-ads';

function AdFormModal({ ad, onClose, onSuccess }) {
  const isEdit = !!ad?.id;
  const [instituteName, setInstituteName] = useState(ad?.institute_name ?? '');
  const [title, setTitle] = useState(ad?.title ?? '');
  const [bodyText, setBodyText] = useState(ad?.body_text ?? '');
  const [imageUrl, setImageUrl] = useState(ad?.image_url ?? '');
  const [imageFile, setImageFile] = useState(null);
  const [linkUrl, setLinkUrl] = useState(ad?.link_url ?? '');
  const [isActive, setIsActive] = useState(ad?.is_active ?? false);
  const [audienceAll, setAudienceAll] = useState(ad?.audience_all ?? true);
  const [audienceAiMl, setAudienceAiMl] = useState(ad?.audience_ai_ml ?? false);
  const [audienceBase, setAudienceBase] = useState(ad?.audience_base ?? false);
  const [audienceSilver, setAudienceSilver] = useState(ad?.audience_silver ?? false);
  const [audienceGold, setAudienceGold] = useState(ad?.audience_gold ?? false);
  const [priority, setPriority] = useState(ad?.priority ?? 0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    const name = instituteName.trim();
    if (!name || name.length < 2) {
      setMessage({ type: 'error', text: 'Promo name is required (at least 2 characters).' });
      return;
    }
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
    const payloadPreview = {
      title: title.trim(),
      body_text: bodyText.trim(),
      image_url: finalImageUrl || null,
    };
    if (!hasPromoContent(payloadPreview)) {
      setMessage({ type: 'error', text: 'Add a title/body text and/or a poster image.' });
      return;
    }
    if (finalImageUrl) {
      try {
        if (/^https?:\/\//i.test(finalImageUrl)) new URL(finalImageUrl);
      } catch {
        setMessage({ type: 'error', text: 'Image URL must be a valid http(s) link.' });
        return;
      }
    }
    const linkT = linkUrl.trim();
    if (linkT && !isValidPromoLink(linkT)) {
      setMessage({ type: 'error', text: 'Link must be https://… or an internal path like /dashboard/courses.' });
      return;
    }
    if (!audienceAll && !audienceAiMl && !audienceBase && !audienceSilver && !audienceGold) {
      setMessage({ type: 'error', text: 'Select at least one audience (All, AI/ML, Base, Silver, or Gold).' });
      return;
    }
    const row = {
      institute_name: name,
      title: title.trim() || null,
      body_text: bodyText.trim() || null,
      image_url: finalImageUrl || null,
      link_url: linkT || null,
      is_active: isActive,
      audience_all: audienceAll,
      audience_ai_ml: audienceAiMl,
      audience_base: audienceBase,
      audience_silver: audienceSilver,
      audience_gold: audienceGold,
      priority: Number.isFinite(Number(priority)) ? Number(priority) : 0,
    };
    setSaving(true);
    if (isEdit) {
      const { error } = await supabase.from('institute_ads').update(row).eq('id', ad.id);
      setSaving(false);
      if (error) {
        setMessage({ type: 'error', text: error.message });
        return;
      }
    } else {
      const { error } = await supabase.from('institute_ads').insert(row);
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
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white border border-slate-200 shadow-xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">{isEdit ? 'Edit promo' : 'Add promo'}</h2>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close">
            <HiXMark className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {message.text && (
            <p className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message.text}</p>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Promo name *</label>
            <input
              type="text"
              value={instituteName}
              onChange={(e) => setInstituteName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. Golden Batch"
              required
              minLength={2}
              maxLength={150}
            />
            <p className="text-xs text-slate-500 mt-1">Admin label only.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Shown in notice popup"
              maxLength={200}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Body text</label>
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Notice message (optional if you upload an image)"
              maxLength={2000}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Poster image (optional)</label>
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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Link (Click here)</label>
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="https://… or /dashboard/courses"
            />
          </div>
          <fieldset className="rounded-lg border border-slate-200 p-3">
            <legend className="px-1 text-sm font-medium text-slate-700">Show for</legend>
            <div className="mt-1 grid grid-cols-2 gap-2 text-sm text-slate-700">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={audienceAll} onChange={(e) => setAudienceAll(e.target.checked)} className="rounded border-slate-300" />
                All (landing + everyone)
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={audienceAiMl} onChange={(e) => setAudienceAiMl(e.target.checked)} className="rounded border-slate-300" />
                AI / ML course
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={audienceBase} onChange={(e) => setAudienceBase(e.target.checked)} className="rounded border-slate-300" />
                Base
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={audienceSilver} onChange={(e) => setAudienceSilver(e.target.checked)} className="rounded border-slate-300" />
                Silver
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={audienceGold} onChange={(e) => setAudienceGold(e.target.checked)} className="rounded border-slate-300" />
                Gold
              </label>
            </div>
          </fieldset>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-300"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
              Active (only one can be active)
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
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

function audienceSummary(row) {
  const parts = [];
  if (row.audience_all) parts.push('All');
  if (row.audience_ai_ml) parts.push('AI/ML');
  if (row.audience_base) parts.push('Base');
  if (row.audience_silver) parts.push('Silver');
  if (row.audience_gold) parts.push('Gold');
  return parts.length ? parts.join(', ') : '—';
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
    if (!window.confirm('Delete this promo?')) return;
    const { error } = await supabase.from('institute_ads').delete().eq('id', id);
    if (!error) loadAds();
  };

  if (loading) return <PageLoader size="md" label="Loading promos…" className="py-12" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Promos / popups</h1>
          <p className="text-slate-600 text-sm mt-1">
            Landing + dashboard popups. Text, image, and/or Click here link. Audience checkboxes control who sees it.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormModal({})}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Add promo
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700">Name</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Content</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Audience</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No promos yet. Add one for Golden Batch or plan notices.
                  </td>
                </tr>
              ) : (
                ads.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.institute_name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex flex-wrap gap-1 text-xs">
                        {row.title || row.body_text ? (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5">Text</span>
                        ) : null}
                        {row.image_url ? <span className="rounded bg-slate-100 px-1.5 py-0.5">Image</span> : null}
                        {row.link_url ? <span className="rounded bg-slate-100 px-1.5 py-0.5">Link</span> : null}
                      </div>
                      {row.title ? <p className="mt-1 truncate max-w-[220px]" title={row.title}>{row.title}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{audienceSummary(row)}</td>
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
                        <button type="button" onClick={() => setActive(row.id)} className="text-indigo-600 hover:underline text-xs font-medium">
                          Set active
                        </button>
                      )}
                      <button type="button" onClick={() => setFormModal(row)} className="text-slate-600 hover:underline text-xs font-medium inline-flex items-center gap-1">
                        <HiPencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button type="button" onClick={() => deleteAd(row.id)} className="text-red-600 hover:underline text-xs font-medium">
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
          onSuccess={() => {
            setFormModal(null);
            loadAds();
          }}
        />
      )}
    </div>
  );
}
