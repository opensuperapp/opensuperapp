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
import { renderHook } from '@testing-library/react-native';
import { useSignInWithAsgardeo } from '@/hooks/useSignInWithAsgardeo';
import { createMockStore } from '../utils/test-utils';
import { Provider } from 'react-redux';
import React from 'react';

// Mock react-native-app-auth
jest.mock('react-native-app-auth', () => ({
  authorize: jest.fn(() => Promise.resolve({
    accessToken: 'test-token',
    idToken: 'test-id-token',
  })),
}));

// Mock authService
jest.mock('@/services/authService', () => ({
  processNativeAuthResult: jest.fn(() => Promise.resolve({
    accessToken: 'test-token',
    idToken: 'test-id-token',
  })),
}));

describe('useSignInWithAsgardeo Hook', () => {
  const store = createMockStore();
  const wrapper = ({ children }: any) => React.createElement(Provider, { store, children });

  it('should return a sign-in function', () => {
    const { result } = renderHook(() => useSignInWithAsgardeo(), { wrapper });
    
    expect(typeof result.current).toBe('function');
  });
});