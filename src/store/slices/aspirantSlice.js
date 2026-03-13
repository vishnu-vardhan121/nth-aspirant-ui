import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../lib/supabase';

const initialState = {
  profile: null,
  loading: true,
};

export const fetchAspirantProfile = createAsyncThunk(
  'aspirant/fetchProfile',
  async (userId, { rejectWithValue }) => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('aspirants')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) return rejectWithValue(error);
    return data;
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
        // Avoid flashing loader on background refetch (e.g. same user re-dispatched)
        if (state.profile === null) state.loading = true;
      });
  },
});

export const { setAspirantProfile, clearAspirantProfile, setAspirantLoading } = aspirantSlice.actions;
export default aspirantSlice.reducer;
