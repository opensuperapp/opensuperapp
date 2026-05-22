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
import { useStore } from '@/hooks/useStore';
import { createMockStore } from '../utils/test-utils';
import { Provider } from 'react-redux';
import React from 'react';

describe('useStore Hook', () => {
  const store = createMockStore();
  const wrapper = ({ children }: { children: React.ReactNode }) => 
    React.createElement(Provider, { store, children });

  it('should initialize with empty filteredApps', () => {
    const { result } = renderHook(() => useStore(), { wrapper });

    expect(result.current.filteredApps).toEqual([]);
  });

  it('should initialize with downloading state', () => {
    const { result } = renderHook(() => useStore(), { wrapper });

    expect(result.current.downloading).toBeDefined();
  });

  it('should provide app management functions', () => {
    const { result } = renderHook(() => useStore(), { wrapper });

    expect(result.current).toHaveProperty('filteredApps');
    expect(result.current).toHaveProperty('downloading');
  });

  it('should provide search functionality', () => {
    const { result } = renderHook(() => useStore(), { wrapper });

    expect(result.current.searchQuery).toBe('');
    expect(typeof result.current.setSearchQuery).toBe('function');
  });

  it('should track installation queue', () => {
    const { result } = renderHook(() => useStore(), { wrapper });

    expect(result.current).toHaveProperty('installationQueue');
    expect(result.current).toHaveProperty('isLoading');
  });
});
