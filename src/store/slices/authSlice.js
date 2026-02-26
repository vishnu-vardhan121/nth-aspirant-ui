import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../lib/supabase';

console.log('[Supabase] authSlice.js loaded');

const initialState = {
  user: null,
  session: null,
  loading: true,
};

export const signIn = createAsyncThunk(
  'auth/signIn',
  async ({ email, password }, { rejectWithValue }) => {
    console.log('[Supabase] authSlice signIn called', { email: email ? `${email.slice(0, 3)}***` : '' });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      console.log('[Supabase] authSlice signIn result', { hasData: !!data, error: error?.message });
      if (error) return rejectWithValue(error);
      return data;
    } catch (err) {
      console.error('[Supabase] authSlice signIn throw', err);
      throw err;
    }
  }
);

export const signUp = createAsyncThunk(
  'auth/signUp',
  async ({ email, password, options = {} }, { rejectWithValue }) => {
    console.log('[Supabase] authSlice signUp called', { email: email ? `${email.slice(0, 3)}***` : '' });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: options.redirectTo },
      });
      console.log('[Supabase] authSlice signUp result', { hasData: !!data, error: error?.message });
      if (error) return rejectWithValue(error);
      return data;
    } catch (err) {
      console.error('[Supabase] authSlice signUp throw', err);
      throw err;
    }
  }
);

export const signOut = createAsyncThunk('auth/signOut', async () => {
  console.log('[Supabase] authSlice signOut called');
  try {
    await supabase.auth.signOut();
    console.log('[Supabase] authSlice signOut done');
  } catch (err) {
    console.error('[Supabase] authSlice signOut throw', err);
    throw err;
  }
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
