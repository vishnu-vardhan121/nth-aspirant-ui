import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../lib/supabase';

// Interviewer = admin user with role = 'interviewer' (single role field).

const initialState = {
  profile: null,
  loading: true,
};

export const fetchInterviewerProfile = createAsyncThunk(
  'interviewer/fetchProfile',
  async (userId, { rejectWithValue }) => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('admins')
      .select('id, name, email')
      .eq('id', userId)
      .eq('role', 'interviewer')
      .maybeSingle();
    if (error) return rejectWithValue(error);
    return data;
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
