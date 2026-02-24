import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../lib/supabase';

console.log('[Supabase] adminSlice.js loaded');

const initialState = {
  profile: null,
  loading: true,
};

export const fetchAdminProfile = createAsyncThunk(
  'admin/fetchProfile',
  async (userId, { rejectWithValue }) => {
    console.log('[Supabase] adminSlice fetchAdminProfile', { userId });
    if (!userId) return null;
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      console.log('[Supabase] adminSlice admins select result', { hasData: !!data, error: error?.message });
      if (error) return rejectWithValue(error);
      return data;
    } catch (err) {
      console.error('[Supabase] adminSlice fetchAdminProfile throw', err);
      throw err;
    }
  }
);

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    setAdminProfile: (state, action) => {
      state.profile = action.payload;
      state.loading = false;
    },
    clearAdminProfile: (state) => {
      state.profile = null;
      state.loading = true;
    },
    setAdminLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminProfile.fulfilled, (state, action) => {
        state.profile = action.payload;
        state.loading = false;
      })
      .addCase(fetchAdminProfile.rejected, (state) => {
        state.profile = null;
        state.loading = false;
      })
      .addCase(fetchAdminProfile.pending, (state) => {
        state.loading = true;
      });
  },
});

export const { setAdminProfile, clearAdminProfile, setAdminLoading } = adminSlice.actions;
export default adminSlice.reducer;
