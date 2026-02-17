import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  theme: 'system',
  sidebarCollapsed: false,
  onboardingComplete: false,
  plan: 'base', // 'base' | 'silver' | 'gold' (same for both tracks)
  track: 'fresher', // 'fresher' | 'experienced'
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    setSidebarCollapsed: (state, action) => {
      state.sidebarCollapsed = action.payload;
    },
    setOnboardingComplete: (state, action) => {
      state.onboardingComplete = action.payload ?? true;
    },
    setPlan: (state, action) => {
      state.plan = action.payload;
    },
    setTrack: (state, action) => {
      state.track = action.payload;
    },
    resetApp: () => initialState,
  },
});

export const { setTheme, setSidebarCollapsed, setOnboardingComplete, setPlan, setTrack, resetApp } = appSlice.actions;
export default appSlice.reducer;
