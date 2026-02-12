import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../lib/supabase';

const initialState = {
  user: null,
  session: null,
  loading: true,
};

export const signIn = createAsyncThunk(
  'auth/signIn',
  async ({ email, password }, { rejectWithValue }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return rejectWithValue(error);
    return data;
  }
);

export const signUp = createAsyncThunk(
  'auth/signUp',
  async ({ email, password, options = {} }, { rejectWithValue }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: options.redirectTo },
    });
    if (error) return rejectWithValue(error);
    return data;
  }
);

export const signOut = createAsyncThunk('auth/signOut', async () => {
  await supabase.auth.signOut();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (state, action) => {
      const payload = action.payload;
      state.user = payload?.user ?? null;
      state.session = payload?.session ?? null;
      state.loading = false;
    },
    setAuthLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signIn.fulfilled, (state, action) => {
        state.user = action.payload?.user ?? null;
        state.session = action.payload?.session ?? null;
        state.loading = false;
      })
      .addCase(signIn.rejected, (state) => {
        state.loading = false;
      })
      .addCase(signIn.pending, (state) => {
        state.loading = true;
      })
      .addCase(signUp.fulfilled, (state, action) => {
        state.user = action.payload?.user ?? null;
        state.session = action.payload?.session ?? null;
        state.loading = false;
      })
      .addCase(signUp.rejected, (state) => {
        state.loading = false;
      })
      .addCase(signUp.pending, (state) => {
        state.loading = true;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.user = null;
        state.session = null;
        state.loading = false;
      });
  },
});

export const { setAuth, setAuthLoading } = authSlice.actions;
export default authSlice.reducer;
