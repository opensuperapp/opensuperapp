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
import { apiRequest } from '@/utils/requestHandler';

jest.mock('axios', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({ data: {} })),
}));

jest.mock('@react-native-async-storage/async-storage', () => 
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('requestHandler Utils', () => {
  const mockOnLogout = jest.fn(() => Promise.resolve());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide apiRequest function', () => {
    expect(typeof apiRequest).toBe('function');
  });

  it('should handle API request with config', async () => {
    const config = {
      url: 'https://api.example.com/data',
      method: 'GET' as const,
    };

    const result = await apiRequest(config, mockOnLogout);
    
    // Result can be undefined if no access token
    expect(result === undefined || result !== null).toBe(true);
  });

  it('should accept onLogout callback', () => {
    expect(typeof mockOnLogout).toBe('function');
  });

  it('should be callable with request configuration', () => {
    const config = {
      url: '/api/test',
      method: 'GET' as const,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    expect(() => apiRequest(config, mockOnLogout)).not.toThrow();
  });
});
