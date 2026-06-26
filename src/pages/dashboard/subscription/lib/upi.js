/** Build NPCI UPI pay URI for QR codes and deep links. */
export function formatUpiAmount(amountInr) {
  return Number(amountInr).toFixed(2);
}

export function buildUpiPayUri({ upiId, payeeName, amountInr, transactionNote }) {
  const pa = (upiId || '').trim();
  if (!pa) return null;

  const params = new URLSearchParams();
  params.set('pa', pa);
  if (payeeName) params.set('pn', payeeName.slice(0, 80));
  if (amountInr != null && amountInr > 0) params.set('am', formatUpiAmount(amountInr));
  params.set('cu', 'INR');
  if (transactionNote) params.set('tn', transactionNote.slice(0, 80));

  return `upi://pay?${params.toString()}`;
}

/** Short reference shown to user and embedded in UPI note. */
export function formatOrderReference(orderId) {
  if (!orderId) return '';
  const short = String(orderId).replace(/-/g, '').slice(0, 8).toUpperCase();
  return `NTH-${short}`;
}
