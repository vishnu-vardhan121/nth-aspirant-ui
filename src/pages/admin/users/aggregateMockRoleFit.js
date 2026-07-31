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
 * Load role-fit tags and completed counts from every completed mock for the given aspirants.
 * Uses admin RLS on mock_registrations — no list-RPC change needed.
 * @returns {Promise<Record<string, { keys: string[], completedTotal: number }>>}
 */
export async function fetchAggregatedRoleFitByAspirantIds(supabase, aspirantIds) {
  if (!aspirantIds?.length) return {};

  const { data, error } = await supabase
    .from('mock_registrations')
    .select('aspirant_id, role_fit_keys')
    .in('aspirant_id', aspirantIds)
    .eq('status', 'completed');

  if (error) return {};

  /** @type {Record<string, { keys: string[], completedTotal: number }>} */
  const byAspirant = {};
  for (const row of data ?? []) {
    const id = row.aspirant_id;
    const prev = byAspirant[id] ?? { keys: [], completedTotal: 0 };
    byAspirant[id] = {
      keys: mergeRoleFitKeys(prev.keys, row.role_fit_keys),
      completedTotal: prev.completedTotal + 1,
    };
  }
  return byAspirant;
}

/** Attach `all_mock_role_fit_keys` and `completed_total` from all completed mocks. */
export async function enrichUsersWithAllMockRoleFit(supabase, users) {
  if (!users?.length) return users ?? [];

  const ids = users.map((u) => u.id).filter(Boolean);
  const byAspirant = await fetchAggregatedRoleFitByAspirantIds(supabase, ids);

  return users.map((u) => {
    const aggregated = byAspirant[u.id];
    const fallback = Array.isArray(u.latest_mock_role_fit_keys) ? u.latest_mock_role_fit_keys : [];
    return {
      ...u,
      completed_total: aggregated?.completedTotal ?? 0,
      all_mock_role_fit_keys: aggregated?.keys?.length ? aggregated.keys : fallback,
    };
  });
}
