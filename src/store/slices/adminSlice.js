import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../lib/supabase';

const initialState = {
  profile: null,
  loading: true,
};

export const fetchAdminProfile = createAsyncThunk(
  'admin/fetchProfile',
  async (userId, { rejectWithValue }) => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) return rejectWithValue(error);
    return data;
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
        if (state.profile === null) state.loading = true;
      });
  },
});

export const { setAdminProfile, clearAdminProfile, setAdminLoading } = adminSlice.actions;
export default adminSlice.reducer;
