import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // localStorage
import appReducer from './slices/appSlice';
import authReducer from './slices/authSlice';
import aspirantReducer from './slices/aspirantSlice';
import adminReducer from './slices/adminSlice';
import interviewerReducer from './slices/interviewerSlice';

const persistConfig = {
  key: 'nth-root',
  version: 1,
  storage,
  whitelist: ['app'], // auth not persisted; Supabase manages session storage
};

const rootReducer = combineReducers({
  app: appReducer,
  auth: authReducer,
  aspirant: aspirantReducer,
  admin: adminReducer,
  interviewer: interviewerReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        ignoredPaths: ['auth.user', 'auth.session'], // Supabase User/Session objects
      },
    }),
});

export const persistor = persistStore(store);
