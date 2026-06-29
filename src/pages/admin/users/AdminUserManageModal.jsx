import { useEffect, useState } from 'react';
import { HiXMark } from 'react-icons/hi2';
import { supabase } from '../../../lib/supabase';
import { PLANS } from './constants';
import { AspirantNameWithPhone } from './AspirantIdentity';

function Section({ title, children }) {
  return (
    <section className="rounded-lg border border-slate-200 p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';

export default function AdminUserManageModal({ user, onClose, onSuccess, onViewProfile }) {
  const [profileStatus, setProfileStatus] = useState(user?.profile_status ?? 'active');
  const [placedIn, setPlacedIn] = useState(user?.placed_in ?? '');
  const [placedAt, setPlacedAt] = useState(user?.placed_at ?? '');
  const [plan, setPlan] = useState(user?.plan || 'base');
  const [planStartedAt, setPlanStartedAt] = useState('');
  const [extraMock, setExtraMock] = useState(user?.extra_mock_limit ?? 0);
  const [extraInterview, setExtraInterview] = useState(user?.extra_interview_limit ?? 0);

  const [placementMsg, setPlacementMsg] = useState({ type: '', text: '' });
  const [planMsg, setPlanMsg] = useState({ type: '', text: '' });
  const [limitsMsg, setLimitsMsg] = useState({ type: '', text: '' });
  const [savingPlacement, setSavingPlacement] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingLimits, setSavingLimits] = useState(false);

  useEffect(() => {
    if (!user) return;
    setProfileStatus(user.profile_status ?? 'active');
    setPlacedIn(user.placed_in ?? '');
    setPlacedAt(user.placed_at ?? '');
    setPlan(user.plan || 'base');
    setPlanStartedAt('');
    setExtraMock(user.extra_mock_limit ?? 0);
    setExtraInterview(user.extra_interview_limit ?? 0);
    setPlacementMsg({ type: '', text: '' });
    setPlanMsg({ type: '', text: '' });
    setLimitsMsg({ type: '', text: '' });
  }, [user]);

  if (!user) return null;

  const placed = profileStatus === 'inactive';

  const savePlacement = async (e) => {
    e.preventDefault();
    setPlacementMsg({ type: '', text: '' });
    setSavingPlacement(true);
    try {
      const { data, error } = await supabase.rpc('update_aspirant_placement_for_admin', {
        p_aspirant_id: user.id,
        p_profile_status: profileStatus,
        p_placed_in: placed ? placedIn.trim() : null,
        p_placed_at: placed && placedAt ? placedAt : null,
      });
      if (error) throw new Error(error.message);
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (!result?.ok) throw new Error(result?.error || 'Save failed');
      setPlacementMsg({ type: 'ok', text: 'Placement saved.' });
      onSuccess?.();
    } catch (err) {
      setPlacementMsg({ type: 'err', text: err.message || 'Save failed' });
    } finally {
      setSavingPlacement(false);
    }
  };

  const savePlan = async (e) => {
    e.preventDefault();
    setPlanMsg({ type: '', text: '' });
    setSavingPlan(true);
    try {
      const startedAt = planStartedAt.trim() ? new Date(planStartedAt).toISOString() : null;
      const { data, error } = await supabase.rpc('admin_set_aspirant_plan', {
        p_aspirant_id: user.id,
        p_plan: plan,
        p_plan_started_at: startedAt,
      });
      if (error) throw new Error(error.message);
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (!result?.ok) throw new Error(result?.error || 'Save failed');
      setPlanMsg({ type: 'ok', text: 'Plan saved.' });
      onSuccess?.();
    } catch (err) {
      setPlanMsg({ type: 'err', text: err.message || 'Save failed' });
    } finally {
      setSavingPlan(false);
    }
  };

  const saveLimits = async (e) => {
    e.preventDefault();
    setLimitsMsg({ type: '', text: '' });
    setSavingLimits(true);
    try {
      const { data, error } = await supabase.rpc('admin_set_aspirant_extra_limits', {
        p_aspirant_id: user.id,
        p_extra_mock_limit: Math.max(0, parseInt(extraMock, 10) || 0),
        p_extra_interview_limit: Math.max(0, parseInt(extraInterview, 10) || 0),
      });
      if (error) throw new Error(error.message);
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (!result?.ok) throw new Error(result?.error || 'Save failed');
      setLimitsMsg({ type: 'ok', text: 'Limits saved.' });
      onSuccess?.();
    } catch (err) {
      setLimitsMsg({ type: 'err', text: err.message || 'Save failed' });
    } finally {
      setSavingLimits(false);
    }
  };

  const Msg = ({ msg }) =>
    msg.text ? (
      <p className={`mt-2 text-sm ${msg.type === 'err' ? 'text-red-600' : 'text-emerald-700'}`}>{msg.text}</p>
    ) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" aria-hidden onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex shrink-0 items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Manage aspirant</h2>
            <AspirantNameWithPhone name={user.full_name} phone={user.phone} email={user.email} />
            {user.email && user.full_name ? (
              <p className="mt-0.5 truncate text-xs text-slate-500">{user.email}</p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <HiXMark className="h-5 w-5" />
          </button>
        </div>

        <div className="nth-scroll-y space-y-4 overflow-y-auto px-5 py-4">
          <Section title="Placement">
            <form onSubmit={savePlacement} className="space-y-3">
              <Field label="Pipeline status" hint="Separate from subscription plan.">
                <select
                  value={profileStatus}
                  onChange={(e) => setProfileStatus(e.target.value)}
                  className={inputClass}
                >
                  <option value="active">In pool</option>
                  <option value="inactive">Placed</option>
                </select>
              </Field>
              {placed ? (
                <>
                  <Field label="Placed in" hint="Company and role">
                    <input
                      type="text"
                      value={placedIn}
                      onChange={(e) => setPlacedIn(e.target.value)}
                      placeholder="e.g. TCS — Java Developer"
                      maxLength={200}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Placed on">
                    <input
                      type="date"
                      value={placedAt || ''}
                      onChange={(e) => setPlacedAt(e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                </>
              ) : null}
              <Msg msg={placementMsg} />
              <button
                type="submit"
                disabled={savingPlacement}
                className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {savingPlacement ? 'Saving…' : 'Save placement'}
              </button>
            </form>
          </Section>

          <Section title="Plan">
            <form onSubmit={savePlan} className="space-y-3">
              <Field label="Plan">
                <select value={plan} onChange={(e) => setPlan(e.target.value)} className={inputClass}>
                  {PLANS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Plan start date" hint="Optional — leave empty to keep current.">
                <input type="date" value={planStartedAt} onChange={(e) => setPlanStartedAt(e.target.value)} className={inputClass} />
              </Field>
              <Msg msg={planMsg} />
              <button
                type="submit"
                disabled={savingPlan}
                className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {savingPlan ? 'Saving…' : 'Save plan'}
              </button>
            </form>
          </Section>

          <Section title="Extra limits">
            <form onSubmit={saveLimits} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Extra mocks">
                  <input
                    type="number"
                    min={0}
                    value={extraMock}
                    onChange={(e) => setExtraMock(e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Extra interviews">
                  <input
                    type="number"
                    min={0}
                    value={extraInterview}
                    onChange={(e) => setExtraInterview(e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>
              <Msg msg={limitsMsg} />
              <button
                type="submit"
                disabled={savingLimits}
                className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {savingLimits ? 'Saving…' : 'Save limits'}
              </button>
            </form>
          </Section>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            onClick={() => onViewProfile?.(user.id)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            View full profile
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
