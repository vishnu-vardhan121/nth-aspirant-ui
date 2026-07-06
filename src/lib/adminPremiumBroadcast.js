/** Server-side bulk send to active premium members (survives tab close once RPC starts). */
export async function sendMessageToActivePremiumMembers(supabase, body) {
  const text = body?.trim();
  if (!text) return { ok: false, error: 'Message body required' };

  const { data, error } = await supabase.rpc('send_message_to_active_subscribers', {
    p_body: text,
  });

  if (error) {
    const missingRpc =
      error.message?.includes('send_message_to_active_subscribers') ||
      error.code === 'PGRST202';
    if (missingRpc) {
      return {
        ok: false,
        error: 'Database update required. Run: npx supabase db push (migration 116).',
      };
    }
    return { ok: false, error: error.message || 'Failed to send' };
  }

  if (!data?.ok) {
    return { ok: false, error: data?.error ?? 'Failed to send' };
  }

  return {
    ok: true,
    recipient_count: Number(data.recipient_count) || 0,
  };
}
