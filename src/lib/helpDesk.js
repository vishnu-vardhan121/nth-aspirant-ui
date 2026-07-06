import { supabase } from './supabase';

export const HELP_DESK_ISSUE_TYPE_LABELS = {
  general: 'General question',
  account: 'Dashboard / login / account',
  technical: 'Website or technical issue',
  jobs: 'Jobs or applications',
  mocks: 'Mock interviews or scheduling',
  payment: 'Billing or payment',
  ads: 'Advertising or sponsorship',
  other: 'Something else',
};

export function helpIssueTypeLabel(value) {
  if (!value) return '—';
  return HELP_DESK_ISSUE_TYPE_LABELS[value] ?? value;
}

export function formatHelpDeskTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export async function fetchMyHelpRequests() {
  const { data, error } = await supabase.rpc('get_my_help_requests');
  return { data: Array.isArray(data) ? data : [], error };
}

export async function fetchHelpRequestThread(requestId) {
  const { data, error } = await supabase.rpc('get_help_request_thread', { p_request_id: requestId });
  return { data, error };
}

export async function sendHelpRequestReply(requestId, body) {
  const { data, error } = await supabase.rpc('reply_to_help_request', {
    p_request_id: requestId,
    p_body: body,
  });
  return { data, error };
}

export async function fetchAdminHelpRequests(status, search, inbox = 'main') {
  const { data, error } = await supabase.rpc('get_admin_help_requests', {
    p_status: status === 'all' || !status ? null : status,
    p_search: search?.trim() || null,
    p_inbox: inbox || 'main',
  });
  return { data: Array.isArray(data) ? data : [], error };
}

export async function fetchAdminHelpDeskSummary() {
  const { data, error } = await supabase.rpc('get_admin_help_desk_summary');
  return { data, error };
}

export async function updateHelpRequestStatus(requestId, status, adminNotes) {
  const { data, error } = await supabase.rpc('update_help_request_status', {
    p_request_id: requestId,
    p_status: status,
    p_admin_notes: adminNotes || null,
  });
  return { data, error };
}

export async function fetchMyHelpDeskAccess() {
  const { data, error } = await supabase.rpc('get_my_help_desk_access');
  return { data, error };
}

export async function fetchHelpDeskBlockedList() {
  const { data, error } = await supabase.rpc('get_help_desk_blocked_list');
  return { data: Array.isArray(data) ? data : [], error };
}

export async function blockHelpDeskUser({ email, userId, phone, reason }) {
  const { data, error } = await supabase.rpc('block_help_desk_user', {
    p_email: email,
    p_user_id: userId || null,
    p_phone: phone || null,
    p_reason: reason || null,
  });
  return { data, error };
}

export async function unblockHelpDeskUser(email) {
  const { data, error } = await supabase.rpc('unblock_help_desk_user', { p_email: email });
  return { data, error };
}

export function helpStatusBadgeClass(status) {
  if (status === 'resolved') return 'bg-emerald-100 text-emerald-700';
  if (status === 'in_progress') return 'bg-amber-100 text-amber-700';
  return 'bg-sky-100 text-sky-700';
}
