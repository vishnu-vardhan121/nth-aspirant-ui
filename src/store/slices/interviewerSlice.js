import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../lib/supabase';

console.log('[Supabase] interviewerSlice.js loaded');

// Interviewer = admin user with role = 'interviewer' (single role field).

const initialState = {
  profile: null,
  loading: true,
};

export const fetchInterviewerProfile = createAsyncThunk(
  'interviewer/fetchProfile',
  async (userId, { rejectWithValue }) => {
    console.log('[Supabase] interviewerSlice fetchInterviewerProfile', { userId });
    if (!userId) return null;
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('id, name, email')
        .eq('id', userId)
        .eq('role', 'interviewer')
        .maybeSingle();
      console.log('[Supabase] interviewerSlice admins select result', { hasData: !!data, error: error?.message });
      if (error) return rejectWithValue(error);
      return data;
    } catch (err) {
      console.error('[Supabase] interviewerSlice fetchInterviewerProfile throw', err);
      throw err;
    }
  }
);

const interviewerSlice = createSlice({
  name: 'interviewer',
  initialState,
  reducers: {
    setInterviewerProfile: (state, action) => {
      state.profile = action.payload;
      state.loading = false;
    },
    clearInterviewerProfile: (state) => {
      state.profile = null;
      state.loading = true;
    },
    setInterviewerLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInterviewerProfile.fulfilled, (state, action) => {
        state.profile = action.payload;
        state.loading = false;
      })
      .addCase(fetchInterviewerProfile.rejected, (state) => {
        state.profile = null;
        state.loading = false;
      })
      .addCase(fetchInterviewerProfile.pending, (state) => {
        state.loading = true;
      });
  },
});

export const { setInterviewerProfile, clearInterviewerProfile, setInterviewerLoading } = interviewerSlice.actions;
export default interviewerSlice.reducer;
