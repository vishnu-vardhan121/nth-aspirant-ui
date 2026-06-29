/** Union role-fit keys from multiple mocks (order preserved, deduped). */
export function mergeRoleFitKeys(...keyLists) {
  const seen = new Set();
  const out = [];
  for (const list of keyLists) {
    if (!Array.isArray(list)) continue;
    for (const raw of list) {
      const key = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}

/**
 * Load role-fit tags from every completed mock for the given aspirants.
 * Uses admin RLS on mock_registrations — no list-RPC change needed.
 * @returns {Promise<Record<string, string[]>>}
 */
export async function fetchAggregatedRoleFitByAspirantIds(supabase, aspirantIds) {
  if (!aspirantIds?.length) return {};

  const { data, error } = await supabase
    .from('mock_registrations')
    .select('aspirant_id, role_fit_keys')
    .in('aspirant_id', aspirantIds)
    .eq('status', 'completed');

  if (error) return {};

  /** @type {Record<string, string[]>} */
  const byAspirant = {};
  for (const row of data ?? []) {
    const id = row.aspirant_id;
    byAspirant[id] = mergeRoleFitKeys(byAspirant[id], row.role_fit_keys);
  }
  return byAspirant;
}

/** Attach `all_mock_role_fit_keys` from all completed mocks (falls back to latest mock keys). */
export async function enrichUsersWithAllMockRoleFit(supabase, users) {
  if (!users?.length) return users ?? [];

  const ids = users.map((u) => u.id).filter(Boolean);
  const byAspirant = await fetchAggregatedRoleFitByAspirantIds(supabase, ids);

  return users.map((u) => {
    const aggregated = byAspirant[u.id];
    const fallback = Array.isArray(u.latest_mock_role_fit_keys) ? u.latest_mock_role_fit_keys : [];
    return {
      ...u,
      all_mock_role_fit_keys: aggregated?.length ? aggregated : fallback,
    };
  });
}
