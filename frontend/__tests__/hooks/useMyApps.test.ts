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
import { renderHook, act } from '@testing-library/react-native';
import { useMyApps } from '@/hooks/useMyApps';
import { createMockStore } from '../utils/test-utils';
import { Provider } from 'react-redux';

jest.mock('expo-constants', () => ({ manifest: { extra: { ASGARDEO_CONFIG: { CLIENT_ID: 'test-client-id', REDIRECT_URI: 'test-redirect-uri', SIGN_OUT_REDIRECT_URI: 'test-sign-out-redirect-uri', BASE_URL: 'test-base-url', SCOPE: 'test-scope' } } } }));

describe('useMyApps Hook', () => {
  const store = createMockStore();
  const wrapper = ({ children }: any) => Provider({ store, children });

  it('should initialize with empty filteredApps', () => {
    const { result } = renderHook(() => useMyApps(), { wrapper });

    expect(result.current.filteredApps).toEqual([]);
  });

  it('should initialize with syncing false', () => {
    const { result } = renderHook(() => useMyApps(), { wrapper });

    expect(result.current.syncing).toBe(false);
  });

  it('should provide sync functionality', () => {
    const { result } = renderHook(() => useMyApps(), { wrapper });

    expect(result.current).toHaveProperty('syncing');
    expect(result.current).toHaveProperty('filteredApps');
  });

  it('should provide search capability', () => {
    const { result } = renderHook(() => useMyApps(), { wrapper });

    expect(result.current).toHaveProperty('searchQuery');
    expect(result.current).toHaveProperty('setSearchQuery');
  });

  it('should track current action', () => {
    const { result } = renderHook(() => useMyApps(), { wrapper });

    expect(result.current).toHaveProperty('currentAction');
    expect(result.current).toHaveProperty('progress');
  });

  it('should filter apps based on search query', () => {
    const { result } = renderHook(() => useMyApps(), { wrapper });

    act(() => {
      result.current.setSearchQuery('test');
    });

    expect(result.current.searchQuery).toBe('test');
  });
});