// Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { RootState } from '@/context/store';
import appReducer from '@/context/slices/appSlice';
import authReducer from '@/context/slices/authSlice';
import userConfigReducer from '@/context/slices/userConfigSlice';
import versionReducer from '@/context/slices/versionSlice';
import userInfoReducer from '@/context/slices/userInfoSlice';

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: Partial<RootState>;
  store?: ReturnType<typeof configureStore>;
}

/**
 * Custom render function that includes Redux Provider
 * Use this for components that need Redux state
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState = {},
    store = configureStore({
      reducer: {
        auth: authReducer,
        apps: appReducer,
        userConfig: userConfigReducer,
        version: versionReducer,
        userInfo: userInfoReducer,
      },
      preloadedState: preloadedState as any,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({ serializableCheck: false }),
    }),
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

/**
 * Creates a mock Redux store for testing
 */
export function createMockStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: {
      auth: authReducer,
      apps: appReducer,
      userConfig: userConfigReducer,
      version: versionReducer,
      userInfo: userInfoReducer,
    },
    preloadedState: preloadedState as any,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }),
  });
}

// Re-export everything from React Native Testing Library
export * from '@testing-library/react-native';
