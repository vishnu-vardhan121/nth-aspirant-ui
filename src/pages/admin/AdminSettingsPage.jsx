import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PageLoader, ButtonLoader } from '../../components/ui/Loader';

export default function AdminSettingsPage() {
  const [limit, setLimit] = useState('');
  const [countToday, setCountToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [mockLimits, setMockLimits] = useState({ base: '', silver: '', gold: '' });
  const [mockLimitsSaving, setMockLimitsSaving] = useState(false);
  const [mockLimitsMessage, setMockLimitsMessage] = useState({ type: '', text: '' });
  const [directInterviewLimits, setDirectInterviewLimits] = useState({ base: '', silver: '', gold: '' });
  const [directInterviewSaving, setDirectInterviewSaving] = useState(false);
  const [directInterviewMessage, setDirectInterviewMessage] = useState({ type: '', text: '' });
  const [messageLimits, setMessageLimits] = useState({ base: '', silver: '', gold: '' });
  const [messageLimitsSaving, setMessageLimitsSaving] = useState(false);
  const [messageLimitsMessage, setMessageLimitsMessage] = useState({ type: '', text: '' });
  const [paymentUpiId, setPaymentUpiId] = useState('');
  const [paymentPayeeName, setPaymentPayeeName] = useState('Naveen Talent Hub');
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const fetchStatus = async () => {
      const { data: signupData, error: signupError } = await supabase.rpc('get_daily_signup_status');
      const [mockBase, mockSilver, mockGold] = await Promise.all([
        supabase.rpc('get_mock_limit', { plan_name: 'base' }).then((r) => r.data),
        supabase.rpc('get_mock_limit', { plan_name: 'silver' }).then((r) => r.data),
        supabase.rpc('get_mock_limit', { plan_name: 'gold' }).then((r) => r.data),
      ]);
      const [diBase, diSilver, diGold] = await Promise.all([
        supabase.rpc('get_job_applications_limit', { plan_name: 'base' }).then((r) => r.data),
        supabase.rpc('get_job_applications_limit', { plan_name: 'silver' }).then((r) => r.data),
        supabase.rpc('get_job_applications_limit', { plan_name: 'gold' }).then((r) => r.data),
      ]);
      const [msgBase, msgSilver, msgGold] = await Promise.all([
        supabase.rpc('get_daily_message_limit', { plan_name: 'base' }).then((r) => r.data),
        supabase.rpc('get_daily_message_limit', { plan_name: 'silver' }).then((r) => r.data),
        supabase.rpc('get_daily_message_limit', { plan_name: 'gold' }).then((r) => r.data),
      ]);
      const { data: payCfg } = await supabase.rpc('get_payment_config');
      if (!signupError && signupData) {
        const lim = signupData.limit;
        setLimit(lim === -1 ? '' : String(lim));
        setCountToday(signupData.count_today ?? 0);
      }
      setMockLimits({
        base: mockBase != null ? String(mockBase) : '',
        silver: mockSilver != null ? String(mockSilver) : '',
        gold: mockGold != null ? String(mockGold) : '',
      });
      setDirectInterviewLimits({
        base: diBase != null ? String(diBase) : '',
        silver: diSilver != null ? String(diSilver) : '',
        gold: diGold != null ? String(diGold) : '',
      });
      setMessageLimits({
        base: msgBase != null ? String(msgBase) : '',
        silver: msgSilver != null ? String(msgSilver) : '',
        gold: msgGold != null ? String(msgGold) : '',
      });
      if (payCfg?.ok) {
        setPaymentUpiId(payCfg.upi_id || '');
        setPaymentPayeeName(payCfg.payee_name || 'Naveen Talent Hub');
        setPaymentInstructions(payCfg.instructions || '');
      }
      setLoading(false);
    };
    fetchStatus();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    const val = limit.trim() === '' ? -1 : parseInt(limit, 10);
    if (limit.trim() !== '' && (isNaN(val) || val < -1)) {
      setMessage({ type: 'error', text: 'Enter a number ≥ 0, or leave empty for unlimited.' });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.rpc('set_daily_signup_limit', { p_limit: val });
    setSaving(false);
    if (error) {
      setMessage({ type: 'error', text: error.message ?? 'Failed to save.' });
      return;
    }
    if (!data?.ok) {
      setMessage({ type: 'error', text: data?.error ?? 'Failed to save.' });
      return;
    }
    setMessage({ type: 'success', text: 'Saved.' });
    const { data: status } = await supabase.rpc('get_daily_signup_status');
    if (status) setCountToday(status.count_today ?? 0);
  };

  const handleSaveMockLimits = async (e) => {
    e.preventDefault();
    setMockLimitsMessage({ type: '', text: '' });
    const base = mockLimits.base.trim() === '' ? null : parseInt(mockLimits.base, 10);
    const silver = mockLimits.silver.trim() === '' ? null : parseInt(mockLimits.silver, 10);
    const gold = mockLimits.gold.trim() === '' ? null : parseInt(mockLimits.gold, 10);
    if ((base != null && (isNaN(base) || base < -1)) || (silver != null && (isNaN(silver) || silver < -1)) || (gold != null && (isNaN(gold) || gold < -1))) {
      setMockLimitsMessage({ type: 'error', text: 'Enter numbers ≥ 0. Use -1 for unlimited.' });
      return;
    }
    setMockLimitsSaving(true);
    const { data } = await supabase.rpc('set_mock_limits', { p_base: base, p_silver: silver, p_gold: gold });
    setMockLimitsSaving(false);
    if (data?.ok) {
      setMockLimitsMessage({ type: 'success', text: 'Mock limits saved.' });
    } else {
      setMockLimitsMessage({ type: 'error', text: data?.error ?? 'Failed to save.' });
    }
  };

  const handleSaveMessageLimits = async (e) => {
    e.preventDefault();
    setMessageLimitsMessage({ type: '', text: '' });
    const base = messageLimits.base.trim() === '' ? null : parseInt(messageLimits.base, 10);
    const silver = messageLimits.silver.trim() === '' ? null : parseInt(messageLimits.silver, 10);
    const gold = messageLimits.gold.trim() === '' ? null : parseInt(messageLimits.gold, 10);
    if ((base != null && (isNaN(base) || base < -1)) || (silver != null && (isNaN(silver) || silver < -1)) || (gold != null && (isNaN(gold) || gold < -1))) {
      setMessageLimitsMessage({ type: 'error', text: 'Enter numbers ≥ 0. Use -1 for unlimited.' });
      return;
    }
    setMessageLimitsSaving(true);
    const { data } = await supabase.rpc('set_message_limits', { p_base: base, p_silver: silver, p_gold: gold });
    setMessageLimitsSaving(false);
    if (data?.ok) {
      setMessageLimitsMessage({ type: 'success', text: 'Message limits saved.' });
    } else {
      setMessageLimitsMessage({ type: 'error', text: data?.error ?? 'Failed to save.' });
    }
  };

  const handleSaveDirectInterviewLimits = async (e) => {
    e.preventDefault();
    setDirectInterviewMessage({ type: '', text: '' });
    const base = directInterviewLimits.base.trim() === '' ? null : parseInt(directInterviewLimits.base, 10);
    const silver = directInterviewLimits.silver.trim() === '' ? null : parseInt(directInterviewLimits.silver, 10);
    const gold = directInterviewLimits.gold.trim() === '' ? null : parseInt(directInterviewLimits.gold, 10);
    if ((base != null && (isNaN(base) || base < -1)) || (silver != null && (isNaN(silver) || silver < -1)) || (gold != null && (isNaN(gold) || gold < -1))) {
      setDirectInterviewMessage({ type: 'error', text: 'Enter numbers ≥ 0. Use -1 for unlimited.' });
      return;
    }
    setDirectInterviewSaving(true);
    const { data } = await supabase.rpc('set_direct_interview_limits', { p_base: base, p_silver: silver, p_gold: gold });
    setDirectInterviewSaving(false);
    if (data?.ok) {
      setDirectInterviewMessage({ type: 'success', text: 'Direct interview limits saved.' });
    } else {
      setDirectInterviewMessage({ type: 'error', text: data?.error ?? 'Failed to save.' });
    }
  };

  const handleSavePaymentConfig = async (e) => {
    e.preventDefault();
    setPaymentMessage({ type: '', text: '' });
    setPaymentSaving(true);
    const { data, error } = await supabase.rpc('set_payment_config', {
      p_config: {
        upi_id: paymentUpiId.trim(),
        payee_name: paymentPayeeName.trim() || 'Naveen Talent Hub',
        instructions: paymentInstructions.trim(),
      },
    });
    setPaymentSaving(false);
    if (error || !data?.ok) {
      setPaymentMessage({ type: 'error', text: data?.error || error?.message || 'Failed to save.' });
      return;
    }
    setPaymentMessage({ type: 'success', text: 'Payment settings saved.' });
  };

  if (loading) {
    return <PageLoader size="md" label="Loading settings…" className="py-12" />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Settings</h1>
      <p className="text-slate-600 mb-6">
        Configure app-wide limits. Changes take effect immediately.
      </p>

      <section className="rounded-xl border border-slate-200 bg-white p-6 max-w-md">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Daily lead limit</h2>
        <p className="text-slate-600 text-sm mb-4">
          Maximum number of pricing page leads per day. Leave empty or set to -1 for unlimited.
        </p>
        {countToday !== null && (
          <p className="text-sm text-slate-500 mb-3">
            Leads today: <span className="font-medium text-slate-700">{countToday}</span>
          </p>
        )}
        <form onSubmit={handleSave} className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="daily_limit" className="block text-sm font-medium text-slate-700 mb-1">
              Max leads per day
            </label>
            <input
              id="daily_limit"
              type="number"
              min="-1"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="Unlimited"
              className="w-32 px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="nth-btn-primary px-4 py-2 font-medium disabled:opacity-50"
          >
            {saving ? <ButtonLoader label="Saving…" /> : 'Save'}
          </button>
        </form>
        {message.text && (
          <p className={`mt-3 text-sm ${message.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
            {message.text}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 max-w-md mt-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Mock limits per plan</h2>
        <p className="text-slate-600 text-sm mb-4">
          Mocks allowed per subscription month (from each student&apos;s plan start anniversary). Base / Silver / Gold. Use -1 for unlimited.
        </p>
        <form onSubmit={handleSaveMockLimits} className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Base</label>
            <input
              type="number"
              min="-1"
              value={mockLimits.base}
              onChange={(e) => setMockLimits((f) => ({ ...f, base: e.target.value }))}
              className="w-20 px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Silver</label>
            <input
              type="number"
              min="-1"
              value={mockLimits.silver}
              onChange={(e) => setMockLimits((f) => ({ ...f, silver: e.target.value }))}
              className="w-20 px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Gold</label>
            <input
              type="number"
              min="-1"
              value={mockLimits.gold}
              onChange={(e) => setMockLimits((f) => ({ ...f, gold: e.target.value }))}
              className="w-20 px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={mockLimitsSaving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {mockLimitsSaving ? 'Saving…' : 'Save'}
          </button>
        </form>
        {mockLimitsMessage.text && (
          <p className={`mt-3 text-sm ${mockLimitsMessage.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
            {mockLimitsMessage.text}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 max-w-md mt-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Direct interview limits per plan</h2>
        <p className="text-slate-600 text-sm mb-4">
          Maximum job applications (direct company interviews) per plan per month. Base / Silver / Gold. Use -1 for unlimited.
        </p>
        <form onSubmit={handleSaveDirectInterviewLimits} className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Base</label>
            <input
              type="number"
              min="-1"
              value={directInterviewLimits.base}
              onChange={(e) => setDirectInterviewLimits((f) => ({ ...f, base: e.target.value }))}
              className="w-20 px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Silver</label>
            <input
              type="number"
              min="-1"
              value={directInterviewLimits.silver}
              onChange={(e) => setDirectInterviewLimits((f) => ({ ...f, silver: e.target.value }))}
              className="w-20 px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Gold</label>
            <input
              type="number"
              min="-1"
              value={directInterviewLimits.gold}
              onChange={(e) => setDirectInterviewLimits((f) => ({ ...f, gold: e.target.value }))}
              className="w-20 px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={directInterviewSaving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {directInterviewSaving ? 'Saving…' : 'Save'}
          </button>
        </form>
        {directInterviewMessage.text && (
          <p className={`mt-3 text-sm ${directInterviewMessage.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
            {directInterviewMessage.text}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 max-w-md mt-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Message reply limits per plan</h2>
        <p className="text-slate-600 text-sm mb-4">
          Daily replies aspirants can send to the NTH team and job group chats. Mock interviewer chats are unlimited. Base / Silver / Gold. Use -1 for unlimited.
        </p>
        <form onSubmit={handleSaveMessageLimits} className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Base</label>
            <input
              type="number"
              min="-1"
              value={messageLimits.base}
              onChange={(e) => setMessageLimits((f) => ({ ...f, base: e.target.value }))}
              className="w-20 px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Silver</label>
            <input
              type="number"
              min="-1"
              value={messageLimits.silver}
              onChange={(e) => setMessageLimits((f) => ({ ...f, silver: e.target.value }))}
              className="w-20 px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Gold</label>
            <input
              type="number"
              min="-1"
              value={messageLimits.gold}
              onChange={(e) => setMessageLimits((f) => ({ ...f, gold: e.target.value }))}
              className="w-20 px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={messageLimitsSaving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {messageLimitsSaving ? 'Saving…' : 'Save'}
          </button>
        </form>
        {messageLimitsMessage.text && (
          <p className={`mt-3 text-sm ${messageLimitsMessage.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
            {messageLimitsMessage.text}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 max-w-lg mt-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">UPI payments</h2>
        <p className="text-slate-600 text-sm mb-4">
          UPI ID and checkout copy for the dashboard subscription modal. Plan prices and durations are set in app code (
          <code className="text-xs bg-slate-100 px-1 rounded">subscriptionProducts.js</code>
          ).
        </p>
        <form onSubmit={handleSavePaymentConfig} className="space-y-4">
          <div>
            <label htmlFor="payment_upi" className="block text-sm font-medium text-slate-700 mb-1">
              UPI ID
            </label>
            <input
              id="payment_upi"
              type="text"
              value={paymentUpiId}
              onChange={(e) => setPaymentUpiId(e.target.value)}
              placeholder="merchant@upi"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>
          <div>
            <label htmlFor="payment_payee" className="block text-sm font-medium text-slate-700 mb-1">
              Payee name
            </label>
            <input
              id="payment_payee"
              type="text"
              value={paymentPayeeName}
              onChange={(e) => setPaymentPayeeName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>
          <div>
            <label htmlFor="payment_instructions" className="block text-sm font-medium text-slate-700 mb-1">
              Instructions (shown on payment screen)
            </label>
            <textarea
              id="payment_instructions"
              rows={2}
              value={paymentInstructions}
              onChange={(e) => setPaymentInstructions(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={paymentSaving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {paymentSaving ? 'Saving…' : 'Save payment settings'}
          </button>
        </form>
        {paymentMessage.text && (
          <p className={`mt-3 text-sm ${paymentMessage.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
            {paymentMessage.text}
          </p>
        )}
      </section>
    </div>
  );
}
