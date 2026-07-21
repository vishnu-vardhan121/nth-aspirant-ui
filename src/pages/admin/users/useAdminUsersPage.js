import { useReducer, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { filtersReducer, buildUsersListRpcParams, INITIAL_USER_FILTERS } from './adminUserFilters';
import { exportFilteredUsersExcel } from './exportUsersExcel';
import { exportFilteredUsersPlacementExcel } from './exportPlacementExcel';
import { enrichUsersWithAllMockRoleFit } from './aggregateMockRoleFit';

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

  const resetFilters = useCallback(() => {
    dispatchFilters({ type: 'reset' });
  }, []);

  const refreshSummary = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_admin_users_summary');
    if (!error && data) setSummary(data);
  }, []);

  const refreshUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_admin_users_list', buildUsersListRpcParams(filters));
    if (error || !data) {
      setUsers([]);
      setLoading(false);
      return;
    }
    const list = Array.isArray(data) ? data : [];
    const enriched = await enrichUsersWithAllMockRoleFit(supabase, list);
    setUsers(enriched);
    setLoading(false);
  }, [filters]);

  const refresh = useCallback(() => {
    refreshSummary();
    refreshUsers();
  }, [refreshSummary, refreshUsers]);

  const exportExcel = useCallback(async () => {
    setExporting(true);
    try {
      const result = await exportFilteredUsersExcel(supabase, filters);
      return result;
    } finally {
      setExporting(false);
    }
  }, [filters]);

  const exportPlacementExcel = useCallback(async () => {
    setExporting(true);
    try {
      const result = await exportFilteredUsersPlacementExcel(supabase, filters);
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
    resetFilters,
    refresh,
    exportExcel,
    exportPlacementExcel,
    exporting,
  };
}
