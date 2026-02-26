import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../lib/supabase';

console.log('[Supabase] aspirantSlice.js loaded');

const initialState = {
  profile: null,
  loading: true,
};

export const fetchAspirantProfile = createAsyncThunk(
  'aspirant/fetchProfile',
  async (userId, { rejectWithValue }) => {
    console.log('[Supabase] aspirantSlice fetchAspirantProfile', { userId });
    if (!userId) return null;
    try {
      const { data, error } = await supabase
        .from('aspirants')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      console.log('[Supabase] aspirantSlice aspirants select result', { hasData: !!data, error: error?.message });
      if (error) return rejectWithValue(error);
      return data;
    } catch (err) {
      console.error('[Supabase] aspirantSlice fetchAspirantProfile throw', err);
      throw err;
    }
  }
);

const aspirantSlice = createSlice({
  name: 'aspirant',
  initialState,
  reducers: {
    setAspirantProfile: (state, action) => {
      state.profile = action.payload;
      state.loading = false;
    },
    clearAspirantProfile: (state) => {
      state.profile = null;
      state.loading = true;
    },
    setAspirantLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAspirantProfile.fulfilled, (state, action) => {
        state.profile = action.payload;
        state.loading = false;
      })
      .addCase(fetchAspirantProfile.rejected, (state) => {
        state.profile = null;
        state.loading = false;
      })
      .addCase(fetchAspirantProfile.pending, (state) => {
        state.loading = true;
      });
  },
});

export const { setAspirantProfile, clearAspirantProfile, setAspirantLoading } = aspirantSlice.actions;
export default aspirantSlice.reducer;
