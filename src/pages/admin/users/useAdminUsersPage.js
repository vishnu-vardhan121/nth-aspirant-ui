import { useReducer, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { filtersReducer, buildUsersListRpcParams, INITIAL_USER_FILTERS } from './adminUserFilters';
import { exportFilteredUsersCsv } from './exportUsersCsv';

export function useAdminUsersPage() {
  const [filters, dispatchFilters] = useReducer(filtersReducer, {
    ...INITIAL_USER_FILTERS,
    page: 0,
  });
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const patchFilter = useCallback((payload) => {
    dispatchFilters({ type: 'patch', payload });
  }, []);

  const setQualification = useCallback((value) => {
    dispatchFilters({ type: 'qualification', value });
  }, []);

  const setPage = useCallback((page) => {
    dispatchFilters({ type: 'page', page });
  }, []);

  const refreshSummary = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_admin_users_summary');
    if (!error && data) setSummary(data);
  }, []);

  const refreshUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_admin_users_list', buildUsersListRpcParams(filters));
    if (!error && data) setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [filters]);

  const refresh = useCallback(() => {
    refreshSummary();
    refreshUsers();
  }, [refreshSummary, refreshUsers]);

  const exportCsv = useCallback(async () => {
    setExporting(true);
    try {
      const result = await exportFilteredUsersCsv(supabase, filters);
      return result;
    } finally {
      setExporting(false);
    }
  }, [filters]);

  useEffect(() => {
    refreshSummary();
  }, [refreshSummary]);

  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  return {
    summary,
    users,
    loading,
    filters,
    patchFilter,
    setQualification,
    setPage,
    refresh,
    exportCsv,
    exporting,
  };
}
