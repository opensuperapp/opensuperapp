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
import SecureStorage from '@/utils/secureStorage';

jest.mock('expo-secure-store');
jest.mock('@react-native-async-storage/async-storage');

describe('secureStorage Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide getItem function', () => {
    expect(typeof SecureStorage.getItem).toBe('function');
  });

  it('should provide setItem function', () => {
    expect(typeof SecureStorage.setItem).toBe('function');
  });

  it('should provide removeItem function', () => {
    expect(typeof SecureStorage.removeItem).toBe('function');
  });

  it('should handle setting secure keys', async () => {
    const result = await SecureStorage.setItem('accessToken', 'test-token');
    expect(result).toBeUndefined();
  });

  it('should handle setting non-secure keys', async () => {
    const result = await SecureStorage.setItem('cache_key', 'cached-value');
    expect(result).toBeUndefined();
  });

  it('should handle getting items', async () => {
    const result = await SecureStorage.getItem('test-key');
    expect(result === null || typeof result === 'string').toBe(true);
  });
});
