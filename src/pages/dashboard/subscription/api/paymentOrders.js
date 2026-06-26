import { supabase } from '../../../../lib/supabase';

const PAYMENT_PROOFS_BUCKET = 'payment-proofs';

const BLOCKED_ORDER_RE = /payment in progress|awaiting verification|already have a payment/i;

export async function fetchPaymentConfig() {
  const { data, error } = await supabase.rpc('get_payment_config');
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || 'Failed to load payment settings');
  return {
    upiId: data.upi_id || '',
    payeeName: data.payee_name || 'Naveen Talent Hub',
    instructions: data.instructions || '',
  };
}

async function fetchOpenPaymentOrder() {
  const { data, error } = await supabase.rpc('get_active_payment_order');
  if (!error && data?.ok && data.order) {
    return data.order;
  }

  const { data: rows, error: selectError } = await supabase
    .from('payment_orders')
    .select('id, plan, amount_inr, duration_months, status')
    .in('status', ['pending', 'submitted'])
    .order('created_at', { ascending: false })
    .limit(1);

  if (selectError) return null;
  return rows?.[0] ?? null;
}

async function resolveOrderForSubmit(createResponse) {
  const msg = createResponse?.error || '';
  const blocked =
    BLOCKED_ORDER_RE.test(msg) || Boolean(createResponse?.existing_order_id);

  if (!blocked) return null;

  let order = null;
  if (createResponse?.existing_order_id) {
    const { data } = await supabase
      .from('payment_orders')
      .select('id, plan, amount_inr, duration_months, status')
      .eq('id', createResponse.existing_order_id)
      .maybeSingle();
    order = data;
  }
  if (!order) {
    order = await fetchOpenPaymentOrder();
  }
  if (!order) return null;

  if (order.status === 'submitted') {
    throw new Error(
      'Your payment is already submitted and waiting for verification. You do not need to pay again — we will notify you once it is approved.',
    );
  }

  if (order.status === 'pending') {
    return order;
  }

  return null;
}

export async function createPaymentOrder({ planId, amountInr, durationMonths }) {
  const { data, error } = await supabase.rpc('create_payment_order', {
    p_plan: planId,
    p_amount_inr: amountInr,
    p_duration_months: durationMonths,
  });
  if (error) throw error;

  if (!data?.ok) {
    const reused = await resolveOrderForSubmit(data);
    if (reused) return reused;
    throw new Error(data?.error || 'Could not create order');
  }

  return data.order;
}

export async function submitPaymentProof({ orderId, utr, payerNote, screenshotPath }) {
  const { data, error } = await supabase.rpc('submit_payment_proof', {
    p_order_id: orderId,
    p_utr: utr,
    p_payer_note: payerNote || null,
    p_screenshot_path: screenshotPath || null,
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || 'Failed to submit payment proof');
  return data;
}

export async function uploadPaymentScreenshot(aspirantId, folderId, file) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(ext) ? ext : 'jpg';
  const path = `${aspirantId}/${folderId}/proof.${safeExt}`;
  const { error } = await supabase.storage.from(PAYMENT_PROOFS_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return path;
}

function isRpcMissing(error) {
  return (
    error &&
    (error.code === 'PGRST202' ||
      /submit_subscription_payment/i.test(error.message || '') ||
      /function.*does not exist/i.test(error.message || ''))
  );
}

/** Create order + submit proof. Uses migration 084 when available. */
export async function submitSubscriptionPayment({
  userId,
  paymentRef,
  planId,
  amountInr,
  durationMonths,
  utr,
  payerNote,
  screenshotFile,
}) {
  let screenshotPath = null;
  const uploadKey = paymentRef || crypto.randomUUID();

  if (screenshotFile && userId) {
    screenshotPath = await uploadPaymentScreenshot(userId, uploadKey, screenshotFile);
  }

  const { data: oneStep, error: oneStepError } = await supabase.rpc('submit_subscription_payment', {
    p_plan: planId,
    p_amount_inr: amountInr,
    p_duration_months: durationMonths,
    p_utr: utr,
    p_payer_note: payerNote || null,
    p_screenshot_path: screenshotPath,
  });

  if (!isRpcMissing(oneStepError)) {
    if (oneStepError) throw oneStepError;
    if (!oneStep?.ok) throw new Error(oneStep?.error || 'Failed to submit payment');
    return oneStep;
  }

  const order = await createPaymentOrder({ planId, amountInr, durationMonths });
  let orderScreenshotPath = screenshotPath;
  if (screenshotFile && userId && order.id !== uploadKey) {
    orderScreenshotPath = await uploadPaymentScreenshot(userId, order.id, screenshotFile);
  }

  return submitPaymentProof({
    orderId: order.id,
    utr,
    payerNote,
    screenshotPath: orderScreenshotPath,
  });
}

export { PAYMENT_PROOFS_BUCKET };
